import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Start seeding...");

  // Define accounts with parent codes instead of IDs
  const accounts = [
    // 1. ASSETS
    {
      code: "10000",
      name: "Assets",
      type: "asset",
      normalBalance: "debit",
      isPosting: false,
      level: 0,
      parentCode: null,
    },
    {
      code: "11000",
      name: "Current Assets",
      type: "asset",
      normalBalance: "debit",
      isPosting: false,
      level: 1,
      parentCode: "10000",
    },
    {
      code: "11100",
      name: "Cash and Cash Equivalents",
      type: "asset",
      normalBalance: "debit",
      isPosting: true,
      level: 2,
      parentCode: "11000",
    },
    {
      code: "11200",
      name: "Accounts Receivable",
      type: "asset",
      normalBalance: "debit",
      isPosting: true,
      level: 2,
      parentCode: "11000",
    },
    {
      code: "12000",
      name: "Non-Current Assets",
      type: "asset",
      normalBalance: "debit",
      isPosting: false,
      level: 1,
      parentCode: "10000",
    },
    {
      code: "12100",
      name: "Fixed Assets",
      type: "asset",
      normalBalance: "debit",
      isPosting: true,
      level: 2,
      parentCode: "12000",
    },

    // 2. LIABILITIES
    {
      code: "20000",
      name: "Liabilities",
      type: "liability",
      normalBalance: "credit",
      isPosting: false,
      level: 0,
      parentCode: null,
    },
    {
      code: "21000",
      name: "Current Liabilities",
      type: "liability",
      normalBalance: "credit",
      isPosting: false,
      level: 1,
      parentCode: "20000",
    },
    {
      code: "21100",
      name: "Accounts Payable",
      type: "liability",
      normalBalance: "credit",
      isPosting: true,
      level: 2,
      parentCode: "21000",
    },
    {
      code: "22000",
      name: "Long-Term Liabilities",
      type: "liability",
      normalBalance: "credit",
      isPosting: false,
      level: 1,
      parentCode: "20000",
    },

    // 3. EQUITY
    {
      code: "30000",
      name: "Equity",
      type: "equity",
      normalBalance: "credit",
      isPosting: false,
      level: 0,
      parentCode: null,
    },
    {
      code: "31000",
      name: "Capital",
      type: "equity",
      normalBalance: "credit",
      isPosting: true,
      level: 1,
      parentCode: "30000",
    },

    // 4. REVENUE
    {
      code: "40000",
      name: "Revenue",
      type: "revenue",
      normalBalance: "credit",
      isPosting: false,
      level: 0,
      parentCode: null,
    },
    {
      code: "41000",
      name: "Operating Revenue",
      type: "revenue",
      normalBalance: "credit",
      isPosting: true,
      level: 1,
      parentCode: "40000",
    },

    // 5. EXPENSES
    {
      code: "50000",
      name: "Expenses",
      type: "expense",
      normalBalance: "debit",
      isPosting: false,
      level: 0,
      parentCode: null,
    },
    {
      code: "51000",
      name: "Operating Expenses",
      type: "expense",
      normalBalance: "debit",
      isPosting: true,
      level: 1,
      parentCode: "50000",
    },
  ] as const;

  for (const acc of accounts) {
    let parentId = null;
    if (acc.parentCode) {
      const parent = await prisma.account.findUnique({
        where: { code: acc.parentCode },
      });
      if (parent) {
        parentId = parent.id;
      }
    }

    await prisma.account.upsert({
      where: { code: acc.code },
      update: {
        name: acc.name,
        type: acc.type,
        normalBalance: acc.normalBalance,
        isPosting: acc.isPosting,
        level: acc.level,
        parentId,
      },
      create: {
        code: acc.code,
        name: acc.name,
        type: acc.type,
        normalBalance: acc.normalBalance,
        isPosting: acc.isPosting,
        level: acc.level,
        parentId,
      },
    });
  }

  console.log("Seeding completed.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
