import { prisma } from "./utils";
import {
    SalesOrderStatus,
    SalesInvoiceStatus,
    PurchaseOrderStatus,
    EntryStatus,
} from "../generated/prisma/client";
import { Decimal } from "decimal.js";

export async function seedTransactions() {
    console.log("Seeding Transactions...");

    // 1. Get necessary data
    const adminUser = await prisma.user.findFirst({ where: { email: "admin@example.com" } });
    if (!adminUser) return;

    // Get Customers & Vendors
    const customerAcme = await prisma.contact.findFirst({ where: { name: "Acme Corp" } });
    const vendorOffice = await prisma.contact.findFirst({ where: { name: "Office Supplies Co" } });

    // Get Products
    const productLaptop = await prisma.product.findFirst({ where: { sku: "ELEC-001" } }); // Pro Laptop 15

    // Get Accounts
    const salesAccount = await prisma.account.findFirst({ where: { code: "41200" } }); // Product Sales
    const bankAccount = await prisma.account.findFirst({ where: { code: "11110" } }); // Bank
    const equityAccount = await prisma.account.findFirst({ where: { code: "33000" } }); // Opening Balance Equity

    if (!customerAcme || !vendorOffice || !productLaptop || !salesAccount || !bankAccount) {
        console.log("Skipping transactions seeding: Missing dependencies (User, Contact, Product, or Account).");
        return;
    }

    // --- SALES TRANSACTIONS ---

    // 1. Sales Order (Confirmed)
    const so1 = await prisma.salesOrder.upsert({
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
                    {
                        productId: productLaptop.id,
                        quantity: 2,
                        unitPrice: new Decimal(1200),
                        totalPrice: new Decimal(2400),
                    }
                ]
            }
        }
    });

    // 2. Sales Invoice (Issued/Unpaid) for the above order
    const inv1Exists = await prisma.salesInvoice.findUnique({ where: { invoiceNumber: "INV-2026-001" } });
    if (!inv1Exists) {
        await prisma.salesInvoice.create({
            data: {
                invoiceNumber: "INV-2026-001",
                contactId: customerAcme.id,
                salesOrderId: so1.id,
                invoiceDate: new Date(),
                dueDate: new Date(new Date().setDate(new Date().getDate() + 30)),
                status: SalesInvoiceStatus.ISSUED,
                totalAmount: new Decimal(2400),
                subtotal: new Decimal(2400),
                balanceDue: new Decimal(2400),
                items: {
                    create: [
                        {
                            description: "Pro Laptop 15",
                            productId: productLaptop.id,
                            quantity: 2,
                            unitPrice: new Decimal(1200),
                            totalPrice: new Decimal(2400),
                            accountId: salesAccount.id,
                        }
                    ]
                }
            }
        });
    }

    // --- PURCHASE TRANSACTIONS ---

    // 1. Purchase Order (Draft)
    await prisma.purchaseOrder.upsert({
        where: { orderNumber: "PO-2026-001" },
        update: {},
        create: {
            orderNumber: "PO-2026-001",
            contactId: vendorOffice.id,
            orderDate: new Date(),
            status: PurchaseOrderStatus.DRAFT,
            totalAmount: new Decimal(500),
            createdById: adminUser.id,
            // Assuming we have some office supply product or just using dummy items if PO items require product
        }
    });

    // --- JOURNAL ENTRIES ---

    // 1. Manual Journal Entry (Opening Balance)
    const journalRef = "JE-OPEN-001";
    const existingJE = await prisma.journalEntry.findUnique({ where: { entryNumber: journalRef } });

    if (!existingJE) {
        await prisma.journalEntry.create({
            data: {
                entryNumber: journalRef,
                transactionDate: new Date("2026-01-01"),
                description: "Opening Balance",
                status: EntryStatus.posted,
                userId: adminUser.id,
                lines: {
                    create: [
                        {
                            accountId: bankAccount.id,
                            debitAmount: new Decimal(10000),
                            creditAmount: new Decimal(0),
                            lineNumber: 1,
                            description: "Initial Cash",
                        },
                        {
                            accountId: equityAccount?.id || salesAccount.id, // Fallback if 33000 missing
                            debitAmount: new Decimal(0),
                            creditAmount: new Decimal(10000),
                            lineNumber: 2,
                            description: "Initial Equity"
                        }
                    ]
                }
            }
        });
    }
}
