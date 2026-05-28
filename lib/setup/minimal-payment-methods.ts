import type { Prisma } from "@/prisma/generated/prisma/client";

type Tx = Prisma.TransactionClient;

function nextChildCode(parentCode: string, siblingCodes: string[]) {
  const used = new Set(
    siblingCodes
      .map((code) => Number(code.replace(`${parentCode}-`, "")))
      .filter((n) => Number.isFinite(n)),
  );
  let next = 1;
  while (used.has(next)) next += 1;
  return `${parentCode}-${String(next).padStart(2, "0")}`;
}

async function ensurePaymentAccount(tx: Tx, input: {
  companyId: string;
  methodName: string;
  methodType: "CASH" | "BANK";
  parentAccountId: string;
}) {
  const existing = await tx.cashAccount.findFirst({
    where: {
      isActive: true,
      type: input.methodType,
      glAccount: {
        companyId: input.companyId,
        parentId: input.parentAccountId,
      },
    },
    select: { id: true },
  });
  if (existing) return existing.id;

  const parent = await tx.account.findFirst({
    where: {
      id: input.parentAccountId,
      companyId: input.companyId,
    },
    select: {
      id: true,
      code: true,
      type: true,
      normalBalance: true,
      level: true,
    },
  });
  if (!parent) throw new Error(`Default parent account for ${input.methodType} not found`);

  const siblings = await tx.account.findMany({
    where: {
      companyId: input.companyId,
      parentId: parent.id,
      code: { startsWith: `${parent.code}-` },
    },
    select: { code: true },
    orderBy: { code: "asc" },
  });
  const childCode = nextChildCode(parent.code, siblings.map((s) => s.code));

  const account = await tx.account.create({
    data: {
      companyId: input.companyId,
      code: childCode,
      name: input.methodName,
      type: parent.type,
      normalBalance: parent.normalBalance,
      isPosting: true,
      parentId: parent.id,
      level: parent.level + 1,
      isActive: true,
    },
    select: { id: true },
  });

  const cashAccount = await tx.cashAccount.create({
    data: {
      name: input.methodName,
      type: input.methodType,
      glAccountId: account.id,
      isActive: true,
    },
    select: { id: true },
  });

  return cashAccount.id;
}

export async function ensureCompanyMinimalPaymentMethods(tx: Tx, companyId: string) {
  const defaults = await tx.defaultAccount.findMany({
    where: {
      companyId,
      isActive: true,
      purpose: { in: ["CASH_ON_HAND", "BANK"] },
    },
    select: {
      purpose: true,
      accountId: true,
    },
  });

  const cashParentId = defaults.find((item) => item.purpose === "CASH_ON_HAND")?.accountId;
  const bankParentId = defaults.find((item) => item.purpose === "BANK")?.accountId;
  if (!cashParentId || !bankParentId) return;

  const [cashAccountId, bankAccountId] = await Promise.all([
    ensurePaymentAccount(tx, {
      companyId,
      methodName: "Cash",
      methodType: "CASH",
      parentAccountId: cashParentId,
    }),
    ensurePaymentAccount(tx, {
      companyId,
      methodName: "Bank",
      methodType: "BANK",
      parentAccountId: bankParentId,
    }),
  ]);

  await tx.companyProfile.upsert({
    where: { companyId },
    update: {
      defaultCashAccountId: cashAccountId,
      defaultCardAccountId: bankAccountId,
      defaultQrisAccountId: bankAccountId,
    },
    create: {
      companyId,
      name: "Default Company",
      currency: "IDR",
      currencySymbol: "Rp",
      dateFormat: "dd/MM/yyyy",
      currencyFormat: "standard",
      locale: "id-ID",
      timezone: "Asia/Jakarta",
      enableDepartmentDimension: false,
      enableProjectDimension: false,
      posEnableRestaurantFeatures: false,
      defaultCashAccountId: cashAccountId,
      defaultCardAccountId: bankAccountId,
      defaultQrisAccountId: bankAccountId,
    },
  });
}

