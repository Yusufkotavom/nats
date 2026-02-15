import { NextResponse } from "next/server";
import { runOutboxWorker } from "@/modules/integration/worker";

export async function POST(request: Request) {
  const key = request.headers.get("x-integration-dispatch-key");
  if (!process.env.INTEGRATION_DISPATCH_KEY || key !== process.env.INTEGRATION_DISPATCH_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limitPerBatch = Number(url.searchParams.get("limitPerBatch")) || undefined;
  const maxBatches = Number(url.searchParams.get("maxBatches")) || undefined;
  const deadlineMs = Number(url.searchParams.get("deadlineMs")) || undefined;
  const concurrency = Number(url.searchParams.get("concurrency")) || undefined;
  const drain = url.searchParams.get("drain") === "true" ? true : undefined;

  const result = await runOutboxWorker({
    limitPerBatch,
    maxBatches,
    deadlineMs,
    concurrency,
    drain,
  });

  return NextResponse.json({ success: true, result });
}
