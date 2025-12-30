import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";

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
      code: "11110",
      name: "Bank - Main",
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
      isPosting: false,
      level: 1,
      parentCode: "40000",
    },
    {
      code: "41100",
      name: "Service Revenue",
      type: "revenue",
      normalBalance: "credit",
      isPosting: true,
      level: 2,
      parentCode: "41000",
    },
    {
      code: "41200",
      name: "Product Sales",
      type: "revenue",
      normalBalance: "credit",
      isPosting: true,
      level: 2,
      parentCode: "41000",
    },
    {
      code: "41300",
      name: "Consulting Income",
      type: "revenue",
      normalBalance: "credit",
      isPosting: true,
      level: 2,
      parentCode: "41000",
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
      isPosting: false,
      level: 1,
      parentCode: "50000",
    },
    {
      code: "51100",
      name: "Rent Expense",
      type: "expense",
      normalBalance: "debit",
      isPosting: true,
      level: 2,
      parentCode: "51000",
    },
    {
      code: "51200",
      name: "Utilities Expense",
      type: "expense",
      normalBalance: "debit",
      isPosting: true,
      level: 2,
      parentCode: "51000",
    },
    {
      code: "51300",
      name: "Office Supplies",
      type: "expense",
      normalBalance: "debit",
      isPosting: true,
      level: 2,
      parentCode: "51000",
    },
    {
      code: "51400",
      name: "Salaries and Wages",
      type: "expense",
      normalBalance: "debit",
      isPosting: true,
      level: 2,
      parentCode: "51000",
    },
    {
      code: "51500",
      name: "Software Subscriptions",
      type: "expense",
      normalBalance: "debit",
      isPosting: true,
      level: 2,
      parentCode: "51000",
    },
    {
      code: "51600",
      name: "Travel Expense",
      type: "expense",
      normalBalance: "debit",
      isPosting: true,
      level: 2,
      parentCode: "51000",
    },
    {
      code: "51700",
      name: "Marketing",
      type: "expense",
      normalBalance: "debit",
      isPosting: true,
      level: 2,
      parentCode: "51000",
    },
    {
      code: "51800",
      name: "Insurance Expense",
      type: "expense",
      normalBalance: "debit",
      isPosting: true,
      level: 2,
      parentCode: "51000",
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

  // Seed Roles
  const superAdminRole = await prisma.role.upsert({
    where: { name: "superadmin" },
    update: {},
    create: {
      name: "superadmin",
      description: "Super Administrator with full access",
      permissions: ["*"],
    },
  });

  const user = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {
      password,
    },
    create: {
      email: "admin@example.com",
      name: "Admin User",
      password,
      roleId: superAdminRole.id,
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

  // Seed Warehouses
  const warehouses = [
    {
      name: "Main Warehouse",
      location: "New York",
    },
    {
      name: "West Coast Hub",
      location: "Los Angeles",
    },
  ];

  for (const warehouse of warehouses) {
    await prisma.warehouse.upsert({
      where: { name: warehouse.name },
      update: {},
      create: {
        name: warehouse.name,
        location: warehouse.location,
      },
    });
  }

  // Seed Units
  const units = [
    { name: "Pieces", symbol: "PCS" },
    { name: "Box", symbol: "BOX" },
    { name: "Kilogram", symbol: "KG" },
  ];

  for (const unit of units) {
    await prisma.unit.upsert({
      where: { name: unit.name },
      update: {},
      create: {
        name: unit.name,
        symbol: unit.symbol,
      },
    });
  }

  // Seed Categories
  const categories = [
    { name: "Electronics", description: "Electronic devices and accessories" },
    { name: "Furniture", description: "Office and home furniture" },
    { name: "Office Supplies", description: "Paper, pens, and other supplies" },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: {},
      create: {
        name: category.name,
        description: category.description,
      },
    });
  }

  // Seed Company Profile
  const companyProfile = {
    name: "NATS Accounting",
    address: "123 Business Rd, Tech City",
    phone: "555-0100",
    email: "contact@nats.com",
    website: "https://nats.com",
    taxId: "123-456-789",
    currency: "USD",
    locale: "en-US",
    timezone: "UTC",
  };

  const existingProfile = await prisma.companyProfile.findFirst();
  if (!existingProfile) {
    await prisma.companyProfile.create({
      data: companyProfile,
    });
  }

  // Helper to get ID
  const getCategory = async (name: string) =>
    prisma.category.findUnique({ where: { name } });
  const getUnit = async (symbol: string) =>
    prisma.unit.findUnique({ where: { symbol } });
  const getWarehouse = async (name: string) =>
    prisma.warehouse.findUnique({ where: { name } });

  const catElectronics = await getCategory("Electronics");
  const catFurniture = await getCategory("Furniture");
  const catSupplies = await getCategory("Office Supplies");

  const unitPcs = await getUnit("PCS");
  const unitBox = await getUnit("BOX");

  const mainWarehouse = await getWarehouse("Main Warehouse");

  if (
    catElectronics &&
    catFurniture &&
    catSupplies &&
    unitPcs &&
    unitBox &&
    mainWarehouse
  ) {
    // Seed Products
    const products = [
      {
        sku: "ELEC-001",
        name: "Pro Laptop 15",
        description: "High performance laptop",
        categoryId: catElectronics.id,
        price: 1200,
        cost: 800,
        baseUnitId: unitPcs.id,
        minStock: 10,
      },
      {
        sku: "FURN-001",
        name: "Ergo Chair",
        description: "Ergonomic office chair",
        categoryId: catFurniture.id,
        price: 350,
        cost: 150,
        baseUnitId: unitPcs.id,
        minStock: 5,
      },
      {
        sku: "SUPP-001",
        name: "A4 Paper Ream",
        description: "Standard A4 paper, 500 sheets",
        categoryId: catSupplies.id,
        price: 5,
        cost: 2.5,
        baseUnitId: unitBox.id,
        minStock: 50,
      },
    ];

    for (const product of products) {
      const p = await prisma.product.upsert({
        where: { sku: product.sku },
        update: {},
        create: {
          sku: product.sku,
          name: product.name,
          description: product.description,
          categoryId: product.categoryId,
          price: product.price,
          cost: product.cost,
          baseUnitId: product.baseUnitId,
          minStock: product.minStock,
        },
      });

      // Seed Inventory for this product in Main Warehouse
      const inv = await prisma.inventory.findUnique({
        where: {
          productId_warehouseId_batchNumber: {
            productId: p.id,
            warehouseId: mainWarehouse.id,
            batchNumber: "INITIAL",
          },
        },
      });

      if (!inv) {
        await prisma.inventory.create({
          data: {
            productId: p.id,
            warehouseId: mainWarehouse.id,
            quantity: 100, // Initial stock
            reorderPoint: product.minStock,
            batchNumber: "INITIAL",
            unitCost: product.cost,
          },
        });
      }
    }
  }

  const getAccount = async (code: string) => {
    return prisma.account.findUnique({
      where: { code },
    });
  };

  const cashAccount = await getAccount("11100");
  const bankAccount = await getAccount("11110");
  const arAccount = await getAccount("11200");
  const apAccount = await getAccount("21100");
  const capitalAccount = await getAccount("31000");

  const revenueAccountCodes = ["41100", "41200", "41300"];
  const expenseAccountCodes = [
    "51100",
    "51200",
    "51300",
    "51400",
    "51500",
    "51600",
    "51700",
    "51800",
  ];

  const revenueAccounts = (
    await Promise.all(revenueAccountCodes.map(getAccount))
  ).filter((a): a is NonNullable<typeof a> => a !== null);
  const expenseAccounts = (
    await Promise.all(expenseAccountCodes.map(getAccount))
  ).filter((a): a is NonNullable<typeof a> => a !== null);

  if (
    !cashAccount ||
    !bankAccount ||
    !capitalAccount ||
    revenueAccounts.length === 0 ||
    expenseAccounts.length === 0
  ) {
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
      transactionDate: new Date("2025-01-01"),
      postedAt: new Date("2025-01-01"),
      description: "Initial Capital Investment",
      status: "posted",
      userId: user.id,
      lines: {
        create: [
          {
            accountId: bankAccount.id,
            debitAmount: 100000,
            creditAmount: 0,
            lineNumber: 1,
            description: "Cash investment to Bank",
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

  // 2. Service Revenue (Cash)
  await prisma.journalEntry.upsert({
    where: { entryNumber: "JE-002" },
    update: {},
    create: {
      entryNumber: "JE-002",
      transactionDate: new Date("2025-01-15"),
      postedAt: new Date("2025-01-15"),
      description: "Service Revenue - Consulting",
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
            accountId:
              revenueAccounts.find((a) => a.name.includes("Consulting"))?.id ||
              revenueAccounts[0].id,
            debitAmount: 0,
            creditAmount: 5000,
            lineNumber: 2,
            description: "Service performed",
          },
        ],
      },
    },
  });

  // 3. Operating Expense (Rent)
  await prisma.journalEntry.upsert({
    where: { entryNumber: "JE-003" },
    update: {},
    create: {
      entryNumber: "JE-003",
      transactionDate: new Date("2025-01-20"),
      postedAt: new Date("2025-01-20"),
      description: "Monthly Rent Payment",
      status: "posted",
      userId: user.id,
      lines: {
        create: [
          {
            accountId:
              expenseAccounts.find((a) => a.name.includes("Rent"))?.id ||
              expenseAccounts[0].id,
            debitAmount: 2000,
            creditAmount: 0,
            lineNumber: 1,
            description: "Rent Expense",
          },
          {
            accountId: bankAccount.id,
            debitAmount: 0,
            creditAmount: 2000,
            lineNumber: 2,
            description: "Bank transfer",
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
    "Marketing Campaign",
    "Client Lunch",
    "Insurance Premium",
  ];

  for (let i = 1; i <= 100; i++) {
    const entryNumber = `JE-GEN-${i.toString().padStart(3, "0")}`;
    const isRevenue = Math.random() > 0.4; // 60% revenue
    const amount = Math.floor(Math.random() * 2000) + 50;
    const description =
      descriptions[Math.floor(Math.random() * descriptions.length)];

    // Random date within 2025
    const month = Math.floor(Math.random() * 12);
    const day = Math.floor(Math.random() * 28) + 1;
    const date = new Date(2025, month, day);

    let debitAccount, creditAccount;

    if (isRevenue) {
      // Revenue Transaction
      const revenueAccount =
        revenueAccounts[Math.floor(Math.random() * revenueAccounts.length)];
      creditAccount = revenueAccount;

      // 70% chance Bank/Cash, 30% chance AR
      const isCash = Math.random() > 0.3;
      if (isCash) {
        debitAccount = Math.random() > 0.5 ? bankAccount : cashAccount;
      } else {
        debitAccount = arAccount || bankAccount; // Fallback to bank if AR missing (unlikely)
      }
    } else {
      // Expense Transaction
      const expenseAccount =
        expenseAccounts[Math.floor(Math.random() * expenseAccounts.length)];
      debitAccount = expenseAccount;

      // 80% chance Bank/Cash, 20% chance AP
      const isPaid = Math.random() > 0.2;
      if (isPaid) {
        creditAccount = Math.random() > 0.5 ? bankAccount : cashAccount;
      } else {
        creditAccount = apAccount || bankAccount;
      }
    }

    await prisma.journalEntry.upsert({
      where: { entryNumber },
      update: {},
      create: {
        entryNumber,
        transactionDate: date,
        postedAt: date,
        description: `${description} #${i}`,
        status: "posted",
        userId: user.id,
        lines: {
          create: [
            {
              accountId: debitAccount.id,
              debitAmount: amount,
              creditAmount: 0,
              lineNumber: 1,
              description: isRevenue ? "Payment/Receivable" : description,
            },
            {
              accountId: creditAccount.id,
              debitAmount: 0,
              creditAmount: amount,
              lineNumber: 2,
              description: isRevenue ? description : "Payment/Payable",
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
