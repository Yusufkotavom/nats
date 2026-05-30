import type { Prisma } from "@/prisma/generated/prisma/client";

type Tx = Prisma.TransactionClient;

type CategorySeed = {
  key: string;
  name: string;
  type: "EXPENSE" | "INCOME";
};

const CATEGORY_SEEDS: CategorySeed[] = [
  { key: "OPERASIONAL_UMUM", name: "Operasional Umum", type: "EXPENSE" },
  { key: "BELANJA_BAHAN", name: "Belanja Bahan/Barang", type: "EXPENSE" },
  { key: "TRANSPORT", name: "Transport", type: "EXPENSE" },
  { key: "PENJUALAN_TUNAI", name: "Penjualan Tunai", type: "INCOME" },
  { key: "PENDAPATAN_LAINNYA", name: "Pendapatan Lainnya", type: "INCOME" },
];

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

async function ensureCategoryAccount(tx: Tx, input: {
  companyId: string;
  category: CategorySeed;
  parentAccountId: string;
}) {
  const existing = await tx.account.findFirst({
    where: {
      companyId: input.companyId,
      name: input.category.name,
      parentId: input.parentAccountId,
      isPosting: true,
      isActive: true,
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
  if (!parent) return null;

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

  const created = await tx.account.create({
    data: {
      companyId: input.companyId,
      code: childCode,
      name: input.category.name,
      type: parent.type,
      normalBalance: parent.normalBalance,
      isPosting: true,
      parentId: parent.id,
      level: parent.level + 1,
      isActive: true,
    },
    select: { id: true },
  });

  return created.id;
}

export async function ensureCompanyMinimalCashTransactionCategories(
  tx: Tx,
  companyId: string,
) {
  const defaults = await tx.defaultAccount.findMany({
    where: {
      companyId,
      isActive: true,
      purpose: { in: ["UNCATEGORIZED_EXPENSE", "UNCATEGORIZED_INCOME"] },
    },
    select: {
      purpose: true,
      accountId: true,
    },
  });

  const expenseParentId =
    defaults.find((item) => item.purpose === "UNCATEGORIZED_EXPENSE")?.accountId || null;
  const incomeParentId =
    defaults.find((item) => item.purpose === "UNCATEGORIZED_INCOME")?.accountId || null;

  if (!expenseParentId && !incomeParentId) return;

  for (const category of CATEGORY_SEEDS) {
    const parentAccountId =
      category.type === "EXPENSE" ? expenseParentId : incomeParentId;
    if (!parentAccountId) continue;
    await ensureCategoryAccount(tx, {
      companyId,
      category,
      parentAccountId,
    });
  }
}

