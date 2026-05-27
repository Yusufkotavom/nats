import { Prisma } from "@/prisma/generated/prisma/client";

type DbClient = Prisma.TransactionClient;
type PaymentMethod = "CASH" | "CARD" | "QRIS";

const METHOD_ACCOUNT_TYPES: Record<PaymentMethod, Array<"CASH" | "BANK" | "PETTY_CASH" | "EWALLET">> = {
  CASH: ["CASH", "PETTY_CASH"],
  CARD: ["BANK", "EWALLET"],
  QRIS: ["BANK", "EWALLET"],
};

export class PaymentAccountResolverService {
  static getAllowedTypes(method: PaymentMethod) {
    return METHOD_ACCOUNT_TYPES[method];
  }

  static async listActiveAccounts(
    tx: DbClient,
    companyId: string,
    method?: PaymentMethod,
  ) {
    return tx.cashAccount.findMany({
      where: {
        isActive: true,
        ...(method ? { type: { in: this.getAllowedTypes(method) } } : {}),
        glAccount: { companyId },
      },
      orderBy: [{ name: "asc" }],
    });
  }

  static async getDefaultAccountId(
    tx: DbClient,
    companyId: string,
    method: PaymentMethod,
  ) {
    let profile: {
      defaultCashAccountId: string | null;
      defaultCardAccountId: string | null;
      defaultQrisAccountId: string | null;
    } | null = null;

    try {
      profile = await tx.companyProfile.findUnique({
        where: { companyId },
        select: {
          defaultCashAccountId: true,
          defaultCardAccountId: true,
          defaultQrisAccountId: true,
        },
      });
    } catch (error) {
      // Backward compatibility: older generated Prisma client/schema without default payment mapping fields.
      if (
        error instanceof Prisma.PrismaClientValidationError &&
        error.message.includes("defaultCashAccountId")
      ) {
        return null;
      }
      throw error;
    }

    if (!profile) return null;
    if (method === "CASH") return profile.defaultCashAccountId;
    if (method === "CARD") return profile.defaultCardAccountId;
    return profile.defaultQrisAccountId;
  }

  static async resolveAccount(
    tx: DbClient,
    params: {
      companyId: string;
      method: PaymentMethod;
      requestedAccountId?: string | null;
    },
  ) {
    const { companyId, method, requestedAccountId } = params;
    const allowedTypes = this.getAllowedTypes(method);

    if (requestedAccountId) {
      const requested = await tx.cashAccount.findFirst({
        where: {
          id: requestedAccountId,
          isActive: true,
          type: { in: allowedTypes },
          glAccount: { companyId },
        },
      });
      if (requested) return requested;
    }

    const defaultAccountId = await this.getDefaultAccountId(tx, companyId, method);
    if (defaultAccountId) {
      const defaultAccount = await tx.cashAccount.findFirst({
        where: {
          id: defaultAccountId,
          isActive: true,
          type: { in: allowedTypes },
          glAccount: { companyId },
        },
      });
      if (defaultAccount) return defaultAccount;
    }

    return tx.cashAccount.findFirst({
      where: {
        isActive: true,
        type: { in: allowedTypes },
        glAccount: { companyId },
      },
      orderBy: [{ name: "asc" }],
    });
  }
}
