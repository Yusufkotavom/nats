import { prisma } from "./utils";
import { DefaultAccountPurpose } from "../generated/prisma/client";

export const DAILY_REQUIRED_DEFAULT_ACCOUNT_PURPOSES: DefaultAccountPurpose[] = [
  DefaultAccountPurpose.CASH_ON_HAND,
  DefaultAccountPurpose.BANK,
  DefaultAccountPurpose.ACCOUNTS_RECEIVABLE,
  DefaultAccountPurpose.ACCOUNTS_PAYABLE,
  DefaultAccountPurpose.SALES_REVENUE,
  DefaultAccountPurpose.COGS,
  DefaultAccountPurpose.INVENTORY_ASSET,
  DefaultAccountPurpose.OPENING_BALANCE_EQUITY,
];

export const ALL_REQUIRED_DEFAULT_ACCOUNT_PURPOSES = Object.values(
  DefaultAccountPurpose,
);

export function findMissingDefaultAccountPurposes(
  requiredPurposes: DefaultAccountPurpose[],
  foundPurposes: DefaultAccountPurpose[],
) {
  const found = new Set(foundPurposes);
  return requiredPurposes.filter((purpose) => !found.has(purpose));
}

export async function verifyDefaultAccounts(
  requiredPurposes: DefaultAccountPurpose[],
  verificationLabel: string,
) {
  const mappings = await prisma.defaultAccount.findMany({
    where: {
      purpose: { in: requiredPurposes },
      isActive: true,
    },
    include: { account: true },
    orderBy: [{ purpose: "asc" }, { createdAt: "asc" }],
  });

  const missing = findMissingDefaultAccountPurposes(
    requiredPurposes,
    mappings.map((row) => row.purpose),
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing default account mapping for ${verificationLabel}: ${missing.join(", ")}`,
    );
  }

  const purposeCounts = new Map<DefaultAccountPurpose, number>();
  for (const mapping of mappings) {
    const currentCount = purposeCounts.get(mapping.purpose) ?? 0;
    purposeCounts.set(mapping.purpose, currentCount + 1);
  }

  const duplicatedPurposes = requiredPurposes.filter(
    (purpose) => (purposeCounts.get(purpose) ?? 0) > 1,
  );

  if (duplicatedPurposes.length > 0) {
    throw new Error(
      `Duplicate active default account mapping for ${verificationLabel}: ${duplicatedPurposes.join(", ")}`,
    );
  }

  console.log(`✅ Default account mapping ready for ${verificationLabel}:`);
  for (const row of mappings) {
    console.log(`- ${row.purpose} -> ${row.account.code} ${row.account.name}`);
  }
}
