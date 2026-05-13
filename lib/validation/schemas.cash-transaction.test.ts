import { describe, expect, it } from "vitest";
import { cashTransactionSchema } from "./schemas";

const basePayload = {
  cashAccountId: "ck1qf0f5m0000k6x8z9d9d9d9",
  type: "INCOME" as const,
  date: new Date("2026-01-01"),
  description: "Test cash transaction",
  allocations: [
    {
      accountId: "ck1qf0f5m0001k6x8z9d9d9d9",
      amount: 1000,
    },
  ],
};

describe("cashTransactionSchema", () => {
  it("normalizes empty optional relation ids to undefined", () => {
    const parsed = cashTransactionSchema.parse({
      ...basePayload,
      contactId: "",
      departmentId: "",
      projectId: "",
    });

    expect(parsed.contactId).toBeUndefined();
    expect(parsed.departmentId).toBeUndefined();
    expect(parsed.projectId).toBeUndefined();
  });
});
