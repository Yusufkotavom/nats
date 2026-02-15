"use server";

import { prisma } from "@/lib/prisma";
import { SuperJSON } from "@/lib/superjson";
import { getSession } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/utils";
import { authorizedAction } from "@/lib/permissions/protected-action";
import {
  dispatchPendingIntegrationEvents,
  processIntegrationOutboxEvent,
} from "@/modules/integration/outbox";
import type { Prisma } from "@/prisma/generated/prisma/client";

export async function getIntegrationOutboxEvents(
  page: number = 1,
  limit: number = 20,
  input?: {
    search?: string;
    status?: string;
    topic?: string;
    type?: string;
  }
) {
  const session = await getSession();
  if (!session || !hasPermission(session.permissions, "integrations.outbox.view")) {
    return { events: [], total: 0, totalPages: 0 };
  }

  const skip = (page - 1) * limit;
  const where: Prisma.IntegrationOutboxWhereInput = { AND: [] };

  if (input?.search) {
    const search = input.search;
    (where.AND as Prisma.IntegrationOutboxWhereInput[]).push({
      OR: [
        { id: { contains: search, mode: "insensitive" } },
        { topic: { contains: search, mode: "insensitive" } },
        { type: { contains: search, mode: "insensitive" } },
        { aggregateType: { contains: search, mode: "insensitive" } },
        { aggregateId: { contains: search, mode: "insensitive" } },
        { lastError: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  if (input?.status) {
    (where.AND as Prisma.IntegrationOutboxWhereInput[]).push({
      status: input.status as any,
    });
  }

  if (input?.topic) {
    (where.AND as Prisma.IntegrationOutboxWhereInput[]).push({
      topic: { equals: input.topic, mode: "insensitive" },
    });
  }

  if (input?.type) {
    (where.AND as Prisma.IntegrationOutboxWhereInput[]).push({
      type: { contains: input.type, mode: "insensitive" },
    });
  }

  const [events, total] = await Promise.all([
    prisma.integrationOutbox.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        topic: true,
        type: true,
        aggregateType: true,
        aggregateId: true,
        status: true,
        attempts: true,
        lockedAt: true,
        lockedBy: true,
        nextAttemptAt: true,
        processedAt: true,
        lastError: true,
        deadAt: true,
        createdAt: true,
        updatedAt: true,
        payload: true,
      },
    }),
    prisma.integrationOutbox.count({ where }),
  ]);

  return {
    events: SuperJSON.serialize(events),
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export const requeueIntegrationOutboxEvent = authorizedAction(
  "integrations.outbox.retry",
  async (id: string, options?: { resetAttempts?: boolean }) => {
    const resetAttempts = options?.resetAttempts ?? true;

    await prisma.integrationOutbox.update({
      where: { id },
      data: {
        status: "PENDING",
        attempts: resetAttempts ? 0 : undefined,
        lockedAt: null,
        lockedBy: null,
        processedAt: null,
        nextAttemptAt: null,
        lastError: null,
        deadAt: null,
      },
    });

    return { success: true as const };
  }
);

export const runIntegrationOutboxEventNow = authorizedAction(
  "integrations.outbox.dispatch",
  async (id: string) => {
    try {
      await processIntegrationOutboxEvent(id);
      return { success: true as const };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { success: false as const, error: message };
    }
  }
);

export const dispatchIntegrationOutboxBatch = authorizedAction(
  "integrations.outbox.dispatch",
  async (limit?: number) => {
    const result = await dispatchPendingIntegrationEvents({
      limit: typeof limit === "number" && Number.isFinite(limit) ? limit : undefined,
    });
    return { success: true as const, result };
  }
);

export const unlockIntegrationOutboxEvent = authorizedAction(
  "integrations.outbox.retry",
  async (id: string) => {
    await prisma.integrationOutbox.update({
      where: { id },
      data: {
        status: "FAILED",
        lockedAt: null,
        lockedBy: null,
        nextAttemptAt: null,
      },
    });

    return { success: true as const };
  }
);

export const forceDeadIntegrationOutboxEvent = authorizedAction(
  "integrations.outbox.retry",
  async (id: string, reason?: string) => {
    await prisma.integrationOutbox.update({
      where: { id },
      data: {
        status: "DEAD",
        deadAt: new Date(),
        lockedAt: null,
        lockedBy: null,
        nextAttemptAt: null,
        lastError: reason?.trim() ? reason.trim() : undefined,
      },
    });

    return { success: true as const };
  }
);
