"use server";

import { prisma } from "@/lib/prisma";
import { SuperJSON } from "@/lib/superjson";
import { getSession } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/utils";
import { revalidateLocalizedPath } from "@/lib/revalidate-localized-path";

type PaymentMethodType = "CASH" | "BANK";

function assertAccess(session: Awaited<ReturnType<typeof getSession>>) {
  if (!session?.userId || !session?.activeCompanyId || !hasPermission(session.permissions, "cash_bank.view")) {
    throw new Error("Unauthorized");
  }
}

async function getDefaultParentAccountId(companyId: string, type: PaymentMethodType) {
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
    where: {
      companyId,
      code: { startsWith: `${parentCode}-` },
    },
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

export async function getPaymentMethods() {
  const session = await getSession();
  assertAccess(session);
  const companyId = session.activeCompanyId!;

  const methods = await prisma.cashAccount.findMany({
    where: {
      glAccount: { companyId },
      type: { in: ["CASH", "PETTY_CASH", "BANK", "EWALLET"] },
    },
    include: {
      glAccount: {
        select: { id: true, code: true, name: true, parentId: true },
      },
    },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  return SuperJSON.serialize(
    methods.map((item) => ({
      id: item.id,
      name: item.name,
      methodType: item.type === "CASH" || item.type === "PETTY_CASH" ? "CASH" : "BANK",
      accountType: item.type,
      accountNumber: item.accountNumber,
      bankName: item.bankName,
      glAccountId: item.glAccountId,
      glCode: item.glAccount.code,
      glName: item.glAccount.name,
      isActive: item.isActive,
    })),
  );
}

export async function createPaymentMethod(input: {
  name: string;
  type: PaymentMethodType;
  accountNumber?: string;
  bankName?: string;
}) {
  const session = await getSession();
  if (!session?.activeCompanyId || !hasPermission(session.permissions, "cash_bank.create")) {
    throw new Error("Unauthorized");
  }
  const companyId = session.activeCompanyId;
  const methodName = input.name.trim();
  if (!methodName) throw new Error("Method name is required");

  const parentAccountId = await getDefaultParentAccountId(companyId, input.type);
  const parent = await prisma.account.findFirst({
    where: { id: parentAccountId, companyId },
    select: { id: true, code: true, normalBalance: true, type: true, level: true },
  });
  if (!parent) throw new Error("Default parent account not found");

  const existing = await prisma.cashAccount.findFirst({
    where: {
      name: { equals: methodName, mode: "insensitive" },
      glAccount: { companyId },
    },
    select: { id: true },
  });
  if (existing) throw new Error("Payment method name already exists");

  const childCode = await generateChildCode(companyId, parent.code);
  const created = await prisma.$transaction(async (tx) => {
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
      select: { id: true, code: true, name: true },
    });

    const cashAccount = await tx.cashAccount.create({
      data: {
        name: methodName,
        type: input.type === "CASH" ? "CASH" : "BANK",
        accountNumber: input.accountNumber?.trim() || null,
        bankName: input.bankName?.trim() || null,
        glAccountId: account.id,
        isActive: true,
      },
      select: { id: true, name: true, type: true, glAccountId: true },
    });

    return { account, cashAccount };
  });

  revalidateLocalizedPath("/payment-method");
  revalidateLocalizedPath("/cash-bank");
  return SuperJSON.serialize(created);
}
