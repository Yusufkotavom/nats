import { describe, expect, it, vi } from "vitest";
import { withDbRetry } from "./db-retry";

describe("lib/db-retry withDbRetry", () => {
  it("runs onRetry hook before retrying transient errors", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce({ code: "ETIMEDOUT" })
      .mockResolvedValueOnce("ok");
    const onRetry = vi.fn().mockResolvedValue(undefined);

    const result = await withDbRetry(fn, { retries: 2, onRetry });

    expect(result).toBe("ok");
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(
      expect.objectContaining({ code: "ETIMEDOUT" }),
      1,
    );
  });
});
