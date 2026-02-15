import { dispatchPendingIntegrationEvents } from "@/modules/integration/outbox";

export async function POST(request: Request) {
  const expectedKey = process.env.INTEGRATION_DISPATCH_KEY;
  const providedKey = request.headers.get("x-integration-dispatch-key");

  if (!expectedKey || providedKey !== expectedKey) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : undefined;

  const result = await dispatchPendingIntegrationEvents({
    limit: typeof limit === "number" && Number.isFinite(limit) ? limit : undefined,
  });

  return Response.json(result);
}

