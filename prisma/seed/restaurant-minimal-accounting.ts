import { prisma } from "./utils";
import { DefaultAccountPurpose } from "../generated/prisma/client";

export const RESTAURANT_MINIMAL_ACTIVE_ACCOUNT_CODES = [
  // Assets
  "10000",
  "11000",
  "11110",
  "11120",
  "11200",
  "11300",
  "11400",
  "11900",
  // Liabilities
  "20000",
  "21000",
  "21100",
  "21110",
  "21200",
  "21300",
  // Equity
  "30000",
  "32000",
  "33000",
  // Revenue
  "40000",
  "41000",
  "41200",
  "42000",
  "49000",
  // Expenses
  "50000",
  "51000",
  "51200",
  "51400",
  "52000",
  "59000",
  "80000",
  "81000",
] as const;

export const RESTAURANT_MINIMAL_DEFAULT_ACCOUNT_CODE_BY_PURPOSE: Record<
  DefaultAccountPurpose,
  string
> = {
  ACCOUNTS_RECEIVABLE: "11200",
  ACCOUNTS_PAYABLE: "21100",
  GOODS_RECEIVED_NOT_INVOICED: "21110",
  INVENTORY_ASSET: "11300",
  COGS: "52000",
  SALES_REVENUE: "41200",
  SALES_DISCOUNT: "42000",
  SALES_TAX_PAYABLE: "21200",
  PURCHASE_TAX_RECEIVABLE: "11400",
  CASH_ON_HAND: "11120",
  BANK: "11110",
  OPENING_BALANCE_EQUITY: "33000",
  RETAINED_EARNINGS: "32000",
  UNCATEGORIZED_EXPENSE: "59000",
  UNCATEGORIZED_INCOME: "49000",
  UNCATEGORIZED_ASSET: "11900",
  EXCHANGE_GAIN_LOSS: "81000",
  SALARIES_EXPENSE: "51400",
  PAYROLL_LIABILITY: "21300",
  WIP_INVENTORY: "11300",
  PRODUCTION_OVERHEAD: "51200",
};

export async function seedRestaurantMinimalAccounting() {
  const activeCodes = new Set(RESTAURANT_MINIMAL_ACTIVE_ACCOUNT_CODES);

  await prisma.account.updateMany({
    data: { isActive: false },
    where: {
      isPosting: true,
      code: { notIn: [...activeCodes] },
    },
  });

  await prisma.account.updateMany({
    data: { isActive: true },
    where: { code: { in: [...activeCodes] } },
  });

  for (const [purpose, accountCode] of Object.entries(
    RESTAURANT_MINIMAL_DEFAULT_ACCOUNT_CODE_BY_PURPOSE,
  ) as [DefaultAccountPurpose, string][]) {
    const account = await prisma.account.findUnique({ where: { code: accountCode } });
    if (!account) {
      throw new Error(
        `Missing minimal restaurant account code ${accountCode} for default account purpose ${purpose}`,
      );
    }

    const existing = await prisma.defaultAccount.findFirst({
      where: { purpose },
      orderBy: { createdAt: "asc" },
    });

    await prisma.defaultAccount.updateMany({
      where: { purpose },
      data: { isActive: false },
    });

    if (existing) {
      await prisma.defaultAccount.update({
        where: { id: existing.id },
        data: {
          accountId: account.id,
          isActive: true,
        },
      });
      continue;
    }

    await prisma.defaultAccount.create({
      data: {
        purpose,
        accountId: account.id,
        isActive: true,
      },
    });
  }
}
