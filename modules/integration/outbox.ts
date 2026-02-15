import type { Prisma } from "@/prisma/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getIntegrationHandlers } from "@/modules/integration/handlers";
import crypto from "node:crypto";
import { computeExponentialBackoffMs } from "@/modules/integration/backoff";

type Tx = Prisma.TransactionClient;

export type EnqueueIntegrationEventInput = {
  topic: string;
  type: string;
  aggregateType: string;
  aggregateId: string;
  payload: unknown;
};

export async function enqueueIntegrationEvent(tx: Tx, input: EnqueueIntegrationEventInput) {
  return tx.integrationOutbox.create({
    data: {
      topic: input.topic,
      type: input.type,
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      payload: input.payload as Prisma.InputJsonValue,
    },
    select: { id: true },
  });
}

export async function enqueueIntegrationEventOnce(
  tx: Tx,
  input: EnqueueIntegrationEventInput,
  options?: { activeStatuses?: Array<"PENDING" | "FAILED" | "PROCESSING"> }
) {
  const activeStatuses = options?.activeStatuses ?? ["PENDING", "FAILED", "PROCESSING"];

  const existing = await tx.integrationOutbox.findFirst({
    where: {
      type: input.type,
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      status: { in: activeStatuses },
    },
    select: { id: true },
  });

  if (existing) {
    return { id: existing.id, alreadyQueued: true as const };
  }

  const created = await enqueueIntegrationEvent(tx, input);
  return { id: created.id, alreadyQueued: false as const };
}

export type DispatchPendingIntegrationEventsResult = {
  attempted: number;
  processed: number;
  failed: number;
};

function getIntEnv(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

const workerId = process.env.INTEGRATION_WORKER_ID ?? crypto.randomUUID();
const maxAttempts = getIntEnv("INTEGRATION_MAX_ATTEMPTS", 10);
const lockTimeoutMs = getIntEnv("INTEGRATION_LOCK_TIMEOUT_MS", 60_000);
const backoffBaseMs = getIntEnv("INTEGRATION_BACKOFF_BASE_MS", 5_000);
const backoffMaxMs = getIntEnv("INTEGRATION_BACKOFF_MAX_MS", 5 * 60_000);

export async function dispatchPendingIntegrationEvents(
  options?: { limit?: number }
): Promise<DispatchPendingIntegrationEventsResult> {
  const limit = options?.limit ?? 50;
  const now = new Date();
  const staleBefore = new Date(now.getTime() - lockTimeoutMs);
  const pending = await prisma.integrationOutbox.findMany({
    where: {
      OR: [
        {
          status: { in: ["PENDING", "FAILED"] },
          OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
          attempts: { lt: maxAttempts },
        },
        {
          status: "PROCESSING",
          lockedAt: { lte: staleBefore },
          attempts: { lt: maxAttempts },
        },
      ],
    },
    orderBy: { createdAt: "asc" },
    select: { id: true },
    take: limit,
  });

  let processed = 0;
  let failed = 0;

  for (const row of pending) {
    try {
      await processIntegrationOutboxEvent(row.id);
      processed += 1;
    } catch {
      failed += 1;
    }
  }

  return { attempted: pending.length, processed, failed };
}

export async function processIntegrationOutboxEvent(outboxId: string) {
  await prisma.$transaction(async (tx) => {
    const now = new Date();
    const staleBefore = new Date(now.getTime() - lockTimeoutMs);
    const claimed = await tx.integrationOutbox.updateMany({
      where: {
        id: outboxId,
        attempts: { lt: maxAttempts },
        OR: [
          {
            status: { in: ["PENDING", "FAILED"] },
            OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
          },
          {
            status: "PROCESSING",
            lockedAt: { lte: staleBefore },
          },
        ],
      },
      data: {
        status: "PROCESSING",
        lockedAt: now,
        lockedBy: workerId,
        attempts: { increment: 1 },
        lastError: null,
      },
    });

    if (claimed.count === 0) return;

    const outbox = await tx.integrationOutbox.findUnique({
      where: { id: outboxId },
      select: {
        id: true,
        type: true,
        payload: true,
        attempts: true,
      },
    });

    if (!outbox) return;

    const handlers = getIntegrationHandlers(outbox.type);
    if (!handlers) {
      await tx.integrationOutbox.update({
        where: { id: outboxId },
        data: {
          status: "DEAD",
          deadAt: now,
          lastError: `No handler for ${outbox.type}`,
        },
      });
      return;
    }

    try {
      for (const handler of handlers) {
        const alreadyProcessed = await tx.integrationInbox.findUnique({
          where: {
            consumer_outboxId: { consumer: handler.consumer, outboxId: outbox.id },
          },
          select: { id: true },
        });

        if (alreadyProcessed) {
          continue;
        }

        await tx.integrationInbox.create({
          data: { consumer: handler.consumer, outboxId: outbox.id },
        });

        await handler.handle(tx, outbox.payload);
      }

      await tx.integrationOutbox.update({
        where: { id: outboxId },
        data: {
          status: "PROCESSED",
          processedAt: now,
          lockedAt: null,
          lockedBy: null,
          nextAttemptAt: null,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const attempts = outbox.attempts;
      const isDead = attempts >= maxAttempts;
      const backoffMs = computeExponentialBackoffMs(attempts, {
        baseMs: backoffBaseMs,
        maxMs: backoffMaxMs,
      });
      const nextAttemptAt = new Date(now.getTime() + backoffMs);

      await tx.integrationOutbox.update({
        where: { id: outboxId },
        data: isDead
          ? {
            status: "DEAD",
            deadAt: now,
            lastError: message,
            lockedAt: null,
            lockedBy: null,
          }
          : {
            status: "FAILED",
            lastError: message,
            nextAttemptAt,
            lockedAt: null,
            lockedBy: null,
          },
      });
      throw error;
    }
  });
}

export async function maybeProcessIntegrationOutboxEvent(
  outboxId: string,
  options?: { forceInline?: boolean }
) {
  const inline =
    options?.forceInline === true || process.env.INTEGRATION_PROCESS_INLINE !== "false";

  if (!inline) {
    return { processed: false as const };
  }

  await processIntegrationOutboxEvent(outboxId);
  return { processed: true as const };
}
