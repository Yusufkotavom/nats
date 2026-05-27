"use server";

import { prisma } from "@/lib/prisma";
import { SuperJSON } from "@/lib/superjson";
import { getSession } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/utils";
import { revalidateLocalizedPath } from "@/lib/revalidate-localized-path";
import { PaymentMethodCatalogService } from "@/modules/cash-bank/services/payment-method-catalog.service";

type MethodKey = "CASH" | "BANK";

function assertViewAccess(session: Awaited<ReturnType<typeof getSession>>) {
  if (!session?.activeCompanyId || !hasPermission(session.permissions, "cash_bank.view")) {
    throw new Error("Unauthorized");
  }
}

function assertEditAccess(session: Awaited<ReturnType<typeof getSession>>) {
  if (!session?.activeCompanyId || !hasPermission(session.permissions, "cash_bank.edit")) {
    throw new Error("Unauthorized");
  }
}

async function getDefaultParentAccountId(companyId: string, type: MethodKey) {
  const purpose = type === "CASH" ? "CASH_ON_HAND" : "BANK";
  const mapped = await prisma.defaultAccount.findFirst({
    where: { companyId, purpose, isActive: true },
    select: { accountId: true },
    orderBy: { createdAt: "desc" },
  });
  if (!mapped?.accountId) {
    throw new Error(`Default account mapping for ${purpose} is not configured`);
  }
  return mapped.accountId;
}

async function generateChildCode(companyId: string, parentCode: string) {
  const siblings = await prisma.account.findMany({
    where: { companyId, code: { startsWith: `${parentCode}-` } },
    select: { code: true },
    orderBy: { code: "asc" },
  });
  const used = new Set(
    siblings
      .map((s) => Number(s.code.replace(`${parentCode}-`, "")))
      .filter((n) => Number.isFinite(n)),
  );
  let next = 1;
  while (used.has(next)) next += 1;
  return `${parentCode}-${String(next).padStart(2, "0")}`;
}

async function getAccountOptions(companyId: string, method: MethodKey) {
  const options = await PaymentMethodCatalogService.list(companyId);
  return options
    .filter((option) => option.method === method)
    .map((option) => ({
      id: option.id,
      name: option.name,
      type: option.accountType,
      bankName: option.bankName,
      accountNumber: option.accountNumber,
      glCode: option.glCode,
      glName: option.glName,
    }));
}

export async function getPaymentMethodMappings() {
  const session = await getSession();
  assertViewAccess(session);
  const companyId = session.activeCompanyId!;

  const [profile, cashOptions, bankOptions] = await Promise.all([
    prisma.companyProfile.findUnique({
      where: { companyId },
      select: {
        defaultCashAccountId: true,
        defaultCardAccountId: true,
        defaultQrisAccountId: true,
      },
    }),
    getAccountOptions(companyId, "CASH"),
    getAccountOptions(companyId, "BANK"),
  ]);

  const selectedCash =
    cashOptions.find((a) => a.id === profile?.defaultCashAccountId) || null;
  const selectedBank =
    bankOptions.find(
      (a) =>
        a.id === profile?.defaultCardAccountId ||
        a.id === profile?.defaultQrisAccountId,
    ) || null;

  return SuperJSON.serialize({
    rows: [
      {
        method: "CASH" as const,
        label: "Cash",
        description: "Cash on hand / petty cash account for incoming/outgoing payments.",
        mappedAccount: selectedCash,
      },
      {
        method: "BANK" as const,
        label: "Bank",
        description: "Primary bank/e-wallet account for transfer and non-cash payments.",
        mappedAccount: selectedBank,
      },
    ],
    options: {
      CASH: cashOptions,
      BANK: bankOptions,
    },
  });
}

export async function updatePaymentMethodMapping(input: {
  method: MethodKey;
  cashAccountId: string;
}) {
  const session = await getSession();
  assertEditAccess(session);
  const companyId = session.activeCompanyId!;

  const account = await prisma.cashAccount.findFirst({
    where: {
      id: input.cashAccountId,
      isActive: true,
      glAccount: { companyId },
    },
    select: { id: true, type: true },
  });
  if (!account) throw new Error("Akun cash/bank tidak ditemukan");

  if (input.method === "CASH" && !["CASH", "PETTY_CASH"].includes(account.type)) {
    throw new Error("Mapping CASH hanya boleh ke akun tipe CASH/PETTY_CASH");
  }
  if (input.method === "BANK" && !["BANK", "EWALLET"].includes(account.type)) {
    throw new Error("Mapping BANK hanya boleh ke akun tipe BANK/EWALLET");
  }

  if (input.method === "CASH") {
    await prisma.companyProfile.upsert({
      where: { companyId },
      update: { defaultCashAccountId: input.cashAccountId },
      create: { companyId, defaultCashAccountId: input.cashAccountId },
    });
  } else {
    await prisma.companyProfile.upsert({
      where: { companyId },
      update: {
        defaultCardAccountId: input.cashAccountId,
        defaultQrisAccountId: input.cashAccountId,
      },
      create: {
        companyId,
        defaultCardAccountId: input.cashAccountId,
        defaultQrisAccountId: input.cashAccountId,
      },
    });
  }

  revalidateLocalizedPath("/payment-method");
  return { success: true };
}

export async function deletePaymentMethodMapping(method: MethodKey) {
  const session = await getSession();
  assertEditAccess(session);
  const companyId = session.activeCompanyId!;

  if (method === "CASH") {
    await prisma.companyProfile.upsert({
      where: { companyId },
      update: { defaultCashAccountId: null },
      create: { companyId, defaultCashAccountId: null },
    });
  } else {
    await prisma.companyProfile.upsert({
      where: { companyId },
      update: {
        defaultCardAccountId: null,
        defaultQrisAccountId: null,
      },
      create: {
        companyId,
        defaultCardAccountId: null,
        defaultQrisAccountId: null,
      },
    });
  }

  revalidateLocalizedPath("/payment-method");
  return { success: true };
}

export async function createPaymentMethod(input: {
  name: string;
  type: MethodKey;
  accountNumber?: string;
  bankName?: string;
}) {
  const session = await getSession();
  assertEditAccess(session);
  const companyId = session.activeCompanyId!;
  const methodName = input.name.trim();
  if (!methodName) throw new Error("Method name is required");

  const existing = await prisma.cashAccount.findFirst({
    where: {
      name: { equals: methodName, mode: "insensitive" },
      glAccount: { companyId },
    },
    select: { id: true },
  });
  if (existing) throw new Error("Payment method name already exists");

  const parentAccountId = await getDefaultParentAccountId(companyId, input.type);
  const parent = await prisma.account.findFirst({
    where: { id: parentAccountId, companyId },
    select: { id: true, code: true, normalBalance: true, type: true, level: true },
  });
  if (!parent) throw new Error("Default parent account not found");

  const childCode = await generateChildCode(companyId, parent.code);
  await prisma.$transaction(async (tx) => {
    const account = await tx.account.create({
      data: {
        companyId,
        code: childCode,
        name: methodName,
        type: parent.type,
        normalBalance: parent.normalBalance,
        isPosting: true,
        parentId: parent.id,
        level: parent.level + 1,
        isActive: true,
      },
      select: { id: true },
    });

    await tx.cashAccount.create({
      data: {
        name: methodName,
        type: input.type === "CASH" ? "CASH" : "BANK",
        accountNumber: input.accountNumber?.trim() || null,
        bankName: input.bankName?.trim() || null,
        glAccountId: account.id,
        isActive: true,
      },
    });
  });

  revalidateLocalizedPath("/payment-method");
  return { success: true };
}

export async function updatePaymentMethodAccount(input: {
  cashAccountId: string;
  name: string;
  type: MethodKey;
  bankName?: string;
  accountNumber?: string;
}) {
  const session = await getSession();
  assertEditAccess(session);
  const companyId = session.activeCompanyId!;
  const name = input.name.trim();
  if (!name) throw new Error("Nama akun wajib diisi");

  const parentAccountId = await getDefaultParentAccountId(companyId, input.type);
  const target = await prisma.cashAccount.findFirst({
    where: {
      id: input.cashAccountId,
      isActive: true,
      glAccount: {
        companyId,
        parentId: parentAccountId,
      },
    },
    select: {
      id: true,
      glAccountId: true,
    },
  });
  if (!target) throw new Error("Akun payment method tidak ditemukan");

  const nextType = input.type === "CASH" ? "CASH" : "BANK";
  await prisma.$transaction(async (tx) => {
    await tx.cashAccount.update({
      where: { id: target.id },
      data: {
        name,
        type: nextType,
        bankName: input.bankName?.trim() || null,
        accountNumber: input.accountNumber?.trim() || null,
      },
    });
    await tx.account.update({
      where: { id: target.glAccountId },
      data: { name },
    });
  });

  revalidateLocalizedPath("/payment-method");
  return { success: true };
}

export async function deletePaymentMethodAccount(cashAccountId: string) {
  const session = await getSession();
  assertEditAccess(session);
  const companyId = session.activeCompanyId!;

  const target = await prisma.cashAccount.findFirst({
    where: {
      id: cashAccountId,
      isActive: true,
      glAccount: { companyId },
    },
    select: {
      id: true,
      glAccountId: true,
      salesPayments: { select: { id: true }, take: 1 },
      purchasePayments: { select: { id: true }, take: 1 },
      transactions: { select: { id: true }, take: 1 },
    },
  });
  if (!target) throw new Error("Akun payment method tidak ditemukan");

  if (target.salesPayments.length || target.purchasePayments.length || target.transactions.length) {
    throw new Error("Akun sudah dipakai transaksi dan tidak bisa dihapus");
  }

  await prisma.$transaction(async (tx) => {
    const profile = await tx.companyProfile.findUnique({
      where: { companyId },
      select: {
        defaultCashAccountId: true,
        defaultCardAccountId: true,
        defaultQrisAccountId: true,
      },
    });

    if (profile) {
      await tx.companyProfile.update({
        where: { companyId },
        data: {
          defaultCashAccountId:
            profile.defaultCashAccountId === target.id ? null : profile.defaultCashAccountId,
          defaultCardAccountId:
            profile.defaultCardAccountId === target.id ? null : profile.defaultCardAccountId,
          defaultQrisAccountId:
            profile.defaultQrisAccountId === target.id ? null : profile.defaultQrisAccountId,
        },
      });
    }

    await tx.cashAccount.delete({
      where: { id: target.id },
    });
    await tx.account.delete({
      where: { id: target.glAccountId },
    });
  });

  revalidateLocalizedPath("/payment-method");
  return { success: true };
}
