import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /api/integration/health", () => {
  it("returns 401 when header key is missing or invalid", async () => {
    process.env.INTEGRATION_DISPATCH_KEY = "test-key";

    const request = new Request("http://localhost/api/integration/health", {
      method: "GET",
      headers: {},
    });

    const response = await GET(request);
    expect(response.status).toBe(401);
  });
});

