"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/utils";

function getIntEnv(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

export async function getOutboxHealth() {
  const session = await getSession();
  if (!session || !hasPermission(session.permissions, "integrations.outbox.view")) {
    return { allowed: false as const };
  }

  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const lockTimeoutMs = getIntEnv("INTEGRATION_LOCK_TIMEOUT_MS", 60_000);
  const staleBefore = new Date(now.getTime() - lockTimeoutMs);

  const [
    pending,
    failed,
    processing,
    dead,
    oldestRetryable,
    oldestPending,
    oldestFailed,
    retrying,
    processedLastHour,
    failedLastHour,
    stuckProcessing,
  ] =
    await Promise.all([
      prisma.integrationOutbox.count({ where: { status: "PENDING" } }),
      prisma.integrationOutbox.count({ where: { status: "FAILED" } }),
      prisma.integrationOutbox.count({ where: { status: "PROCESSING" } }),
      prisma.integrationOutbox.count({ where: { status: "DEAD" } }),
      prisma.integrationOutbox.findFirst({
        where: {
          status: { in: ["PENDING", "FAILED"] },
        },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      }),
      prisma.integrationOutbox.findFirst({
        where: { status: "PENDING" },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      }),
      prisma.integrationOutbox.findFirst({
        where: { status: "FAILED" },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      }),
      prisma.integrationOutbox.count({
        where: { status: { in: ["PENDING", "FAILED"] }, attempts: { gt: 0 } },
      }),
      prisma.integrationOutbox.count({
        where: { status: "PROCESSED", processedAt: { gte: hourAgo } },
      }),
      prisma.integrationOutbox.count({
        where: { status: "FAILED", updatedAt: { gte: hourAgo } },
      }),
      prisma.integrationOutbox.count({
        where: { status: "PROCESSING", lockedAt: { lte: staleBefore } },
      }),
    ]);

  return {
    allowed: true as const,
    counts: {
      pending,
      failed,
      processing,
      dead,
      stuckProcessing,
    },
    oldestRetryableCreatedAt: oldestRetryable?.createdAt ?? null,
    oldestPendingCreatedAt: oldestPending?.createdAt ?? null,
    oldestFailedCreatedAt: oldestFailed?.createdAt ?? null,
    retrying,
    processedLastHour,
    failedLastHour,
  };
}
