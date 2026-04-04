import { managementPrisma } from "@/lib/prisma/management";
import { getTenantPrismaClient } from "@/lib/prisma/tenant-resolver";
import { PrismaClient } from "@/prisma/generated/prisma/client";
import { Decimal } from "decimal.js";
import { ContactType, AccountType, NormalBalance, DefaultAccountPurpose, CashAccountType, SalesOrderStatus, SalesInvoiceStatus, PurchaseOrderStatus, EntryStatus, CashTransactionType, CashTransactionStatus, ProductionOrderStatus, EmploymentStatus, Gender, MaritalStatus, SalaryComponentType, PayrollPeriodStatus, SalarySlipStatus, AssetStatus, DepreciationMethod } from "@/prisma/generated/prisma/client";

export async function seedDemoDatabase(tenantId: string, adminUserId: string) {
    console.log(`Starting Demo Data Seeding for Tenant: ${tenantId}`);

    // 1. Get Tenant Prisma Client
    const prisma = await getTenantPrismaClient(tenantId);

    try {
        await seedCompanyProfile(prisma);
        await seedAccounting(prisma);
        await seedInventory(prisma);
        await seedContacts(prisma);
        await seedTransactions(prisma, adminUserId);
        await seedCashTransactions(prisma, adminUserId);
        await seedProduction(prisma, adminUserId);
        await seedHRPayroll(prisma, adminUserId);
        await seedFixedAssets(prisma, adminUserId);

        console.log(`✅ Demo data seeded successfully for Tenant: ${tenantId}`);
    } catch (error) {
        console.error(`❌ Failed to seed demo data for Tenant ${tenantId}:`, error);
        throw error;
    }
}

async function seedCompanyProfile(prisma: PrismaClient) {
    console.log("Seeding Company Profile...");
    const profile = await prisma.companyProfile.findFirst();
    if (!profile) {
        await prisma.companyProfile.create({
            data: {
                name: "NATS Demo Company",
                address: "123 Demo St, Tech City",
                phone: "1-800-DEMO-123",
                email: "demo@nats-accounting.com",
                website: "https://nats-accounting.com",
                taxId: "DMO-987-654",
                currency: "USD",
                currencySymbol: "$",
                dateFormat: "MM/dd/yyyy",
                currencyFormat: "standard",
                locale: "en-US",
                timezone: "UTC",
            }
        });
    }
}

async function seedAccounting(prisma: PrismaClient) {
    console.log("Seeding Accounting Data...");
    // 1. Setup minimal chart of accounts for demo
    const accounts = [
        { code: "10000", name: "Assets", type: AccountType.asset, normalBalance: NormalBalance.debit, isPosting: false, level: 0, parentCode: null },
        { code: "11000", name: "Current Assets", type: AccountType.asset, normalBalance: NormalBalance.debit, isPosting: false, level: 1, parentCode: "10000" },
        { code: "11100", name: "Cash and Cash Equivalents", type: AccountType.asset, normalBalance: NormalBalance.debit, isPosting: true, level: 2, parentCode: "11000" },
        { code: "11110", name: "Bank - Main", type: AccountType.asset, normalBalance: NormalBalance.debit, isPosting: true, level: 2, parentCode: "11000" },
        { code: "11200", name: "Accounts Receivable", type: AccountType.asset, normalBalance: NormalBalance.debit, isPosting: true, level: 2, parentCode: "11000" },
        { code: "11300", name: "Inventory Asset", type: AccountType.asset, normalBalance: NormalBalance.debit, isPosting: true, level: 2, parentCode: "11000" },
        { code: "20000", name: "Liabilities", type: AccountType.liability, normalBalance: NormalBalance.credit, isPosting: false, level: 0, parentCode: null },
        { code: "21000", name: "Current Liabilities", type: AccountType.liability, normalBalance: NormalBalance.credit, isPosting: false, level: 1, parentCode: "20000" },
        { code: "21100", name: "Accounts Payable", type: AccountType.liability, normalBalance: NormalBalance.credit, isPosting: true, level: 2, parentCode: "21000" },
        { code: "30000", name: "Equity", type: AccountType.equity, normalBalance: NormalBalance.credit, isPosting: false, level: 0, parentCode: null },
        { code: "31000", name: "Capital", type: AccountType.equity, normalBalance: NormalBalance.credit, isPosting: true, level: 1, parentCode: "30000" },
        { code: "32000", name: "Retained Earnings", type: AccountType.equity, normalBalance: NormalBalance.credit, isPosting: true, level: 1, parentCode: "30000" },
        { code: "33000", name: "Opening Balance Equity", type: AccountType.equity, normalBalance: NormalBalance.credit, isPosting: true, level: 1, parentCode: "30000" },
        { code: "40000", name: "Revenue", type: AccountType.revenue, normalBalance: NormalBalance.credit, isPosting: false, level: 0, parentCode: null },
        { code: "41000", name: "Operating Revenue", type: AccountType.revenue, normalBalance: NormalBalance.credit, isPosting: false, level: 1, parentCode: "40000" },
        { code: "41200", name: "Product Sales", type: AccountType.revenue, normalBalance: NormalBalance.credit, isPosting: true, level: 2, parentCode: "41000" },
        { code: "50000", name: "Expenses", type: AccountType.expense, normalBalance: NormalBalance.debit, isPosting: false, level: 0, parentCode: null },
        { code: "51000", name: "Operating Expenses", type: AccountType.expense, normalBalance: NormalBalance.debit, isPosting: false, level: 1, parentCode: "50000" },
        { code: "51300", name: "Office Supplies", type: AccountType.expense, normalBalance: NormalBalance.debit, isPosting: true, level: 2, parentCode: "51000" },
        { code: "52000", name: "Cost of Goods Sold", type: AccountType.expense, normalBalance: NormalBalance.debit, isPosting: true, level: 2, parentCode: "50000" },
    ];

    for (const acc of accounts) {
        let parentId = null;
        if (acc.parentCode) {
            const parent = await prisma.account.findUnique({ where: { code: acc.parentCode } });
            if (parent) parentId = parent.id;
        }
        await prisma.account.upsert({
            where: { code: acc.code },
            update: { name: acc.name, type: acc.type, normalBalance: acc.normalBalance, isPosting: acc.isPosting, level: acc.level, parentId },
            create: { code: acc.code, name: acc.name, type: acc.type, normalBalance: acc.normalBalance, isPosting: acc.isPosting, level: acc.level, parentId },
        });
    }

    // 2. Default Accounts
    const defaultAccounts = [
        { purpose: DefaultAccountPurpose.ACCOUNTS_RECEIVABLE, code: "11200" },
        { purpose: DefaultAccountPurpose.ACCOUNTS_PAYABLE, code: "21100" },
        { purpose: DefaultAccountPurpose.INVENTORY_ASSET, code: "11300" },
        { purpose: DefaultAccountPurpose.COGS, code: "52000" },
        { purpose: DefaultAccountPurpose.SALES_REVENUE, code: "41200" },
        { purpose: DefaultAccountPurpose.CASH_ON_HAND, code: "11100" },
        { purpose: DefaultAccountPurpose.BANK, code: "11110" },
        { purpose: DefaultAccountPurpose.OPENING_BALANCE_EQUITY, code: "33000" },
        { purpose: DefaultAccountPurpose.RETAINED_EARNINGS, code: "32000" },
    ];

    for (const fa of defaultAccounts) {
        const acc = await prisma.account.findUnique({ where: { code: fa.code } });
        if (acc) {
            const existing = await prisma.defaultAccount.findFirst({ where: { purpose: fa.purpose } });
            if (existing) {
                await prisma.defaultAccount.update({ where: { id: existing.id }, data: { accountId: acc.id } });
            } else {
                await prisma.defaultAccount.create({ data: { purpose: fa.purpose, accountId: acc.id, isActive: true } });
            }
        }
    }

    // 3. Tax Rates
    await prisma.taxRate.upsert({
        where: { code: "VAT-S" },
        update: {},
        create: { code: "VAT-S", name: "Standard VAT", rate: new Decimal(10.0), description: "Standard Rate 10%" },
    });
}

async function seedInventory(prisma: PrismaClient) {
    console.log("Seeding Inventory Data (100+ items)...");
    const warehouse = await prisma.warehouse.upsert({
        where: { name: "Demo Main Warehouse" },
        update: {},
        create: { name: "Demo Main Warehouse", location: "Demo City" }
    });

    const unitPcs = await prisma.unit.upsert({
        where: { name: "Pieces" },
        update: {},
        create: { name: "Pieces", symbol: "PCS" }
    });

    const categories = ["Electronics", "Furniture", "Office Supplies", "Clothing", "Groceries"];
    const catMap: Record<string, string> = {};
    for (const cat of categories) {
        const createdCat = await prisma.category.upsert({
            where: { name: cat },
            update: {},
            create: { name: cat, description: `${cat} generic category` }
        });
        catMap[cat] = createdCat.id;
    }

    // Generate 120 products
    for (let i = 1; i <= 120; i++) {
        const catName = categories[i % categories.length];
        const categoryId = catMap[catName];
        const sku = `PROD-${String(i).padStart(4, '0')}`;
        const name = `${catName} Item ${i}`;
        const cost = Math.floor(Math.random() * 500) + 10;
        const price = Math.floor(cost * (1 + Math.random()));
        const stock = Math.floor(Math.random() * 200) + 20;

        const product = await prisma.product.upsert({
            where: { sku },
            update: {},
            create: {
                sku, name, description: name,
                categoryId, price, cost,
                baseUnitId: unitPcs.id, minStock: 10
            }
        });

        const inventoryItem = await prisma.inventory.findFirst({
            where: { warehouseId: warehouse.id, productId: product.id }
        });

        if (!inventoryItem) {
            await prisma.inventory.create({
                data: {
                    warehouseId: warehouse.id,
                    productId: product.id,
                    quantity: stock,
                    unitCost: new Decimal(cost),
                    reorderPoint: 10
                }
            });
        }
    }
}

async function seedContacts(prisma: PrismaClient) {
    console.log("Seeding Contacts (100+ items)...");

    // Generate 60 Customers and 50 Vendors
    for (let i = 1; i <= 60; i++) {
        const name = `Customer Corp ${i}`;
        const email = `customer${i}@demo.com`;
        await upsertContact(prisma, name, email, ContactType.CUSTOMER);
    }

    for (let i = 1; i <= 50; i++) {
        const name = `Vendor Supplies ${i}`;
        const email = `vendor${i}@demo.com`;
        await upsertContact(prisma, name, email, ContactType.VENDOR);
    }
}

async function upsertContact(prisma: PrismaClient, name: string, email: string, type: ContactType) {
    const existing = await prisma.contact.findFirst({ where: { name } });
    if (existing) {
        await prisma.contact.update({ where: { id: existing.id }, data: { name, email, phone: "555-0100", address: "123 Business Rd", type } });
    } else {
        await prisma.contact.create({ data: { name, email, phone: "555-0100", address: "123 Business Rd", type } });
    }
}

async function seedTransactions(prisma: PrismaClient, adminUserId: string) {
    console.log("Seeding Transactions (100+ items)...");

    // Document Numbering
    const productionDocTypes = [
        { entityType: "BILL_OF_MATERIAL", name: "Bill of Material", prefix: "BOM-" },
        { entityType: "PRODUCTION_ORDER", name: "Production Order", prefix: "MO-" },
        { entityType: "PRODUCTION_ISSUE", name: "Production Issue", prefix: "PI-" },
        { entityType: "PRODUCTION_RECEIPT", name: "Production Receipt", prefix: "PR-" },
    ];
    for (const docType of productionDocTypes) {
        await prisma.documentNumbering.upsert({
            where: { entityType: docType.entityType },
            update: {},
            create: {
                entityType: docType.entityType,
                name: docType.name, prefix: docType.prefix,
                sequenceDigits: 5, includeYear: true, yearFormat: "YYYY", includeMonth: true, resetYearly: true, resetMonthly: false,
            },
        });
    }

    const customers = await prisma.contact.findMany({ where: { type: ContactType.CUSTOMER } });
    const vendors = await prisma.contact.findMany({ where: { type: ContactType.VENDOR } });
    const products = await prisma.product.findMany();
    const bankAccount = await prisma.account.findFirst({ where: { code: "11110" } });
    const salesAccount = await prisma.account.findFirst({ where: { code: "41200" } });
    const expenseAccount = await prisma.account.findFirst({ where: { code: "51300" } });

    if (customers.length === 0 || vendors.length === 0 || products.length === 0 || !bankAccount || !salesAccount || !expenseAccount) {
        console.warn("Dependencies missing for massive transaction seeding. Skipping.");
        return;
    }

    // Generate 100 Sales Orders
    for (let i = 1; i <= 100; i++) {
        const orderNumber = `SO-DEMO-${String(i).padStart(4, '0')}`;
        const soExists = await prisma.salesOrder.findUnique({ where: { orderNumber } });

        if (!soExists) {
            const customer = customers[i % customers.length];
            // 1 to 5 random products per order
            const itemCount = Math.floor(Math.random() * 5) + 1;
            const items = [];
            let totalAmount = 0;

            for (let j = 0; j < itemCount; j++) {
                const product = products[(i + j) % products.length];
                const quantity = Math.floor(Math.random() * 10) + 1;
                const unitPrice = parseFloat(product.price.toString());
                const totalPrice = quantity * unitPrice;
                totalAmount += totalPrice;

                items.push({
                    productId: product.id,
                    quantity,
                    unitPrice: new Decimal(unitPrice),
                    totalPrice: new Decimal(totalPrice)
                });
            }

            const orderDate = new Date();
            orderDate.setDate(orderDate.getDate() - Math.floor(Math.random() * 90)); // Random date in last 90 days

            await prisma.salesOrder.create({
                data: {
                    orderNumber,
                    contactId: customer.id,
                    orderDate,
                    status: i % 3 === 0 ? SalesOrderStatus.CLOSED : SalesOrderStatus.CONFIRMED,
                    totalAmount: new Decimal(totalAmount),
                    subtotal: new Decimal(totalAmount),
                    createdById: adminUserId,
                    items: {
                        create: items
                    }
                }
            });
        }
    }

    // Generate 50 Purchase Orders
    for (let i = 1; i <= 50; i++) {
        const orderNumber = `PO-DEMO-${String(i).padStart(4, '0')}`;
        const poExists = await prisma.purchaseOrder.findUnique({ where: { orderNumber } });

        if (!poExists) {
            const vendor = vendors[i % vendors.length];
            const itemCount = Math.floor(Math.random() * 3) + 1;
            const items = [];
            let totalAmount = 0;

            for (let j = 0; j < itemCount; j++) {
                const product = products[(i * j + 1) % products.length];
                const quantity = Math.floor(Math.random() * 50) + 10;
                const unitPrice = parseFloat(product.cost.toString());
                const totalPrice = quantity * unitPrice;
                totalAmount += totalPrice;

                items.push({
                    productId: product.id,
                    quantity,
                    unitCost: new Decimal(unitPrice),
                    totalCost: new Decimal(totalPrice)
                });
            }

            const orderDate = new Date();
            orderDate.setDate(orderDate.getDate() - Math.floor(Math.random() * 90));

            await prisma.purchaseOrder.create({
                data: {
                    orderNumber,
                    contactId: vendor.id,
                    orderDate,
                    status: i % 2 === 0 ? PurchaseOrderStatus.CLOSED : PurchaseOrderStatus.ISSUED,
                    totalAmount: new Decimal(totalAmount),
                    createdById: adminUserId,
                    items: {
                        create: items
                    }
                }
            });
        }
    }

    // Generate 50 Journal Entries to populate general ledger dashboards
    for (let i = 1; i <= 50; i++) {
        const entryNumber = `JE-DEMO-${String(i).padStart(4, '0')}`;
        const jeExists = await prisma.journalEntry.findUnique({ where: { entryNumber } });

        if (!jeExists) {
            const amount = Math.floor(Math.random() * 5000) + 100;
            const transactionDate = new Date();
            transactionDate.setDate(transactionDate.getDate() - Math.floor(Math.random() * 90));

            const isRevenue = i % 2 === 0;

            await prisma.journalEntry.create({
                data: {
                    entryNumber,
                    transactionDate,
                    description: isRevenue ? `Daily Sales Entry ${i}` : `Operating Expense Entry ${i}`,
                    status: EntryStatus.posted,
                    userId: adminUserId,
                    lines: {
                        create: [
                            {
                                accountId: bankAccount.id,
                                debitAmount: new Decimal(isRevenue ? amount : 0),
                                creditAmount: new Decimal(isRevenue ? 0 : amount),
                                lineNumber: 1,
                                description: isRevenue ? 'Cash Received' : 'Cash Paid'
                            },
                            {
                                accountId: isRevenue ? salesAccount.id : expenseAccount.id,
                                debitAmount: new Decimal(isRevenue ? 0 : amount),
                                creditAmount: new Decimal(isRevenue ? amount : 0),
                                lineNumber: 2,
                                description: isRevenue ? 'Sales Revenue' : 'General Expense'
                            }
                        ]
                    }
                }
            });
        }
    }
}

async function seedCashTransactions(prisma: PrismaClient, adminUserId: string) {
    console.log("Seeding Cash Transactions (50+ items)...");
    const bankAccount = await prisma.account.findFirst({ where: { code: "11110" } });
    const cashGlAccount = await prisma.account.findFirst({ where: { code: "11100" } });
    if (!bankAccount || !cashGlAccount) return;

    const mainBank = await prisma.cashAccount.upsert({
        where: { glAccountId: bankAccount.id },
        update: {},
        create: { name: "Main Bank Account", type: CashAccountType.BANK, glAccountId: bankAccount.id }
    });

    const pettyCash = await prisma.cashAccount.upsert({
        where: { glAccountId: cashGlAccount.id },
        update: {},
        create: { name: "Petty Cash", type: CashAccountType.CASH, glAccountId: cashGlAccount.id }
    });

    const expenseAccount = await prisma.account.findFirst({ where: { code: "51300" } });
    if (!expenseAccount) return;

    for (let i = 1; i <= 50; i++) {
        const reference = `CTX-DEMO-${String(i).padStart(4, '0')}`;
        const transactionDate = new Date();
        transactionDate.setDate(transactionDate.getDate() - Math.floor(Math.random() * 90));

        // Randomly split between Bank and Petty Cash, mostly Income or Expense
        const isExpense = Math.random() > 0.3;
        const amount = Math.floor(Math.random() * 500) + 10;

        const journalEntryResult = await prisma.journalEntry.create({
            data: {
                entryNumber: `JE-CTX-${String(i).padStart(4, '0')}`,
                transactionDate,
                description: isExpense ? 'Office Expense via Cash' : 'Miscellaneous Income',
                status: EntryStatus.posted,
                userId: adminUserId,
                lines: {
                    create: [
                        {
                            accountId: mainBank.glAccountId,
                            debitAmount: new Decimal(isExpense ? 0 : amount),
                            creditAmount: new Decimal(isExpense ? amount : 0),
                            lineNumber: 1,
                            description: 'Cash Impact'
                        },
                        {
                            accountId: expenseAccount.id,
                            debitAmount: new Decimal(isExpense ? amount : 0),
                            creditAmount: new Decimal(isExpense ? 0 : amount),
                            lineNumber: 2,
                            description: 'Expense Impact'
                        }
                    ]
                }
            }
        });

        await prisma.cashTransaction.create({
            data: {
                cashAccountId: isExpense ? pettyCash.id : mainBank.id,
                type: isExpense ? CashTransactionType.EXPENSE : CashTransactionType.INCOME,
                date: transactionDate,
                reference,
                description: isExpense ? `Office supplies purchase ${i}` : `Small income ${i}`,
                journalEntryId: journalEntryResult.id,
                status: CashTransactionStatus.APPROVED,
                approvedById: adminUserId,
                approvedAt: new Date()
            }
        });
    }
}

async function seedProduction(prisma: PrismaClient, adminUserId: string) {
    console.log("Seeding Production Data (20+ items)...");
    const products = await prisma.product.findMany({ take: 10 });
    if (products.length < 2) return;

    // Create a BOM for the first product using the second product as component
    const targetProduct = products[0];
    const componentProduct = products[1];

    const bom = await prisma.billOfMaterial.upsert({
        where: { bomNumber: "BOM-DEMO-001" },
        update: {},
        create: {
            bomNumber: "BOM-DEMO-001",
            name: "Demo Product Assembly",
            productId: targetProduct.id,
            quantity: 1,
            items: {
                create: [
                    { productId: componentProduct.id, quantity: new Decimal(2) }
                ]
            }
        }
    });

    for (let i = 1; i <= 20; i++) {
        const orderNumber = `MO-DEMO-${String(i).padStart(4, '0')}`;
        await prisma.productionOrder.upsert({
            where: { orderNumber },
            update: {},
            create: {
                orderNumber,
                billOfMaterialId: bom.id,
                productId: targetProduct.id,
                plannedQuantity: Math.floor(Math.random() * 50) + 10,
                status: i % 2 === 0 ? ProductionOrderStatus.COMPLETED : ProductionOrderStatus.IN_PROGRESS,
                notes: "Generated Demo Order"
            }
        });
    }
}

async function seedHRPayroll(prisma: PrismaClient, adminUserId: string) {
    console.log("Seeding HR & Payroll (20+ Employees)...");
    const baseContact = await prisma.contact.findFirst({ where: { type: ContactType.EMPLOYEE } });

    // Create Basic Components
    const basicSalary = await prisma.salaryComponent.create({ data: { name: "Basic Salary", type: SalaryComponentType.EARNING, isTaxable: true } });
    const taxDeduct = await prisma.salaryComponent.create({ data: { name: "Income Tax", type: SalaryComponentType.DEDUCTION, isTaxable: false } });

    for (let i = 1; i <= 20; i++) {
        const name = `Demo Employee ${i}`;
        const contact = await prisma.contact.create({
            data: { name, type: ContactType.EMPLOYEE, email: `employee${i}@demo.com` }
        });

        await prisma.employeeDetail.create({
            data: {
                contactId: contact.id,
                joinDate: new Date(),
                employmentStatus: EmploymentStatus.FULL_TIME,
                jobTitle: "Staff",
                department: i % 2 === 0 ? "Sales" : "Operations",
                gender: Gender.MALE,
                maritalStatus: MaritalStatus.SINGLE
            }
        });

        // Salary structure for each
        const base = 3000 + Math.floor(Math.random() * 2000);
        await prisma.salaryStructure.create({
            data: {
                name: `Standard Structure - ${name}`,
                contactId: contact.id,
                baseSalary: new Decimal(base),
                items: {
                    create: [
                        { componentId: basicSalary.id, amount: new Decimal(base) },
                        { componentId: taxDeduct.id, amount: new Decimal(base * 0.1) } // 10% tax mock
                    ]
                }
            }
        });
    }

    // Mock Payroll Run
    const period = await prisma.payrollPeriod.create({
        data: {
            name: "Demo Payroll Run",
            startDate: new Date(),
            endDate: new Date(),
            status: PayrollPeriodStatus.COMPLETED
        }
    });

}

async function seedFixedAssets(prisma: PrismaClient, adminUserId: string) {
    console.log("Seeding Fixed Assets (15+ items)...");

    const assetAccount = await prisma.account.findFirst({ where: { code: "11000" } }); // Using generic for demo
    const expenseAccount = await prisma.account.findFirst({ where: { code: "51300" } }); // generic expense
    if (!assetAccount || !expenseAccount) return;

    const category = await prisma.assetCategory.create({
        data: {
            name: "Computers & Equipment",
            code: "EQP",
            defaultUsefulLife: 36,
            defaultMethod: DepreciationMethod.STRAIGHT_LINE,
            assetAccountId: assetAccount.id,
            accumDepreciationAccountId: assetAccount.id,
            depreciationExpenseAccountId: expenseAccount.id
        }
    });

    for (let i = 1; i <= 15; i++) {
        const cost = Math.floor(Math.random() * 2000) + 500;
        await prisma.asset.create({
            data: {
                code: `AST-DEMO-${String(i).padStart(4, '0')}`,
                name: `Demo Macbook Pro ${i}`,
                categoryId: category.id,
                purchaseDate: new Date(),
                acquisitionCost: new Decimal(cost),
                currentBookValue: new Decimal(cost),
                usefulLife: 36,
                depreciationMethod: DepreciationMethod.STRAIGHT_LINE,
                status: AssetStatus.ACTIVE
            }
        });
    }
}
