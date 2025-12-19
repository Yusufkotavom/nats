import { PrismaClient, Role } from "@prisma/client";
import { hash } from "bcryptjs";

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

  // Seed User
  const password = await hash("password123", 10);

  const user = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {
      password,
    },
    create: {
      email: "admin@example.com",
      name: "Admin User",
      password,
      role: Role.superadmin,
    },
  });

  // Seed Customers
  const customers = [
    {
      name: "Acme Corp",
      email: "contact@acme.com",
      phone: "555-0100",
      address: "123 Business Rd, Tech City",
    },
    {
      name: "Global Industries",
      email: "info@globalind.com",
      phone: "555-0101",
      address: "456 Enterprise Blvd, Commerce City",
    },
    {
      name: "Local Shop",
      email: "support@localshop.com",
      phone: "555-0102",
      address: "789 Market St, Smalltown",
    },
  ];

  for (const customer of customers) {
    const existing = await prisma.customer.findFirst({
      where: { name: customer.name },
    });

    if (existing) {
      await prisma.customer.update({
        where: { id: existing.id },
        data: customer,
      });
    } else {
      await prisma.customer.create({
        data: customer,
      });
    }
  }

  // Seed Vendors
  const vendors = [
    {
      name: "Office Supplies Co",
      email: "sales@officesupplies.com",
      phone: "555-0200",
      address: "101 Paper Ln, Print City",
    },
    {
      name: "Tech Wholesalers",
      email: "orders@techwhole.com",
      phone: "555-0201",
      address: "202 Silicon Dr, Valley Town",
    },
    {
      name: "Maintenance Services Inc",
      email: "service@maintserv.com",
      phone: "555-0202",
      address: "303 Fix It Ave, Repair City",
    },
  ];

  for (const vendor of vendors) {
    const existing = await prisma.vendor.findFirst({
      where: { name: vendor.name },
    });

    if (existing) {
      await prisma.vendor.update({
        where: { id: existing.id },
        data: vendor,
      });
    } else {
      await prisma.vendor.create({
        data: vendor,
      });
    }
  }

  const getAccount = async (code: string) => {
    return prisma.account.findUnique({
      where: { code },
    });
  };

  const cashAccount = await getAccount("11100");
  const capitalAccount = await getAccount("31000");
  const revenueAccount = await getAccount("41000");
  const expenseAccount = await getAccount("51000");

  if (!cashAccount || !capitalAccount || !revenueAccount || !expenseAccount) {
    console.error("Required accounts not found for journal entry seeding.");
    return;
  }

  // Seed Journal Entries
  // 1. Initial Investment
  await prisma.journalEntry.upsert({
    where: { entryNumber: "JE-001" },
    update: {},
    create: {
      entryNumber: "JE-001",
      transactionDate: new Date("2024-01-01"),
      description: "Initial Capital Investment",
      status: "posted",
      userId: user.id,
      lines: {
        create: [
          {
            accountId: cashAccount.id,
            debitAmount: 100000,
            creditAmount: 0,
            lineNumber: 1,
            description: "Cash investment",
          },
          {
            accountId: capitalAccount.id,
            debitAmount: 0,
            creditAmount: 100000,
            lineNumber: 2,
            description: "Owner capital",
          },
        ],
      },
    },
  });

  // 2. Service Revenue
  await prisma.journalEntry.upsert({
    where: { entryNumber: "JE-002" },
    update: {},
    create: {
      entryNumber: "JE-002",
      transactionDate: new Date("2024-01-15"),
      description: "Service Revenue",
      status: "posted",
      userId: user.id,
      lines: {
        create: [
          {
            accountId: cashAccount.id,
            debitAmount: 5000,
            creditAmount: 0,
            lineNumber: 1,
            description: "Cash received",
          },
          {
            accountId: revenueAccount.id,
            debitAmount: 0,
            creditAmount: 5000,
            lineNumber: 2,
            description: "Service performed",
          },
        ],
      },
    },
  });

  // 3. Operating Expense
  await prisma.journalEntry.upsert({
    where: { entryNumber: "JE-003" },
    update: {},
    create: {
      entryNumber: "JE-003",
      transactionDate: new Date("2024-01-20"),
      description: "Office Supplies",
      status: "posted",
      userId: user.id,
      lines: {
        create: [
          {
            accountId: expenseAccount.id,
            debitAmount: 500,
            creditAmount: 0,
            lineNumber: 1,
            description: "Supplies purchased",
          },
          {
            accountId: cashAccount.id,
            debitAmount: 0,
            creditAmount: 500,
            lineNumber: 2,
            description: "Cash paid",
          },
        ],
      },
    },
  });

  // Generate 100 additional random transactions
  const descriptions = [
    "Consulting Service",
    "Product Sale",
    "Maintenance Service",
    "Subscription Fee",
    "Office Rent",
    "Utilities",
    "Internet Bill",
    "Office Supplies",
    "Travel Expense",
    "Software License",
  ];

  for (let i = 1; i <= 100; i++) {
    const entryNumber = `JE-GEN-${i.toString().padStart(3, "0")}`;
    const isRevenue = Math.random() > 0.5; // 50% chance of revenue vs expense
    const amount = Math.floor(Math.random() * 1000) + 50; // Random amount between 50 and 1050
    const description =
      descriptions[Math.floor(Math.random() * descriptions.length)];

    // Random date within 2024
    const month = Math.floor(Math.random() * 12);
    const day = Math.floor(Math.random() * 28) + 1;
    const date = new Date(2024, month, day);

    await prisma.journalEntry.upsert({
      where: { entryNumber },
      update: {},
      create: {
        entryNumber,
        transactionDate: date,
        description: `${description} #${i}`,
        status: "posted",
        userId: user.id,
        lines: {
          create: isRevenue
            ? [
                // Revenue: Debit Cash, Credit Revenue
                {
                  accountId: cashAccount.id,
                  debitAmount: amount,
                  creditAmount: 0,
                  lineNumber: 1,
                  description: "Cash received",
                },
                {
                  accountId: revenueAccount.id,
                  debitAmount: 0,
                  creditAmount: amount,
                  lineNumber: 2,
                  description: "Service performed",
                },
              ]
            : [
                // Expense: Debit Expense, Credit Cash
                {
                  accountId: expenseAccount.id,
                  debitAmount: amount,
                  creditAmount: 0,
                  lineNumber: 1,
                  description: "Expense incurred",
                },
                {
                  accountId: cashAccount.id,
                  debitAmount: 0,
                  creditAmount: amount,
                  lineNumber: 2,
                  description: "Cash paid",
                },
              ],
        },
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
