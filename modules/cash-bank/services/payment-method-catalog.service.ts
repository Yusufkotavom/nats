import { prisma } from "@/lib/prisma";

export type PaymentMethodGroup = "CASH" | "BANK";

export type PaymentMethodOption = {
  id: string;
  name: string;
  method: PaymentMethodGroup;
  accountType: "CASH" | "BANK" | "PETTY_CASH" | "EWALLET";
  bankName: string | null;
  accountNumber: string | null;
  glCode: string;
  glName: string;
  isDefault: boolean;
};

export class PaymentMethodCatalogService {
  static async list(companyId: string): Promise<PaymentMethodOption[]> {
    const [profile, defaultAccounts] = await Promise.all([
      prisma.companyProfile.findUnique({
        where: { companyId },
        select: {
          defaultCashAccountId: true,
          defaultCardAccountId: true,
          defaultQrisAccountId: true,
        },
      }),
      prisma.defaultAccount.findMany({
        where: {
          companyId,
          isActive: true,
          purpose: { in: ["CASH_ON_HAND", "BANK"] },
        },
        select: {
          purpose: true,
          accountId: true,
        },
      }),
    ]);

    const cashParentId =
      defaultAccounts.find((a) => a.purpose === "CASH_ON_HAND")?.accountId || null;
    const bankParentId =
      defaultAccounts.find((a) => a.purpose === "BANK")?.accountId || null;

    const accountRows = await prisma.cashAccount.findMany({
      where: {
        isActive: true,
        glAccount: {
          companyId,
        },
      },
      select: {
        id: true,
        name: true,
        type: true,
        bankName: true,
        accountNumber: true,
        glAccount: {
          select: {
            code: true,
            name: true,
            parentId: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const defaultIds = new Set(
      [profile?.defaultCashAccountId, profile?.defaultCardAccountId, profile?.defaultQrisAccountId].filter(
        Boolean,
      ) as string[],
    );

    const options = accountRows
      .filter((row) => {
        if (defaultIds.has(row.id)) return true;
        if (cashParentId && row.glAccount.parentId === cashParentId) return true;
        if (bankParentId && row.glAccount.parentId === bankParentId) return true;
        return false;
      })
      .map((row) => {
        const method: PaymentMethodGroup =
          row.type === "CASH" || row.type === "PETTY_CASH" ? "CASH" : "BANK";
        return {
          id: row.id,
          name: row.name,
          method,
          accountType: row.type,
          bankName: row.bankName,
          accountNumber: row.accountNumber,
          glCode: row.glAccount.code,
          glName: row.glAccount.name,
          isDefault: defaultIds.has(row.id),
        };
      });

    return options;
  }
}

