import { prisma } from "./utils";
import {
    CashAccountType,
    AccountType,
    NormalBalance,
    DefaultAccountPurpose,
} from "../generated/prisma/client";
import { Decimal } from "decimal.js";

export async function seedAccounting() {
    console.log("Seeding Accounting Module...");

    // 1. Chart of Accounts
    const accounts = [
        // 1. ASSETS
        {
            code: "10000",
            name: "Assets",
            type: AccountType.asset,
            normalBalance: NormalBalance.debit,
            isPosting: false,
            level: 0,
            parentCode: null,
        },
        {
            code: "11000",
            name: "Current Assets",
            type: AccountType.asset,
            normalBalance: NormalBalance.debit,
            isPosting: false,
            level: 1,
            parentCode: "10000",
        },
        {
            code: "11100",
            name: "Cash and Cash Equivalents",
            type: AccountType.asset,
            normalBalance: NormalBalance.debit,
            isPosting: true,
            level: 2,
            parentCode: "11000",
        },
        {
            code: "11110",
            name: "Bank - Main",
            type: AccountType.asset,
            normalBalance: NormalBalance.debit,
            isPosting: true,
            level: 2,
            parentCode: "11000",
        },
        {
            code: "11120",
            name: "Petty Cash",
            type: AccountType.asset,
            normalBalance: NormalBalance.debit,
            isPosting: true,
            level: 2,
            parentCode: "11000",
        },
        {
            code: "11130",
            name: "E-Wallet",
            type: AccountType.asset,
            normalBalance: NormalBalance.debit,
            isPosting: true,
            level: 2,
            parentCode: "11000",
        },
        {
            code: "11200",
            name: "Accounts Receivable",
            type: AccountType.asset,
            normalBalance: NormalBalance.debit,
            isPosting: true,
            level: 2,
            parentCode: "11000",
        },
        {
            code: "11300",
            name: "Inventory Asset",
            type: AccountType.asset,
            normalBalance: NormalBalance.debit,
            isPosting: true,
            level: 2,
            parentCode: "11000",
        },
        {
            code: "11400",
            name: "Purchase Tax Receivable",
            type: AccountType.asset,
            normalBalance: NormalBalance.debit,
            isPosting: true,
            level: 2,
            parentCode: "11000",
        },
        {
            code: "11900",
            name: "Uncategorized Asset",
            type: AccountType.asset,
            normalBalance: NormalBalance.debit,
            isPosting: true,
            level: 2,
            parentCode: "11000",
        },
        {
            code: "12000",
            name: "Non-Current Assets",
            type: AccountType.asset,
            normalBalance: NormalBalance.debit,
            isPosting: false,
            level: 1,
            parentCode: "10000",
        },
        {
            code: "12100",
            name: "Fixed Assets",
            type: AccountType.asset,
            normalBalance: NormalBalance.debit,
            isPosting: true,
            level: 2,
            parentCode: "12000",
        },
        {
            code: "12200",
            name: "Accumulated Depreciation",
            type: AccountType.asset,
            normalBalance: NormalBalance.credit,
            isPosting: true,
            level: 2,
            parentCode: "12000",
        },

        // 2. LIABILITIES
        {
            code: "20000",
            name: "Liabilities",
            type: AccountType.liability,
            normalBalance: NormalBalance.credit,
            isPosting: false,
            level: 0,
            parentCode: null,
        },
        {
            code: "21000",
            name: "Current Liabilities",
            type: AccountType.liability,
            normalBalance: NormalBalance.credit,
            isPosting: false,
            level: 1,
            parentCode: "20000",
        },
        {
            code: "21100",
            name: "Accounts Payable",
            type: AccountType.liability,
            normalBalance: NormalBalance.credit,
            isPosting: true,
            level: 2,
            parentCode: "21000",
        },
        {
            code: "21200",
            name: "Sales Tax Payable",
            type: AccountType.liability,
            normalBalance: NormalBalance.credit,
            isPosting: true,
            level: 2,
            parentCode: "21000",
        },
        {
            code: "21300",
            name: "Payroll Liability",
            type: AccountType.liability,
            normalBalance: NormalBalance.credit,
            isPosting: true,
            level: 2,
            parentCode: "21000",
        },
        {
            code: "22000",
            name: "Long-Term Liabilities",
            type: AccountType.liability,
            normalBalance: NormalBalance.credit,
            isPosting: false,
            level: 1,
            parentCode: "20000",
        },

        // 3. EQUITY
        {
            code: "30000",
            name: "Equity",
            type: AccountType.equity,
            normalBalance: NormalBalance.credit,
            isPosting: false,
            level: 0,
            parentCode: null,
        },
        {
            code: "31000",
            name: "Capital",
            type: AccountType.equity,
            normalBalance: NormalBalance.credit,
            isPosting: true,
            level: 1,
            parentCode: "30000",
        },
        {
            code: "32000",
            name: "Retained Earnings",
            type: AccountType.equity,
            normalBalance: NormalBalance.credit,
            isPosting: true,
            level: 1,
            parentCode: "30000",
        },
        {
            code: "33000",
            name: "Opening Balance Equity",
            type: AccountType.equity,
            normalBalance: NormalBalance.credit,
            isPosting: true,
            level: 1,
            parentCode: "30000",
        },

        // 4. REVENUE
        {
            code: "40000",
            name: "Revenue",
            type: AccountType.revenue,
            normalBalance: NormalBalance.credit,
            isPosting: false,
            level: 0,
            parentCode: null,
        },
        {
            code: "41000",
            name: "Operating Revenue",
            type: AccountType.revenue,
            normalBalance: NormalBalance.credit,
            isPosting: false,
            level: 1,
            parentCode: "40000",
        },
        {
            code: "41100",
            name: "Service Revenue",
            type: AccountType.revenue,
            normalBalance: NormalBalance.credit,
            isPosting: true,
            level: 2,
            parentCode: "41000",
        },
        {
            code: "41200",
            name: "Product Sales",
            type: AccountType.revenue,
            normalBalance: NormalBalance.credit,
            isPosting: true,
            level: 2,
            parentCode: "41000",
        },
        {
            code: "41300",
            name: "Consulting Income",
            type: AccountType.revenue,
            normalBalance: NormalBalance.credit,
            isPosting: true,
            level: 2,
            parentCode: "41000",
        },
        {
            code: "42000",
            name: "Sales Discount",
            type: AccountType.revenue,
            normalBalance: NormalBalance.debit,
            isPosting: true,
            level: 2,
            parentCode: "40000",
        },
        {
            code: "49000",
            name: "Uncategorized Income",
            type: AccountType.revenue,
            normalBalance: NormalBalance.credit,
            isPosting: true,
            level: 2,
            parentCode: "40000",
        },

        // 5. EXPENSES
        {
            code: "50000",
            name: "Expenses",
            type: AccountType.expense,
            normalBalance: NormalBalance.debit,
            isPosting: false,
            level: 0,
            parentCode: null,
        },
        {
            code: "51000",
            name: "Operating Expenses",
            type: AccountType.expense,
            normalBalance: NormalBalance.debit,
            isPosting: false,
            level: 1,
            parentCode: "50000",
        },
        {
            code: "51100",
            name: "Rent Expense",
            type: AccountType.expense,
            normalBalance: NormalBalance.debit,
            isPosting: true,
            level: 2,
            parentCode: "51000",
        },
        {
            code: "51200",
            name: "Utilities Expense",
            type: AccountType.expense,
            normalBalance: NormalBalance.debit,
            isPosting: true,
            level: 2,
            parentCode: "51000",
        },
        {
            code: "51300",
            name: "Office Supplies",
            type: AccountType.expense,
            normalBalance: NormalBalance.debit,
            isPosting: true,
            level: 2,
            parentCode: "51000",
        },
        {
            code: "51400",
            name: "Salaries and Wages",
            type: AccountType.expense,
            normalBalance: NormalBalance.debit,
            isPosting: true,
            level: 2,
            parentCode: "51000",
        },
        {
            code: "51500",
            name: "Software Subscriptions",
            type: AccountType.expense,
            normalBalance: NormalBalance.debit,
            isPosting: true,
            level: 2,
            parentCode: "51000",
        },
        {
            code: "51600",
            name: "Travel Expense",
            type: AccountType.expense,
            normalBalance: NormalBalance.debit,
            isPosting: true,
            level: 2,
            parentCode: "51000",
        },
        {
            code: "51700",
            name: "Marketing",
            type: AccountType.expense,
            normalBalance: NormalBalance.debit,
            isPosting: true,
            level: 2,
            parentCode: "51000",
        },
        {
            code: "51800",
            name: "Insurance Expense",
            type: AccountType.expense,
            normalBalance: NormalBalance.debit,
            isPosting: true,
            level: 2,
            parentCode: "51000",
        },
        {
            code: "51900",
            name: "Depreciation Expense",
            type: AccountType.expense,
            normalBalance: NormalBalance.debit,
            isPosting: true,
            level: 2,
            parentCode: "51000",
        },
        {
            code: "52000",
            name: "Cost of Goods Sold",
            type: AccountType.expense,
            normalBalance: NormalBalance.debit,
            isPosting: true,
            level: 2,
            parentCode: "50000",
        },
        {
            code: "59000",
            name: "Uncategorized Expense",
            type: AccountType.expense,
            normalBalance: NormalBalance.debit,
            isPosting: true,
            level: 2,
            parentCode: "50000",
        },
        {
            code: "80000",
            name: "Other Expenses",
            type: AccountType.expense,
            normalBalance: NormalBalance.debit,
            isPosting: false,
            level: 0,
            parentCode: null,
        },
        {
            code: "81000",
            name: "Exchange Gain/Loss",
            type: AccountType.expense,
            normalBalance: NormalBalance.debit,
            isPosting: true,
            level: 1,
            parentCode: "80000",
        },
    ];

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

    // 2. Default Accounts
    const defaultAccounts = [
        { purpose: DefaultAccountPurpose.ACCOUNTS_RECEIVABLE, code: "11200" },
        { purpose: DefaultAccountPurpose.ACCOUNTS_PAYABLE, code: "21100" },
        { purpose: DefaultAccountPurpose.GOODS_RECEIVED_NOT_INVOICED, code: "21100" },
        { purpose: DefaultAccountPurpose.INVENTORY_ASSET, code: "11300" },
        { purpose: DefaultAccountPurpose.COGS, code: "52000" },
        { purpose: DefaultAccountPurpose.SALES_REVENUE, code: "41200" },
        { purpose: DefaultAccountPurpose.SALES_DISCOUNT, code: "42000" },
        { purpose: DefaultAccountPurpose.SALES_TAX_PAYABLE, code: "21200" },
        { purpose: DefaultAccountPurpose.PURCHASE_TAX_RECEIVABLE, code: "11400" },
        { purpose: DefaultAccountPurpose.CASH_ON_HAND, code: "11120" },
        { purpose: DefaultAccountPurpose.BANK, code: "11110" },
        { purpose: DefaultAccountPurpose.OPENING_BALANCE_EQUITY, code: "33000" },
        { purpose: DefaultAccountPurpose.RETAINED_EARNINGS, code: "32000" },
        { purpose: DefaultAccountPurpose.UNCATEGORIZED_EXPENSE, code: "59000" },
        { purpose: DefaultAccountPurpose.UNCATEGORIZED_INCOME, code: "49000" },
        { purpose: DefaultAccountPurpose.UNCATEGORIZED_ASSET, code: "11900" },
        { purpose: DefaultAccountPurpose.EXCHANGE_GAIN_LOSS, code: "81000" },
        { purpose: DefaultAccountPurpose.SALARIES_EXPENSE, code: "51400" },
        { purpose: DefaultAccountPurpose.PAYROLL_LIABILITY, code: "21300" },
        { purpose: DefaultAccountPurpose.WIP_INVENTORY, code: "11300" },
        { purpose: DefaultAccountPurpose.PRODUCTION_OVERHEAD, code: "51200" },
    ];

    for (const fa of defaultAccounts) {
        const acc = await prisma.account.findUnique({ where: { code: fa.code } });
        if (acc) {
            // Find existing default account for this purpose
            const existing = await prisma.defaultAccount.findFirst({
                where: { purpose: fa.purpose },
            });

            if (existing) {
                await prisma.defaultAccount.update({
                    where: { id: existing.id },
                    data: { accountId: acc.id },
                });
            } else {
                await prisma.defaultAccount.create({
                    data: {
                        purpose: fa.purpose,
                        accountId: acc.id,
                        isActive: true,
                    },
                });
            }
        }
    }

    // 3. Tax Rates
    const taxRates = [
        { code: "VAT-S", name: "Standard VAT", rate: new Decimal(10.0), description: "Standard Rate 10%" },
        { code: "VAT-R", name: "Reduced VAT", rate: new Decimal(5.0), description: "Reduced Rate 5%" },
        { code: "VAT-Z", name: "Zero Rated", rate: new Decimal(0.0), description: "Zero Rated 0%" },
        { code: "EXEMPT", name: "Exempt", rate: new Decimal(0.0), description: "Tax Exempt" },
    ];

    for (const tax of taxRates) {
        await prisma.taxRate.upsert({
            where: { code: tax.code },
            update: {},
            create: {
                code: tax.code,
                name: tax.name,
                rate: tax.rate,
                description: tax.description,
            },
        });
    }

    // 4. Cash Accounts
    const cashAccountsData = [
        {
            name: "Main Cash Drawer",
            type: CashAccountType.CASH,
            glAccountCode: "11100", // Cash and Cash Equivalents - using parent for now as placeholder or maybe should be specific
            // The original seeder used 11100 for cash drawer but mapped to a specific GL account. 
            // Let's use Petty Cash 11120 for actual cash drawer to be more precise or 11100 if general.
            // Re-reading original seeder: "11100" was "Cash and Cash Equivalents". "11120" was "Petty Cash".
            // Let's stick to what worked or map better.
            // Let's map "Main Cash Drawer" to "Petty Cash" account for simplicity if no specific "Main Cash" account exists.
            targetGlCode: "11120",
            description: "Main office cash drawer",
        },
        {
            name: "Main Bank Account",
            type: CashAccountType.BANK,
            glAccountCode: "11110", // Bank - Main
            targetGlCode: "11110",
            accountNumber: "123-456-7890",
            bankName: "First National Bank",
            description: "Primary operating account",
        },
        {
            name: "Office Petty Cash",
            type: CashAccountType.PETTY_CASH,
            targetGlCode: "11120", // Petty Cash
            description: "Small expenses",
        },
        {
            name: "Digital Wallet",
            type: CashAccountType.EWALLET,
            targetGlCode: "11130", // E-Wallet
            bankName: "PayPal",
            accountNumber: "company@example.com",
            description: "Online payments",
        },
    ];

    for (const acc of cashAccountsData) {
        const glAccount = await prisma.account.findUnique({
            where: { code: acc.targetGlCode },
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

}
