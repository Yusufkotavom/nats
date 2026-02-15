async function main() {
  const url = process.env.OUTBOX_WORKER_URL;
  if (!url) {
    throw new Error("OUTBOX_WORKER_URL is required");
  }

  const key = process.env.INTEGRATION_DISPATCH_KEY;
  if (!key) {
    throw new Error("INTEGRATION_DISPATCH_KEY is required");
  }

  const limitPerBatch = process.env.OUTBOX_LIMIT_PER_BATCH ?? undefined;
  const maxBatches = process.env.OUTBOX_MAX_BATCHES ?? undefined;
  const deadlineMs = process.env.OUTBOX_DEADLINE_MS ?? undefined;
  const concurrency = process.env.OUTBOX_CONCURRENCY ?? undefined;
  const drain = process.env.OUTBOX_DRAIN ?? undefined;
  const safeMode = process.env.OUTBOX_SAFE_MODE ?? undefined;

  const requestUrl = new URL(url);
  if (limitPerBatch) requestUrl.searchParams.set("limitPerBatch", limitPerBatch);
  if (maxBatches) requestUrl.searchParams.set("maxBatches", maxBatches);
  if (deadlineMs) requestUrl.searchParams.set("deadlineMs", deadlineMs);
  if (concurrency) requestUrl.searchParams.set("concurrency", concurrency);
  if (drain) requestUrl.searchParams.set("drain", drain);
  if (safeMode) requestUrl.searchParams.set("safeMode", safeMode);

  const response = await fetch(requestUrl.toString(), {
    method: "POST",
    headers: {
      "x-integration-dispatch-key": key,
    },
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Worker request failed (${response.status}): ${body}`);
  }

  process.stdout.write(`${body}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
