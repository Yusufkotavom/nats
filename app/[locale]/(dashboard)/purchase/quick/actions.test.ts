import { beforeEach, describe, expect, it, vi } from "vitest";
import { QuickPurchaseInput } from "./types";

// Mock dependencies
const createPurchaseReceiveMock = vi.hoisted(() => vi.fn());
const updatePurchaseReceiveMock = vi.hoisted(() => vi.fn());
const createPurchaseInvoiceMock = vi.hoisted(() => vi.fn());
const postPurchaseInvoiceMock = vi.hoisted(() => vi.fn());
const createPurchasePaymentMock = vi.hoisted(() => vi.fn());
const postPurchasePaymentMock = vi.hoisted(() => vi.fn());
const revalidatePathMock = vi.hoisted(() => vi.fn());

vi.mock("../receives/actions", () => ({
  createPurchaseReceive: createPurchaseReceiveMock,
  updatePurchaseReceive: updatePurchaseReceiveMock,
}));

vi.mock("../invoices/actions", () => ({
  createPurchaseInvoice: createPurchaseInvoiceMock,
  postPurchaseInvoice: postPurchaseInvoiceMock,
}));

vi.mock("../payments/actions", () => ({
  createPurchasePayment: createPurchasePaymentMock,
  postPurchasePayment: postPurchasePaymentMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("@/lib/auth/auth", () => ({
  getSession: vi.fn().mockResolvedValue({
    user: { id: "user-001" },
    permissions: ["purchase.create"],
  }),
}));

const prismaMock = vi.hoisted(() => ({
  product: {
    findMany: vi.fn(),
  },
  role: {
    findUnique: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

vi.mock("@/lib/superjson", () => ({
  SuperJSON: {
    serialize: vi.fn((data) => ({ json: data, meta: undefined })),
    deserialize: vi.fn((data) => data.json || data),
  },
}));

import { createQuickPurchase } from "./actions";

const MOCK_USER_ID = "user-001";

const MOCK_CASH_DAILY_INPUT: QuickPurchaseInput = {
  mode: "CASH_DAILY",
  contactId: "vendor-001",
  transactionDate: new Date("2026-05-08"),
  cashAccountId: "cash-001",
  notes: "Daily market purchase",
  items: [
    { productId: "prod-001", quantity: 10, unitCost: 5000 },
    { productId: "prod-002", quantity: 5, unitCost: 8000 },
  ],
};

const MOCK_MONTHLY_CREDIT_INPUT: QuickPurchaseInput = {
  mode: "MONTHLY_CREDIT",
  contactId: "vendor-002",
  transactionDate: new Date("2026-05-08"),
  dueDate: new Date("2026-06-08"),
  notes: "Monthly supplier",
  items: [{ productId: "prod-003", quantity: 20, unitCost: 15000 }],
};

const MOCK_PREORDER_DP_INPUT: QuickPurchaseInput = {
  mode: "PREORDER_DP",
  contactId: "vendor-003",
  transactionDate: new Date("2026-05-08"),
  cashAccountId: "cash-001",
  downPaymentAmount: 50000,
  notes: "Preorder with DP",
  items: [{ productId: "prod-003", quantity: 20, unitCost: 15000 }],
};

describe("createQuickPurchase", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    prismaMock.role.findUnique.mockResolvedValue({ isActive: true });

    prismaMock.product.findMany.mockResolvedValue([
      { id: "prod-001", name: "Tomato" },
      { id: "prod-002", name: "Onion" },
      { id: "prod-003", name: "Rice" },
    ]);
  });

  describe("CASH_DAILY mode", () => {
    it("creates receive, invoice, and payment successfully", async () => {
      createPurchaseReceiveMock.mockResolvedValue({
        success: true,
        data: { json: { id: "rcv-001" } },
      });

      updatePurchaseReceiveMock.mockResolvedValue({
        success: true,
      });

      createPurchaseInvoiceMock.mockResolvedValue({
        success: true,
        data: { json: { id: "inv-001", totalAmount: 90000 } },
      });

      postPurchaseInvoiceMock.mockResolvedValue({
        success: true,
      });

      createPurchasePaymentMock.mockResolvedValue({
        success: true,
        data: { json: { id: "pay-001" } },
      });

      postPurchasePaymentMock.mockResolvedValue({
        success: true,
      });

      const result = await createQuickPurchase(MOCK_CASH_DAILY_INPUT);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const rawData = result.data as any;
      const data = rawData?.json || rawData;
      expect(data.receiveId).toBe("rcv-001");
      expect(data.invoiceId).toBe("inv-001");
      expect(data.paymentId).toBe("pay-001");
      expect(data.postedInvoice).toBe(true);
      expect(data.postedPayment).toBe(true);

      expect(createPurchaseReceiveMock).toHaveBeenCalledOnce();
      expect(updatePurchaseReceiveMock).toHaveBeenCalledWith("rcv-001", expect.objectContaining({
        status: "COMPLETED",
      }));
      expect(createPurchaseInvoiceMock).toHaveBeenCalledOnce();
      expect(postPurchaseInvoiceMock).toHaveBeenCalledWith("inv-001");
      expect(createPurchasePaymentMock).toHaveBeenCalledWith(
        expect.objectContaining({
          purchaseInvoiceId: "inv-001",
          amount: 90000,
          cashAccountId: "cash-001",
        })
      );
      expect(postPurchasePaymentMock).toHaveBeenCalledWith("pay-001");
      expect(revalidatePathMock).toHaveBeenCalledTimes(4);
    });

    it("throws error when cash account is missing", async () => {
      const invalidInput = { ...MOCK_CASH_DAILY_INPUT, cashAccountId: undefined };

      const result = await createQuickPurchase(invalidInput);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Cash account is required");
      expect(createPurchaseReceiveMock).not.toHaveBeenCalled();
    });
  });

  describe("MONTHLY_CREDIT mode", () => {
    it("creates receive and invoice without payment", async () => {
      createPurchaseReceiveMock.mockResolvedValue({
        success: true,
        data: { json: { id: "rcv-002" } },
      });

      updatePurchaseReceiveMock.mockResolvedValue({
        success: true,
      });

      createPurchaseInvoiceMock.mockResolvedValue({
        success: true,
        data: { json: { id: "inv-002", totalAmount: 300000 } },
      });

      postPurchaseInvoiceMock.mockResolvedValue({
        success: true,
      });

      const result = await createQuickPurchase(MOCK_MONTHLY_CREDIT_INPUT);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const rawData = result.data as any;
      const data = rawData?.json || rawData;
      expect(data.receiveId).toBe("rcv-002");
      expect(data.invoiceId).toBe("inv-002");
      expect(data.paymentId).toBeUndefined();
      expect(data.postedInvoice).toBe(true);
      expect(data.postedPayment).toBeUndefined();

      expect(createPurchaseReceiveMock).toHaveBeenCalledOnce();
      expect(updatePurchaseReceiveMock).toHaveBeenCalledWith("rcv-002", expect.objectContaining({
        status: "COMPLETED",
      }));
      expect(createPurchaseInvoiceMock).toHaveBeenCalledOnce();
      expect(postPurchaseInvoiceMock).toHaveBeenCalledWith("inv-002");
      expect(createPurchasePaymentMock).not.toHaveBeenCalled();
      expect(postPurchasePaymentMock).not.toHaveBeenCalled();
    });

    it("uses default due date when not provided", async () => {
      const inputWithoutDueDate = { ...MOCK_MONTHLY_CREDIT_INPUT, dueDate: undefined };

      createPurchaseReceiveMock.mockResolvedValue({
        success: true,
        data: { json: { id: "rcv-003" } },
      });

      updatePurchaseReceiveMock.mockResolvedValue({
        success: true,
      });

      createPurchaseInvoiceMock.mockResolvedValue({
        success: true,
        data: { json: { id: "inv-003", totalAmount: 300000 } },
      });

      postPurchaseInvoiceMock.mockResolvedValue({
        success: true,
      });

      const result = await createQuickPurchase(inputWithoutDueDate);

      expect(result.success).toBe(true);
      expect(createPurchaseInvoiceMock).toHaveBeenCalledWith(
        expect.objectContaining({
          dueDate: expect.any(Date),
        })
      );
    });
  });

  describe("PREORDER_DP mode", () => {
    it("creates receive, invoice, and partial payment successfully", async () => {
      createPurchaseReceiveMock.mockResolvedValue({
        success: true,
        data: { json: { id: "rcv-009" } },
      });
      updatePurchaseReceiveMock.mockResolvedValue({ success: true });
      createPurchaseInvoiceMock.mockResolvedValue({
        success: true,
        data: { json: { id: "inv-009", totalAmount: 300000 } },
      });
      postPurchaseInvoiceMock.mockResolvedValue({ success: true });
      createPurchasePaymentMock.mockResolvedValue({
        success: true,
        data: { json: { id: "pay-009" } },
      });
      postPurchasePaymentMock.mockResolvedValue({ success: true });

      const result = await createQuickPurchase(MOCK_PREORDER_DP_INPUT);

      expect(result.success).toBe(true);
      const rawData = result.data as any;
      const data = rawData?.json || rawData;
      expect(data.invoiceId).toBe("inv-009");
      expect(data.paymentId).toBe("pay-009");
      expect(data.postedPayment).toBe(true);
      expect(data.remainingPayableAmount).toBe(250000);

      expect(createPurchasePaymentMock).toHaveBeenCalledWith(
        expect.objectContaining({
          purchaseInvoiceId: "inv-009",
          amount: 50000,
          reference: "Quick Purchase Preorder DP",
        }),
      );
    });

    it("fails when down payment amount is invalid", async () => {
      const invalidInput = { ...MOCK_PREORDER_DP_INPUT, downPaymentAmount: 0 };
      createPurchaseReceiveMock.mockResolvedValue({
        success: true,
        data: { json: { id: "rcv-010" } },
      });
      updatePurchaseReceiveMock.mockResolvedValue({ success: true });
      createPurchaseInvoiceMock.mockResolvedValue({
        success: true,
        data: { json: { id: "inv-010", totalAmount: 300000 } },
      });
      postPurchaseInvoiceMock.mockResolvedValue({ success: true });

      const result = await createQuickPurchase(invalidInput);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Down payment amount must be greater than 0");
      expect(createPurchasePaymentMock).not.toHaveBeenCalled();
    });
  });

  describe("validation", () => {
    it("throws error when vendor is missing", async () => {
      const invalidInput = { ...MOCK_CASH_DAILY_INPUT, contactId: "" };

      const result = await createQuickPurchase(invalidInput);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Vendor is required");
      expect(createPurchaseReceiveMock).not.toHaveBeenCalled();
    });

    it("throws error when items are empty", async () => {
      const invalidInput = { ...MOCK_CASH_DAILY_INPUT, items: [] };

      const result = await createQuickPurchase(invalidInput);

      expect(result.success).toBe(false);
      expect(result.error).toContain("At least one item is required");
      expect(createPurchaseReceiveMock).not.toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("fails when receive creation fails", async () => {
      createPurchaseReceiveMock.mockResolvedValue({
        success: false,
        error: "Receive creation failed",
      });

      const result = await createQuickPurchase(MOCK_CASH_DAILY_INPUT);

      expect(result.success).toBe(false);
      expect(result.error).toContain("creation failed");
      expect(updatePurchaseReceiveMock).not.toHaveBeenCalled();
      expect(createPurchaseInvoiceMock).not.toHaveBeenCalled();
    });

    it("fails when receive completion fails", async () => {
      createPurchaseReceiveMock.mockResolvedValue({
        success: true,
        data: { json: { id: "rcv-004" } },
      });

      updatePurchaseReceiveMock.mockResolvedValue({
        success: false,
        error: "Completion failed",
      });

      const result = await createQuickPurchase(MOCK_CASH_DAILY_INPUT);

      expect(result.success).toBe(false);
      expect(result.error).toContain("failed");
      expect(createPurchaseInvoiceMock).not.toHaveBeenCalled();
    });

    it("fails when invoice creation fails", async () => {
      createPurchaseReceiveMock.mockResolvedValue({
        success: true,
        data: { json: { id: "rcv-005" } },
      });

      updatePurchaseReceiveMock.mockResolvedValue({
        success: true,
      });

      createPurchaseInvoiceMock.mockResolvedValue({
        success: false,
        error: "Invoice creation failed",
      });

      const result = await createQuickPurchase(MOCK_CASH_DAILY_INPUT);

      expect(result.success).toBe(false);
      expect(result.error).toContain("creation failed");
      expect(postPurchaseInvoiceMock).not.toHaveBeenCalled();
    });

    it("fails when invoice posting fails", async () => {
      createPurchaseReceiveMock.mockResolvedValue({
        success: true,
        data: { json: { id: "rcv-006" } },
      });

      updatePurchaseReceiveMock.mockResolvedValue({
        success: true,
      });

      createPurchaseInvoiceMock.mockResolvedValue({
        success: true,
        data: { json: { id: "inv-006", totalAmount: 90000 } },
      });

      postPurchaseInvoiceMock.mockResolvedValue({
        success: false,
        error: "Posting failed",
      });

      const result = await createQuickPurchase(MOCK_CASH_DAILY_INPUT);

      expect(result.success).toBe(false);
      expect(result.error).toContain("failed");
      expect(createPurchasePaymentMock).not.toHaveBeenCalled();
    });

    it("fails when payment creation fails (CASH_DAILY)", async () => {
      createPurchaseReceiveMock.mockResolvedValue({
        success: true,
        data: { json: { id: "rcv-007" } },
      });

      updatePurchaseReceiveMock.mockResolvedValue({
        success: true,
      });

      createPurchaseInvoiceMock.mockResolvedValue({
        success: true,
        data: { json: { id: "inv-007", totalAmount: 90000 } },
      });

      postPurchaseInvoiceMock.mockResolvedValue({
        success: true,
      });

      createPurchasePaymentMock.mockResolvedValue({
        success: false,
        error: "Payment creation failed",
      });

      const result = await createQuickPurchase(MOCK_CASH_DAILY_INPUT);

      expect(result.success).toBe(false);
      expect(result.error).toContain("creation failed");
      expect(postPurchasePaymentMock).not.toHaveBeenCalled();
    });

    it("fails when payment posting fails (CASH_DAILY)", async () => {
      createPurchaseReceiveMock.mockResolvedValue({
        success: true,
        data: { json: { id: "rcv-008" } },
      });

      updatePurchaseReceiveMock.mockResolvedValue({
        success: true,
      });

      createPurchaseInvoiceMock.mockResolvedValue({
        success: true,
        data: { json: { id: "inv-008", totalAmount: 90000 } },
      });

      postPurchaseInvoiceMock.mockResolvedValue({
        success: true,
      });

      createPurchasePaymentMock.mockResolvedValue({
        success: true,
        data: { json: { id: "pay-008" } },
      });

      postPurchasePaymentMock.mockResolvedValue({
        success: false,
        error: "Payment posting failed",
      });

      const result = await createQuickPurchase(MOCK_CASH_DAILY_INPUT);

      expect(result.success).toBe(false);
      expect(result.error).toContain("failed");
    });
  });
});
