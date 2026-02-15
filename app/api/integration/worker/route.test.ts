import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("POST /api/integration/worker", () => {
  it("returns 401 when header key is missing or invalid", async () => {
    process.env.INTEGRATION_DISPATCH_KEY = "test-key";

    const request = new Request("http://localhost/api/integration/worker", {
      method: "POST",
      headers: {},
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });
});

