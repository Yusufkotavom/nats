import { dispatchPendingIntegrationEvents } from "@/modules/integration/outbox";

export type RunOutboxWorkerResult = {
  attempted: number;
  processed: number;
  failed: number;
  batches: number;
  finishedBecause: "drained" | "deadline" | "max_batches";
};

export async function runOutboxWorker(options?: {
  limitPerBatch?: number;
  maxBatches?: number;
  deadlineMs?: number;
}): Promise<RunOutboxWorkerResult> {
  const limitPerBatch = options?.limitPerBatch ?? 50;
  const maxBatches = options?.maxBatches ?? 25;
  const deadlineMs = options?.deadlineMs ?? 25_000;

  const startedAt = Date.now();
  const deadlineAt = startedAt + deadlineMs;

  let attempted = 0;
  let processed = 0;
  let failed = 0;
  let batches = 0;

  while (batches < maxBatches) {
    if (Date.now() > deadlineAt) {
      return { attempted, processed, failed, batches, finishedBecause: "deadline" };
    }

    const batch = await dispatchPendingIntegrationEvents({ limit: limitPerBatch });
    batches += 1;
    attempted += batch.attempted;
    processed += batch.processed;
    failed += batch.failed;

    if (batch.attempted === 0) {
      return { attempted, processed, failed, batches, finishedBecause: "drained" };
    }
  }

  return { attempted, processed, failed, batches, finishedBecause: "max_batches" };
}

