import { prisma } from "@/lib/prisma";
import { DefaultAccountPurpose } from "@/prisma/generated/prisma/client";
import { cache } from "react";

export type DefaultAccountResult = {
  accountId: string;
  accountCode: string;
  accountName: string;
} | null;

export const getDefaultAccount = cache(
  async (purpose: DefaultAccountPurpose): Promise<DefaultAccountResult> => {
    const defaultAccount = await prisma.defaultAccount.findFirst({
      where: {
        purpose,
        isActive: true,
      },
      include: {
        account: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    if (!defaultAccount) return null;

    return {
      accountId: defaultAccount.accountId,
      accountCode: defaultAccount.account.code,
      accountName: defaultAccount.account.name,
    };
  }
);

export const getDefaultAccounts = cache(
  async (
    purposes: DefaultAccountPurpose[]
  ): Promise<Record<string, DefaultAccountResult>> => {
    const defaultAccounts = await prisma.defaultAccount.findMany({
      where: {
        purpose: {
          in: purposes,
        },
        isActive: true,
      },
      include: {
        account: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    const result: Record<string, DefaultAccountResult> = {};

    purposes.forEach((p) => {
      result[p] = null;
    });

    defaultAccounts.forEach((da) => {
      result[da.purpose] = {
        accountId: da.accountId,
        accountCode: da.account.code,
        accountName: da.account.name,
      };
    });

    return result;
  }
);

export async function getRequiredDefaultAccount(purpose: DefaultAccountPurpose) {
  const account = await getDefaultAccount(purpose);
  if (!account) {
    throw new Error(`Missing default account configuration for ${purpose}`);
  }
  return account;
}

