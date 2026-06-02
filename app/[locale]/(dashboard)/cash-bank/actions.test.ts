import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.hoisted(() => vi.fn());
const hasPermissionMock = vi.hoisted(() => vi.fn());
const paymentMethodCatalogListMock = vi.hoisted(() => vi.fn());
const cashTransferFindManyMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/auth", () => ({
  getSession: () => getSessionMock(),
  verifySession: vi.fn(),
}));

vi.mock("@/lib/permissions/utils", () => ({
  hasPermission: (...args: unknown[]) => hasPermissionMock(...args),
}));

vi.mock("@/modules/cash-bank/services/payment-method-catalog.service", () => ({
  PaymentMethodCatalogService: {
    list: (...args: unknown[]) => paymentMethodCatalogListMock(...args),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    cashTransfer: {
      findMany: cashTransferFindManyMock,
    },
  },
}));

vi.mock("@/lib/revalidate-localized-path", () => ({
  revalidateLocalizedPath: vi.fn(),
}));

vi.mock("@/lib/file-service", () => ({
  saveFile: vi.fn(),
}));

vi.mock("@/modules/integration/outbox", () => ({
  maybeProcessIntegrationOutboxEvent: vi.fn(),
}));

vi.mock("@/modules/cash-bank/services/cash-account.service", () => ({
  CashAccountService: {},
}));

vi.mock("@/modules/cash-bank/services/cash-transfer.service", () => ({
  CashTransferService: {},
}));

vi.mock("@/modules/cash-bank/services/cash-account-sync.service", () => ({
  CashAccountSyncService: {},
}));

vi.mock("@/lib/subscription/write-guard", () => ({
  assertCompanyWriteAccess: vi.fn(),
}));

import { getOperationalPaymentMethodAccounts, getTransfers } from "./actions";

describe("cash-bank actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty options when session cannot view cash-bank", async () => {
    getSessionMock.mockResolvedValue(null);

    await expect(getOperationalPaymentMethodAccounts()).resolves.toEqual([]);
    expect(paymentMethodCatalogListMock).not.toHaveBeenCalled();
  });

  it("reads operational accounts from payment method catalog", async () => {
    getSessionMock.mockResolvedValue({
      activeCompanyId: "company-1",
      permissions: ["cash_bank.view"],
    });
    hasPermissionMock.mockReturnValue(true);
    paymentMethodCatalogListMock.mockResolvedValue([
      {
        id: "cash-1",
        name: "Kas Toko",
        method: "CASH",
        accountType: "CASH",
        bankName: null,
        accountNumber: null,
        glCode: "111-01",
        glName: "Kas Toko",
        isDefault: true,
      },
    ]);

    await expect(getOperationalPaymentMethodAccounts()).resolves.toEqual([
      expect.objectContaining({
        id: "cash-1",
        name: "Kas Toko",
        method: "CASH",
      }),
    ]);
    expect(paymentMethodCatalogListMock).toHaveBeenCalledWith("company-1");
  });

  it("scopes transfer listing to active company cash accounts", async () => {
    getSessionMock.mockResolvedValue({
      activeCompanyId: "company-1",
      permissions: ["cash_bank.view"],
    });
    hasPermissionMock.mockReturnValue(true);
    cashTransferFindManyMock.mockResolvedValue([]);

    await getTransfers("bank");

    expect(cashTransferFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            {
              OR: [
                { fromAccount: { glAccount: { companyId: "company-1" } } },
                { toAccount: { glAccount: { companyId: "company-1" } } },
              ],
            },
            {
              OR: [
                { description: { contains: "bank", mode: "insensitive" } },
                { fromAccount: { name: { contains: "bank", mode: "insensitive" } } },
                { toAccount: { name: { contains: "bank", mode: "insensitive" } } },
              ],
            },
          ],
        },
      }),
    );
  });
});
