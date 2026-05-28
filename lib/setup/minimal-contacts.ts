import { ContactType, type Prisma } from "@/prisma/generated/prisma/client";

type Tx = Prisma.TransactionClient;

const DEFAULT_CONTACT_BY_TYPE: Record<ContactType, { name: string }> = {
  CUSTOMER: { name: "Walk-in Customer" },
  VENDOR: { name: "General Vendor" },
  EMPLOYEE: { name: "General Employee" },
};

export async function ensureCompanyMinimalContacts(tx: Tx, companyId: string) {
  const existing = await tx.contact.findMany({
    where: {
      companyId,
      type: {
        in: [ContactType.CUSTOMER, ContactType.VENDOR, ContactType.EMPLOYEE],
      },
    },
    select: { type: true },
  });

  const existingTypes = new Set(existing.map((item) => item.type));
  const toCreate = (Object.keys(DEFAULT_CONTACT_BY_TYPE) as ContactType[])
    .filter((type) => !existingTypes.has(type))
    .map((type) => ({
      companyId,
      type,
      name: DEFAULT_CONTACT_BY_TYPE[type].name,
      isActive: true,
    }));

  if (toCreate.length === 0) return;

  await tx.contact.createMany({
    data: toCreate,
  });
}

