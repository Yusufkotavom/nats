import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  PurchaseOrderStatus,
  PurchaseReceiveStatus,
  PurchaseInvoiceStatus,
  SalesOrderStatus,
  SalesShipmentStatus,
  SalesInvoiceStatus,
  ContactType,
  CashAccountType,
  DefaultAccountPurpose,
} from "@/prisma/generated/prisma/client";

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
      code: "11120",
      name: "Petty Cash",
      type: "asset",
      normalBalance: "debit",
      isPosting: true,
      level: 2,
      parentCode: "11000",
    },
    {
      code: "11130",
      name: "E-Wallet",
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
      code: "11300",
      name: "Inventory Asset",
      type: "asset",
      normalBalance: "debit",
      isPosting: true,
      level: 2,
      parentCode: "11000",
    },
    {
      code: "11400",
      name: "Purchase Tax Receivable",
      type: "asset",
      normalBalance: "debit",
      isPosting: true,
      level: 2,
      parentCode: "11000",
    },
    {
      code: "11900",
      name: "Uncategorized Asset",
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
      code: "21200",
      name: "Sales Tax Payable",
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
    {
      code: "32000",
      name: "Retained Earnings",
      type: "equity",
      normalBalance: "credit",
      isPosting: true,
      level: 1,
      parentCode: "30000",
    },
    {
      code: "33000",
      name: "Opening Balance Equity",
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
    {
      code: "42000",
      name: "Sales Discount",
      type: "revenue",
      normalBalance: "debit",
      isPosting: true,
      level: 2,
      parentCode: "40000",
    },
    {
      code: "49000",
      name: "Uncategorized Income",
      type: "revenue",
      normalBalance: "credit",
      isPosting: true,
      level: 2,
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
    {
      code: "52000",
      name: "Cost of Goods Sold",
      type: "expense",
      normalBalance: "debit",
      isPosting: true,
      level: 2,
      parentCode: "50000",
    },
    {
      code: "59000",
      name: "Uncategorized Expense",
      type: "expense",
      normalBalance: "debit",
      isPosting: true,
      level: 2,
      parentCode: "50000",
    },
    {
      code: "80000",
      name: "Other Expenses",
      type: "expense",
      normalBalance: "debit",
      isPosting: false,
      level: 0,
      parentCode: null,
    },
    {
      code: "81000",
      name: "Exchange Gain/Loss",
      type: "expense",
      normalBalance: "debit",
      isPosting: true,
      level: 1,
      parentCode: "80000",
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

  // Seed Cash Accounts
  console.log("Seeding Cash Accounts...");

  const cashAccountsData = [
    {
      name: "Main Cash Drawer",
      type: CashAccountType.CASH,
      glAccountCode: "11100", // Cash and Cash Equivalents
      description: "Main office cash drawer",
    },
    {
      name: "Main Bank Account",
      type: CashAccountType.BANK,
      glAccountCode: "11110", // Bank - Main
      accountNumber: "123-456-7890",
      bankName: "First National Bank",
      description: "Primary operating account",
    },
    {
      name: "Office Petty Cash",
      type: CashAccountType.PETTY_CASH,
      glAccountCode: "11120", // Petty Cash
      description: "Small expenses",
    },
    {
      name: "Digital Wallet",
      type: CashAccountType.EWALLET,
      glAccountCode: "11130", // E-Wallet
      bankName: "PayPal",
      accountNumber: "company@example.com",
      description: "Online payments",
    },
  ];

  for (const acc of cashAccountsData) {
    const glAccount = await prisma.account.findUnique({
      where: { code: acc.glAccountCode },
    });

    if (glAccount) {
      await prisma.cashAccount.upsert({
        where: { glAccountId: glAccount.id },
        update: {
          name: acc.name,
          type: acc.type,
          accountNumber: acc.accountNumber,
          bankName: acc.bankName,
          description: acc.description,
        },
        create: {
          name: acc.name,
          type: acc.type,
          accountNumber: acc.accountNumber,
          bankName: acc.bankName,
          description: acc.description,
          glAccountId: glAccount.id,
        },
      });
    }
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
      type: ContactType.CUSTOMER,
    },
    {
      name: "Global Industries",
      email: "info@globalind.com",
      phone: "555-0101",
      address: "456 Enterprise Blvd, Commerce City",
      type: ContactType.CUSTOMER,
    },
    {
      name: "Local Shop",
      email: "support@localshop.com",
      phone: "555-0102",
      address: "789 Market St, Smalltown",
      type: ContactType.CUSTOMER,
    },
  ];

  for (const customer of customers) {
    const existing = await prisma.contact.findFirst({
      where: { name: customer.name, type: ContactType.CUSTOMER },
    });

    if (existing) {
      await prisma.contact.update({
        where: { id: existing.id },
        data: customer,
      });
    } else {
      await prisma.contact.create({
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
      type: ContactType.VENDOR,
    },
    {
      name: "Tech Wholesalers",
      email: "orders@techwhole.com",
      phone: "555-0201",
      address: "202 Silicon Dr, Valley Town",
      type: ContactType.VENDOR,
    },
    {
      name: "Maintenance Services Inc",
      email: "service@maintserv.com",
      phone: "555-0202",
      address: "303 Fix It Ave, Repair City",
      type: ContactType.VENDOR,
    },
  ];

  for (const vendor of vendors) {
    const existing = await prisma.contact.findFirst({
      where: { name: vendor.name, type: ContactType.VENDOR },
    });

    if (existing) {
      await prisma.contact.update({
        where: { id: existing.id },
        data: vendor,
      });
    } else {
      await prisma.contact.create({
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

  // Seed Purchase Transactions
  const allVendors = await prisma.contact.findMany({
    where: { type: ContactType.VENDOR },
  });
  const allProducts = await prisma.product.findMany();
  const warehouseForPurchase = await prisma.warehouse.findFirst({
    where: { name: "Main Warehouse" },
  });

  if (allVendors.length > 0 && allProducts.length > 0 && warehouseForPurchase) {
    console.log("Seeding Purchase Orders...");

    // Create 20 Purchase Orders
    for (let i = 1; i <= 20; i++) {
      const vendor = allVendors[Math.floor(Math.random() * allVendors.length)];
      const orderNumber = `PO-${new Date().getFullYear()}-${i
        .toString()
        .padStart(3, "0")}`;

      // Determine Status
      const statuses = Object.values(PurchaseOrderStatus);
      const status = statuses[Math.floor(Math.random() * statuses.length)];

      // Select random products (1-5 items)
      const numItems = Math.floor(Math.random() * 5) + 1;
      const orderItems = [];
      let totalAmount = 0;

      for (let j = 0; j < numItems; j++) {
        const product =
          allProducts[Math.floor(Math.random() * allProducts.length)];
        const quantity = Math.floor(Math.random() * 50) + 1;
        const unitCost = Number(product.cost); // Use product cost as base
        const totalCost = quantity * unitCost;

        orderItems.push({
          productId: product.id,
          quantity,
          unitCost,
          totalCost,
          receivedQuantity:
            status === PurchaseOrderStatus.CLOSED ||
              status === PurchaseOrderStatus.PARTIALLY_RECEIVED
              ? status === PurchaseOrderStatus.CLOSED
                ? quantity
                : Math.floor(quantity / 2)
              : 0,
        });

        totalAmount += totalCost;
      }

      const po = await prisma.purchaseOrder.upsert({
        where: { orderNumber },
        update: {},
        create: {
          orderNumber,
          contactId: vendor.id,
          status,
          totalAmount,
          orderDate: new Date(),
          items: {
            create: orderItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitCost: item.unitCost,
              totalCost: item.totalCost,
              receivedQuantity: item.receivedQuantity,
            })),
          },
        },
      });

      // Create Receive for Closed/Partially Received
      if (
        status === PurchaseOrderStatus.CLOSED ||
        status === PurchaseOrderStatus.PARTIALLY_RECEIVED
      ) {
        const receiveNumber = `PR-${po.orderNumber}`;
        const receiveStatus =
          status === PurchaseOrderStatus.CLOSED
            ? PurchaseReceiveStatus.COMPLETED
            : PurchaseReceiveStatus.DRAFT;

        await prisma.purchaseReceive.upsert({
          where: { receiveNumber },
          update: {},
          create: {
            receiveNumber,
            purchaseOrderId: po.id,
            contactId: vendor.id,
            status: receiveStatus,
            receiveDate: new Date(),
            items: {
              create: orderItems.map((item) => ({
                productId: item.productId,
                quantity: item.receivedQuantity,
              })),
            },
          },
        });

        // Create Invoice for Closed POs
        if (status === PurchaseOrderStatus.CLOSED) {
          const invoiceNumber = `INV-${po.orderNumber}`;
          await prisma.purchaseInvoice.upsert({
            where: {
              contactId_invoiceNumber: {
                contactId: vendor.id,
                invoiceNumber,
              },
            },
            update: {},
            create: {
              invoiceNumber,
              contactId: vendor.id,
              purchaseOrderId: po.id,
              invoiceDate: new Date(),
              dueDate: new Date(new Date().setDate(new Date().getDate() + 30)),
              status: PurchaseInvoiceStatus.BILLED,
              totalAmount: po.totalAmount,
              items: {
                create: orderItems.map((item) => ({
                  description: `Item from ${po.orderNumber}`,
                  quantity: item.quantity,
                  unitPrice: item.unitCost,
                  totalPrice: item.totalCost,
                })),
              },
            },
          });
        }
      }
    }
  }

  // Seed Sales Transactions
  const allCustomers = await prisma.contact.findMany({
    where: { type: ContactType.CUSTOMER },
  });

  if (allCustomers.length > 0 && allProducts.length > 0) {
    console.log("Seeding Sales Orders...");

    // Create 20 Sales Orders
    for (let i = 1; i <= 20; i++) {
      const customer =
        allCustomers[Math.floor(Math.random() * allCustomers.length)];
      const orderNumber = `SO-${new Date().getFullYear()}-${i
        .toString()
        .padStart(3, "0")}`;

      // Determine Status
      const statuses = Object.values(SalesOrderStatus);
      const status = statuses[Math.floor(Math.random() * statuses.length)];

      // Select random products (1-5 items)
      const numItems = Math.floor(Math.random() * 5) + 1;
      const orderItems = [];
      let totalAmount = 0;
      let subtotal = 0;
      let taxAmount = 0;

      for (let j = 0; j < numItems; j++) {
        const product =
          allProducts[Math.floor(Math.random() * allProducts.length)];
        const quantity = Math.floor(Math.random() * 20) + 1;
        const unitPrice = Number(product.price);
        const totalPrice = quantity * unitPrice;

        // Simple tax calculation (e.g., 10%)
        const taxRate = 0.1;
        const itemTax = totalPrice * taxRate;

        orderItems.push({
          productId: product.id,
          quantity,
          unitPrice,
          totalPrice,
          taxRate: taxRate * 100, // percentage
          shippedQuantity:
            status === SalesOrderStatus.CLOSED ||
              status === SalesOrderStatus.SHIPPED
              ? quantity
              : status === SalesOrderStatus.PARTIALLY_SHIPPED
                ? Math.floor(quantity / 2)
                : 0,
        });

        subtotal += totalPrice;
        taxAmount += itemTax;
      }

      totalAmount = subtotal + taxAmount;

      const so = await prisma.salesOrder.upsert({
        where: { orderNumber },
        update: {},
        create: {
          orderNumber,
          contactId: customer.id,
          status,
          totalAmount,
          subtotal,
          taxAmount,
          orderDate: new Date(),
          items: {
            create: orderItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              taxRate: item.taxRate,
              shippedQuantity: item.shippedQuantity,
            })),
          },
        },
      });

      // Create Shipment for Closed/Shipped/Partially Shipped
      if (
        status === SalesOrderStatus.CLOSED ||
        status === SalesOrderStatus.SHIPPED ||
        status === SalesOrderStatus.PARTIALLY_SHIPPED
      ) {
        const shipmentNumber = `SH-${so.orderNumber}`;
        const shipmentStatus =
          status === SalesOrderStatus.CLOSED ||
            status === SalesOrderStatus.SHIPPED
            ? SalesShipmentStatus.COMPLETED
            : SalesShipmentStatus.DRAFT;

        await prisma.salesShipment.upsert({
          where: { shipmentNumber },
          update: {},
          create: {
            shipmentNumber,
            salesOrderId: so.id,
            contactId: customer.id,
            status: shipmentStatus,
            shipmentDate: new Date(),
            items: {
              create: orderItems.map((item) => ({
                productId: item.productId,
                quantity: item.shippedQuantity,
              })),
            },
          },
        });

        // Create Invoice for Closed/Shipped SOs
        if (
          status === SalesOrderStatus.CLOSED ||
          status === SalesOrderStatus.SHIPPED
        ) {
          const invoiceNumber = `SINV-${so.orderNumber}`;
          await prisma.salesInvoice.upsert({
            where: {
              invoiceNumber,
            },
            update: {},
            create: {
              invoiceNumber,
              contactId: customer.id,
              salesOrderId: so.id,
              invoiceDate: new Date(),
              dueDate: new Date(new Date().setDate(new Date().getDate() + 30)),
              status: SalesInvoiceStatus.ISSUED,
              totalAmount: so.totalAmount,
              subtotal: so.subtotal,
              totalTax: so.taxAmount,
              balanceDue: so.totalAmount,
              items: {
                create: orderItems.map((item) => ({
                  description: `Item from ${so.orderNumber}`,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  totalPrice: item.totalPrice,
                  tax: item.totalPrice * (item.taxRate / 100),
                  productId: item.productId,
                })),
              },
            },
          });
        }
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
  // Prepare for running balance calculation
  const allAccounts = await prisma.account.findMany();
  const accountMap = new Map(allAccounts.map((a) => [a.id, a]));
  const accountBalances: Record<string, number> = {}; // accountId -> balance

  const entries: {
    entryNumber: string;
    date: Date;
    description: string;
    lines: {
      accountId: string;
      debit: number;
      credit: number;
      description: string;
    }[];
  }[] = [];

  // 1. Initial Investment
  entries.push({
    entryNumber: "JE-001",
    date: new Date("2025-01-01"),
    description: "Initial Capital Investment",
    lines: [
      {
        accountId: bankAccount.id,
        debit: 100000,
        credit: 0,
        description: "Cash investment to Bank",
      },
      {
        accountId: capitalAccount.id,
        debit: 0,
        credit: 100000,
        description: "Owner capital",
      },
    ],
  });

  // 2. Service Revenue (Cash)
  entries.push({
    entryNumber: "JE-002",
    date: new Date("2025-01-15"),
    description: "Service Revenue - Consulting",
    lines: [
      {
        accountId: cashAccount.id,
        debit: 5000,
        credit: 0,
        description: "Cash received",
      },
      {
        accountId:
          revenueAccounts.find((a) => a.name.includes("Consulting"))?.id ||
          revenueAccounts[0].id,
        debit: 0,
        credit: 5000,
        description: "Service performed",
      },
    ],
  });

  // 3. Operating Expense (Rent)
  entries.push({
    entryNumber: "JE-003",
    date: new Date("2025-01-20"),
    description: "Monthly Rent Payment",
    lines: [
      {
        accountId:
          expenseAccounts.find((a) => a.name.includes("Rent"))?.id ||
          expenseAccounts[0].id,
        debit: 2000,
        credit: 0,
        description: "Rent Expense",
      },
      {
        accountId: bankAccount.id,
        debit: 0,
        credit: 2000,
        description: "Bank transfer",
      },
    ],
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

    entries.push({
      entryNumber,
      date,
      description: `${description} #${i}`,
      lines: [
        {
          accountId: debitAccount.id,
          debit: amount,
          credit: 0,
          description: isRevenue ? "Payment/Receivable" : description,
        },
        {
          accountId: creditAccount.id,
          debit: 0,
          credit: amount,
          description: isRevenue ? description : "Payment/Payable",
        },
      ],
    });
  }

  // Sort entries by date to ensure correct running balance calculation
  entries.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Insert entries
  for (const entry of entries) {
    const linesCreate = [];

    for (let j = 0; j < entry.lines.length; j++) {
      const line = entry.lines[j];
      const account = accountMap.get(line.accountId);

      let runningBalance = 0;
      if (account) {
        const currentBalance = accountBalances[line.accountId] || 0;
        if (account.normalBalance === "credit") {
          runningBalance = currentBalance - line.debit + line.credit;
        } else {
          runningBalance = currentBalance + line.debit - line.credit;
        }
        accountBalances[line.accountId] = runningBalance;
      }

      linesCreate.push({
        accountId: line.accountId,
        debitAmount: line.debit,
        creditAmount: line.credit,
        lineNumber: j + 1,
        description: line.description,
        runningBalance: runningBalance,
      });
    }

    await prisma.journalEntry.upsert({
      where: { entryNumber: entry.entryNumber },
      update: {
        transactionDate: entry.date,
        postedAt: entry.date,
        description: entry.description,
        status: "posted",
        lines: {
          deleteMany: {},
          create: linesCreate,
        },
      },
      create: {
        entryNumber: entry.entryNumber,
        transactionDate: entry.date,
        postedAt: entry.date,
        description: entry.description,
        status: "posted",
        userId: user.id,
        lines: {
          create: linesCreate,
        },
      },
    });
  }

  // Seed Default Accounts
  console.log("Seeding Default Accounts...");
  const defaultAccountMappings: { purpose: DefaultAccountPurpose; code: string }[] =
    [
      { purpose: DefaultAccountPurpose.ACCOUNTS_RECEIVABLE, code: "11200" },
      { purpose: DefaultAccountPurpose.ACCOUNTS_PAYABLE, code: "21100" },
      { purpose: DefaultAccountPurpose.INVENTORY_ASSET, code: "11300" },
      { purpose: DefaultAccountPurpose.COGS, code: "52000" },
      { purpose: DefaultAccountPurpose.SALES_REVENUE, code: "41200" }, // Product Sales
      { purpose: DefaultAccountPurpose.SALES_DISCOUNT, code: "42000" },
      { purpose: DefaultAccountPurpose.SALES_TAX_PAYABLE, code: "21200" },
      { purpose: DefaultAccountPurpose.PURCHASE_TAX_RECEIVABLE, code: "11400" },
      { purpose: DefaultAccountPurpose.CASH_ON_HAND, code: "11120" }, // Petty Cash
      { purpose: DefaultAccountPurpose.BANK, code: "11110" }, // Bank - Main
      { purpose: DefaultAccountPurpose.OPENING_BALANCE_EQUITY, code: "33000" },
      { purpose: DefaultAccountPurpose.RETAINED_EARNINGS, code: "32000" },
      { purpose: DefaultAccountPurpose.UNCATEGORIZED_EXPENSE, code: "59000" },
      { purpose: DefaultAccountPurpose.UNCATEGORIZED_INCOME, code: "49000" },
      { purpose: DefaultAccountPurpose.UNCATEGORIZED_ASSET, code: "11900" },
      { purpose: DefaultAccountPurpose.EXCHANGE_GAIN_LOSS, code: "81000" },
    ];

  for (const mapping of defaultAccountMappings) {
    const account = await prisma.account.findUnique({
      where: { code: mapping.code },
    });

    if (account) {
      // Deactivate existing default account for this purpose if any (to ensure only one is active)
      await prisma.defaultAccount.updateMany({
        where: { purpose: mapping.purpose, isActive: true },
        data: { isActive: false },
      });

      // Create new active default account
      await prisma.defaultAccount.create({
        data: {
          purpose: mapping.purpose,
          accountId: account.id,
          isActive: true,
        },
      });
    } else {
      console.warn(
        `Account code ${mapping.code} not found for purpose ${mapping.purpose}`
      );
    }
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
