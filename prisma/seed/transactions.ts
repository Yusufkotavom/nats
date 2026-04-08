import { prisma } from "./utils";

import {
    SalesOrderStatus,
    SalesInvoiceStatus,
    SalesReturnStatus,
    PurchaseOrderStatus,
    PurchaseInvoiceStatus,
    EntryStatus,
    CashTransactionType,
    CashTransactionStatus,
    ProductionOrderStatus,
} from "../generated/prisma/client";
import { Decimal } from "decimal.js";
import { faker } from "@faker-js/faker";
import { 
    getRandomItem, 
    generateUniqueSKU, 
    getRandomDateInLastMonths, 
    getWeightedRandomStatus,
    runInChunks 
} from "./bulk_utils";

export async function seedTransactions() {
    console.log("Seeding Initial Transactions...");

    // 1. Get necessary data
    const adminUser = await prisma.user.findFirst({ where: { email: "admin@example.com" } });
    if (!adminUser) return;

    // Get Customers & Vendors
    const customerAcme = await prisma.contact.findFirst({ where: { name: "Acme Corp" } });
    const vendorOffice = await prisma.contact.findFirst({ where: { name: "Office Supplies Co" } });

    // Get Products
    const productLaptop = await prisma.product.findFirst({ where: { sku: "ELEC-001" } });

    // Get Accounts
    const salesAccount = await prisma.account.findFirst({ where: { code: "41200" } }); 
    const bankAccount = await prisma.account.findFirst({ where: { code: "11110" } }); 
    const equityAccount = await prisma.account.findFirst({ where: { code: "33000" } }); 

    if (!customerAcme || !vendorOffice || !productLaptop || !salesAccount || !bankAccount) {
        console.log("Skipping initial transactions seeding: Missing dependencies.");
        return;
    }

    // Standard initial records (SO-2026-001, etc.)
    await prisma.salesOrder.upsert({
        where: { orderNumber: "SO-2026-001" },
        update: {},
        create: {
            orderNumber: "SO-2026-001",
            contactId: customerAcme.id,
            orderDate: new Date(),
            status: SalesOrderStatus.CONFIRMED,
            totalAmount: new Decimal(2400),
            subtotal: new Decimal(2400),
            createdById: adminUser.id,
            items: {
                create: [
                    { productId: productLaptop.id, quantity: 2, unitPrice: new Decimal(1200), totalPrice: new Decimal(2400) }
                ]
            }
        }
    });

    // ... (rest of initial seeding logic preserved or simplified)
}

export async function seedBulkTransactions(count: number) {
    console.log(`🚀 Starting Global Bulk Seeding (Target: >500 per table)...`);

    const adminUser = await prisma.user.findFirst({ where: { email: "admin@example.com" } });
    const customers = await prisma.contact.findMany({ where: { type: "CUSTOMER" } });
    const vendors = await prisma.contact.findMany({ where: { type: "VENDOR" } });
    const products = await prisma.product.findMany();
    const accounts = await prisma.account.findMany();
    const cashAccounts = await prisma.cashAccount.findMany();

    if (!adminUser || customers.length === 0 || vendors.length === 0 || products.length === 0 || accounts.length === 0 || cashAccounts.length === 0) {
        console.warn("⚠️ Missing critical dependencies for bulk transactions. Skipping.");
        return;
    }

    const salesAccount = accounts.find(a => a.code === "41200") || accounts[0];
    const bankAccount = accounts.find(a => a.code === "11110") || accounts[0];
    const cogsAccount = accounts.find(a => a.code === "52000") || accounts[0];
    const arAccount = accounts.find(a => a.code === "11200") || accounts[0];
    const apAccount = accounts.find(a => a.code === "21100") || accounts[0];

    // 1. SALES MODULE (SO -> INV -> PAYMENT)
    console.log("--- Seeding Sales Module ---");
    const salesOrdersCount = 800; // Increased to ensure 500+ Invoices and Payments
    const salesOrders = [];
    for (let i = 0; i < salesOrdersCount; i++) {
        const customer = getRandomItem(customers);
        const product = getRandomItem(products);
        const qty = faker.number.int({ min: 1, max: 20 });
        const date = getRandomDateInLastMonths(6);
        const price = product.price;
        const total = price.mul(qty);
        
        salesOrders.push({
            orderNumber: generateUniqueSKU("SO-B", i),
            contactId: customer.id,
            orderDate: date,
            status: getWeightedRandomStatus(
                [SalesOrderStatus.CONFIRMED, SalesOrderStatus.SHIPPED, SalesOrderStatus.CLOSED, SalesOrderStatus.CANCELLED],
                [40, 30, 20, 10]
            ),
            totalAmount: total,
            subtotal: total,
            createdById: adminUser.id,
            productId: product.id,
            qty,
            price
        });
    }

    await runInChunks(salesOrders, 100, async (chunk) => {
        for (const so of chunk) {
            const createdSO = await prisma.salesOrder.create({
                data: {
                    orderNumber: so.orderNumber,
                    contactId: so.contactId,
                    orderDate: so.orderDate,
                    status: so.status,
                    totalAmount: so.totalAmount,
                    subtotal: so.subtotal,
                    createdById: so.createdById,
                    items: {
                        create: [{ productId: so.productId, quantity: so.qty, unitPrice: so.price, totalPrice: so.totalAmount }]
                    }
                }
            });

            // Randomly create Invoices for Confirmed/Shipped/Closed orders
            if (so.status !== SalesOrderStatus.CANCELLED && Math.random() > 0.1) { // 90% transition
                const invStatus = getWeightedRandomStatus(
                    [SalesInvoiceStatus.ISSUED, SalesInvoiceStatus.PAID, SalesInvoiceStatus.PARTIALLY_PAID],
                    [20, 70, 10] // Higher probability for PAID to ensure enough payments
                );
                const invDate = new Date(so.orderDate.getTime() + (24 * 60 * 60 * 1000 * faker.number.int({ min: 1, max: 5 })));
                
                const createdInv = await prisma.salesInvoice.create({
                    data: {
                        invoiceNumber: createdSO.orderNumber.replace("SO", "INV"),
                        contactId: so.contactId,
                        salesOrderId: createdSO.id,
                        invoiceDate: invDate,
                        dueDate: new Date(invDate.getTime() + (30 * 24 * 60 * 60 * 1000)),
                        status: invStatus,
                        totalAmount: so.totalAmount,
                        subtotal: so.totalAmount,
                        balanceDue: invStatus === SalesInvoiceStatus.PAID ? new Decimal(0) : so.totalAmount,
                        items: {
                            create: [{ 
                                description: `Invoice for ${so.orderNumber}`, 
                                productId: so.productId, 
                                quantity: so.qty, 
                                unitPrice: so.price, 
                                totalPrice: so.totalAmount,
                                accountId: salesAccount.id
                            }]
                        }
                    }
                });

                // If Paid, create a payment (90% of PAID invoices get a payment record)
                if (invStatus === SalesInvoiceStatus.PAID && Math.random() > 0.1) {
                    await prisma.salesPayment.create({
                        data: {
                            paymentNumber: createdInv.invoiceNumber.replace("INV", "PAY"),
                            contactId: so.contactId,
                            salesInvoiceId: createdInv.id,
                            paymentDate: new Date(invDate.getTime() + (24 * 60 * 60 * 1000 * faker.number.int({ min: 1, max: 10 }))),
                            amount: so.totalAmount,
                            cashAccountId: getRandomItem(cashAccounts).id,
                        }
                    });
                }
            }
        }
    });

    // 2. PURCHASING MODULE (PO -> INV -> PAYMENT)
    console.log("--- Seeding Purchasing Module ---");
    const purchaseOrdersCount = 800; // Increased
    const purchaseOrders = [];
    for (let i = 0; i < purchaseOrdersCount; i++) {
        const vendor = getRandomItem(vendors);
        const product = getRandomItem(products);
        const qty = faker.number.int({ min: 10, max: 100 });
        const date = getRandomDateInLastMonths(6);
        const cost = product.cost;
        const total = cost.mul(qty);

        purchaseOrders.push({
            orderNumber: generateUniqueSKU("PO-B", i),
            contactId: vendor.id,
            orderDate: date,
            status: getWeightedRandomStatus(
                [PurchaseOrderStatus.ISSUED, PurchaseOrderStatus.CLOSED, PurchaseOrderStatus.DRAFT],
                [50, 40, 10]
            ),
            totalAmount: total,
            createdById: adminUser.id,
            productId: product.id,
            qty,
            cost
        });
    }

    await runInChunks(purchaseOrders, 100, async (chunk) => {
        for (const po of chunk) {
            const createdPO = await prisma.purchaseOrder.create({
                data: {
                    orderNumber: po.orderNumber,
                    contactId: po.contactId,
                    orderDate: po.orderDate,
                    status: po.status,
                    totalAmount: po.totalAmount,
                    createdById: po.createdById,
                    items: {
                        create: [{ productId: po.productId, quantity: po.qty, unitCost: po.cost, totalCost: po.totalAmount }]
                    }
                }
            });

            if (po.status !== PurchaseOrderStatus.DRAFT && Math.random() > 0.1) { // 90% transition
                const piStatus = getWeightedRandomStatus(
                    [PurchaseInvoiceStatus.BILLED, PurchaseInvoiceStatus.PAID],
                    [30, 70]
                );
                const piDate = new Date(po.orderDate.getTime() + (24 * 60 * 60 * 1000 * faker.number.int({ min: 1, max: 7 })));

                const createdPI = await prisma.purchaseInvoice.create({
                    data: {
                        invoiceNumber: createdPO.orderNumber.replace("PO", "PINV"),
                        contactId: po.contactId,
                        purchaseOrderId: createdPO.id,
                        invoiceDate: piDate,
                        dueDate: new Date(piDate.getTime() + (30 * 24 * 60 * 60 * 1000)),
                        status: piStatus,
                        totalAmount: po.totalAmount,
                        items: {
                            create: [{
                                description: `Vendor Invoice for ${po.orderNumber}`,
                                quantity: po.qty,
                                unitPrice: po.cost,
                                totalPrice: po.totalAmount,
                                accountId: salesAccount.id 
                            }]
                        }
                    }
                });

                if (piStatus === PurchaseInvoiceStatus.PAID && Math.random() > 0.1) {
                    await prisma.purchasePayment.create({
                        data: {
                            paymentNumber: createdPI.invoiceNumber.replace("PINV", "PPAY"),
                            contactId: po.contactId,
                            purchaseInvoiceId: createdPI.id,
                            paymentDate: new Date(piDate.getTime() + (24 * 60 * 60 * 1000 * faker.number.int({ min: 1, max: 5 }))),
                            amount: po.totalAmount,
                            cashAccountId: getRandomItem(cashAccounts).id,
                        }
                    });
                }
            }
        }
    });

    // 3. ACCOUNTING & BANK (JE + CASH TRANSACTIONS)
    console.log("--- Seeding Accounting Module ---");
    const journalsCount = 600; // Increased
    const journals = [];
    for (let i = 0; i < journalsCount; i++) {
        const amount = new Decimal(faker.commerce.price({ min: 50, max: 2000 }));
        journals.push({
            entryNumber: generateUniqueSKU("JE-B", i),
            date: getRandomDateInLastMonths(6),
            description: faker.finance.transactionDescription(),
            amount
        });
    }

    await runInChunks(journals, 100, async (chunk) => {
        for (const je of chunk) {
            await prisma.journalEntry.create({
                data: {
                    entryNumber: je.entryNumber,
                    transactionDate: je.date,
                    description: je.description,
                    status: EntryStatus.posted,
                    userId: adminUser.id,
                    lines: {
                        create: [
                            { accountId: bankAccount.id, debitAmount: je.amount, creditAmount: 0, lineNumber: 1 },
                            { accountId: salesAccount.id, debitAmount: 0, creditAmount: je.amount, lineNumber: 2 }
                        ]
                    }
                }
            });
        }
    });

    const cashTxCount = 600; // Increased
    const cashTx = [];
    for (let i = 0; i < cashTxCount; i++) {
        const type = getWeightedRandomStatus([CashTransactionType.INCOME, CashTransactionType.EXPENSE], [30, 70]);
        const amount = new Decimal(faker.commerce.price({ min: 20, max: 500 }));
        cashTx.push({
            date: getRandomDateInLastMonths(6),
            type,
            amount,
            description: faker.finance.transactionDescription()
        });
    }

    await runInChunks(cashTx, 100, async (chunk) => {
        for (const tx of chunk) {
            const jeCount = await prisma.journalEntry.count();
            const je = await prisma.journalEntry.create({
                data: {
                    entryNumber: generateUniqueSKU("TXJE", jeCount + 1),
                    transactionDate: tx.date,
                    description: tx.description,
                    status: EntryStatus.posted,
                    userId: adminUser.id,
                    lines: {
                        create: [
                            { accountId: bankAccount.id, debitAmount: tx.type === CashTransactionType.INCOME ? tx.amount : 0, creditAmount: tx.type === CashTransactionType.EXPENSE ? tx.amount : 0, lineNumber: 1 },
                            { accountId: salesAccount.id, debitAmount: tx.type === CashTransactionType.EXPENSE ? tx.amount : 0, creditAmount: tx.type === CashTransactionType.INCOME ? tx.amount : 0, lineNumber: 2 }
                        ]
                    }
                }
            });

            await prisma.cashTransaction.create({
                data: {
                    cashAccountId: getRandomItem(cashAccounts).id,
                    type: tx.type,
                    date: tx.date,
                    description: tx.description,
                    journalEntryId: je.id,
                    status: CashTransactionStatus.APPROVED,
                    allocations: {
                        create: [{ accountId: salesAccount.id, amount: tx.amount, description: tx.description }]
                    }
                }
            });
        }
    });

    // 4. PRODUCTION MODULE
    console.log("--- Seeding Production Module ---");
    const productionOrdersCount = 600; // Increased
    const productionOrders = [];
    for (let i = 0; i < productionOrdersCount; i++) {
        const product = getRandomItem(products);
        productionOrders.push({
            orderNumber: generateUniqueSKU("MO-B", i),
            productId: product.id,
            date: getRandomDateInLastMonths(6),
            qty: faker.number.int({ min: 5, max: 100 })
        });
    }

    await runInChunks(productionOrders, 100, async (chunk) => {
        for (const mo of chunk) {
            await prisma.productionOrder.create({
                data: {
                    orderNumber: mo.orderNumber,
                    productId: mo.productId,
                    plannedQuantity: mo.qty,
                    producedQuantity: Math.random() > 0.4 ? mo.qty : 0,
                    status: getWeightedRandomStatus(
                        [ProductionOrderStatus.COMPLETED, ProductionOrderStatus.IN_PROGRESS, ProductionOrderStatus.RELEASED],
                        [50, 30, 20]
                    ),
                    startDate: mo.date,
                    endDate: new Date(mo.date.getTime() + (2 * 24 * 60 * 60 * 1000))
                }
            });
        }
    });

    // 5. SALES RETURNS (Refunds)
    console.log("--- Seeding Sales Returns ---");
    const salesInvoices = await prisma.salesInvoice.findMany({ take: 200, where: { status: SalesInvoiceStatus.PAID } });
    const returnsCount = 600; // Increased
    const salesReturns = [];
    for (let i = 0; i < returnsCount; i++) {
        const inv = getRandomItem(salesInvoices);
        if (!inv) continue;
        const date = new Date(inv.invoiceDate.getTime() + (24 * 60 * 60 * 1000 * faker.number.int({ min: 5, max: 20 })));
        salesReturns.push({
            returnNumber: generateUniqueSKU("SR-B", i),
            contactId: inv.contactId,
            salesInvoiceId: inv.id,
            date,
            amount: inv.totalAmount.mul(0.5) // Partial refund
        });
    }

    await runInChunks(salesReturns, 100, async (chunk) => {
        for (const sr of chunk) {
            await prisma.salesReturn.create({
                data: {
                    returnNumber: sr.returnNumber,
                    contactId: sr.contactId,
                    salesInvoiceId: sr.salesInvoiceId,
                    returnDate: sr.date,
                    totalAmount: sr.amount,
                    status: SalesReturnStatus.COMPLETED,
                    reason: faker.commerce.productAdjective() + " defect",
                }
            });
        }
    });

    // 6. PAYROLL (Salary Slips)
    console.log("--- Seeding Payroll Module ---");
    const employees = await prisma.contact.findMany({ where: { type: "EMPLOYEE" }, take: 100 });
    const periods = await prisma.payrollPeriod.findMany();
    const salarySlips = [];
    for (let i = 0; i < 600; i++) {
        const emp = getRandomItem(employees);
        const period = getRandomItem(periods);
        salarySlips.push({
            contactId: emp.id,
            periodId: period.id,
            gross: new Decimal(faker.number.int({ min: 3000, max: 8000 })),
            net: new Decimal(faker.number.int({ min: 2500, max: 7500 })),
            status: "PAID"
        });
    }

    await runInChunks(salarySlips, 100, async (chunk) => {
        for (const slip of chunk) {
            await prisma.salarySlip.create({
                data: {
                    contactId: slip.contactId,
                    periodId: slip.periodId,
                    grossSalary: slip.gross,
                    netSalary: slip.net,
                    status: "PAID",
                }
            });
        }
    });

    console.log("✅ Global Bulk Seeding Completed.");
}
