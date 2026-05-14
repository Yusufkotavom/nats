/**
 * Standard Chart of Accounts template and initial setup defaults.
 *
 * This module is imported by BOTH server and client components,
 * so it must NOT import from "@/prisma/generated/prisma/client".
 * Use plain string literals for enum-like values.
 */

export type AccountTemplate = {
    code: string;
    name: string;
    type: "asset" | "liability" | "equity" | "revenue" | "expense";
    normalBalance: "debit" | "credit";
    isPosting: boolean;
    level: number;
    parentCode: string | null;
};

/**
 * Standard Chart of Accounts template used by both the seed script
 * and the initial setup wizard.
 */
export const STANDARD_CHART_OF_ACCOUNTS: AccountTemplate[] = [
    // ASSETS
    { code: "10000", name: "Assets", type: "asset", normalBalance: "debit", isPosting: false, level: 0, parentCode: null },
    { code: "11000", name: "Current Assets", type: "asset", normalBalance: "debit", isPosting: false, level: 1, parentCode: "10000" },
    { code: "11100", name: "Cash and Cash Equivalents", type: "asset", normalBalance: "debit", isPosting: true, level: 2, parentCode: "11000" },
    { code: "11110", name: "Bank - Main", type: "asset", normalBalance: "debit", isPosting: true, level: 2, parentCode: "11000" },
    { code: "11120", name: "Petty Cash", type: "asset", normalBalance: "debit", isPosting: true, level: 2, parentCode: "11000" },
    { code: "11130", name: "E-Wallet", type: "asset", normalBalance: "debit", isPosting: true, level: 2, parentCode: "11000" },
    { code: "11200", name: "Accounts Receivable", type: "asset", normalBalance: "debit", isPosting: true, level: 2, parentCode: "11000" },
    { code: "11300", name: "Inventory Asset", type: "asset", normalBalance: "debit", isPosting: true, level: 2, parentCode: "11000" },
    { code: "11400", name: "Purchase Tax Receivable", type: "asset", normalBalance: "debit", isPosting: true, level: 2, parentCode: "11000" },
    { code: "11900", name: "Uncategorized Asset", type: "asset", normalBalance: "debit", isPosting: true, level: 2, parentCode: "11000" },
    { code: "12000", name: "Non-Current Assets", type: "asset", normalBalance: "debit", isPosting: false, level: 1, parentCode: "10000" },
    { code: "12100", name: "Fixed Assets", type: "asset", normalBalance: "debit", isPosting: true, level: 2, parentCode: "12000" },
    { code: "12200", name: "Accumulated Depreciation", type: "asset", normalBalance: "credit", isPosting: true, level: 2, parentCode: "12000" },

    // LIABILITIES
    { code: "20000", name: "Liabilities", type: "liability", normalBalance: "credit", isPosting: false, level: 0, parentCode: null },
    { code: "21000", name: "Current Liabilities", type: "liability", normalBalance: "credit", isPosting: false, level: 1, parentCode: "20000" },
    { code: "21100", name: "Accounts Payable", type: "liability", normalBalance: "credit", isPosting: true, level: 2, parentCode: "21000" },
    { code: "21200", name: "Sales Tax Payable", type: "liability", normalBalance: "credit", isPosting: true, level: 2, parentCode: "21000" },
    { code: "22000", name: "Long-Term Liabilities", type: "liability", normalBalance: "credit", isPosting: false, level: 1, parentCode: "20000" },

    // EQUITY
    { code: "30000", name: "Equity", type: "equity", normalBalance: "credit", isPosting: false, level: 0, parentCode: null },
    { code: "31000", name: "Capital", type: "equity", normalBalance: "credit", isPosting: true, level: 1, parentCode: "30000" },
    { code: "32000", name: "Retained Earnings", type: "equity", normalBalance: "credit", isPosting: true, level: 1, parentCode: "30000" },
    { code: "33000", name: "Opening Balance Equity", type: "equity", normalBalance: "credit", isPosting: true, level: 1, parentCode: "30000" },

    // REVENUE
    { code: "40000", name: "Revenue", type: "revenue", normalBalance: "credit", isPosting: false, level: 0, parentCode: null },
    { code: "41000", name: "Operating Revenue", type: "revenue", normalBalance: "credit", isPosting: false, level: 1, parentCode: "40000" },
    { code: "41100", name: "Service Revenue", type: "revenue", normalBalance: "credit", isPosting: true, level: 2, parentCode: "41000" },
    { code: "41200", name: "Product Sales", type: "revenue", normalBalance: "credit", isPosting: true, level: 2, parentCode: "41000" },
    { code: "41300", name: "Consulting Income", type: "revenue", normalBalance: "credit", isPosting: true, level: 2, parentCode: "41000" },
    { code: "42000", name: "Sales Discount", type: "revenue", normalBalance: "debit", isPosting: true, level: 2, parentCode: "40000" },
    { code: "49000", name: "Uncategorized Income", type: "revenue", normalBalance: "credit", isPosting: true, level: 2, parentCode: "40000" },

    // EXPENSES
    { code: "50000", name: "Expenses", type: "expense", normalBalance: "debit", isPosting: false, level: 0, parentCode: null },
    { code: "51000", name: "Operating Expenses", type: "expense", normalBalance: "debit", isPosting: false, level: 1, parentCode: "50000" },
    { code: "51100", name: "Rent Expense", type: "expense", normalBalance: "debit", isPosting: true, level: 2, parentCode: "51000" },
    { code: "51200", name: "Utilities Expense", type: "expense", normalBalance: "debit", isPosting: true, level: 2, parentCode: "51000" },
    { code: "51300", name: "Office Supplies", type: "expense", normalBalance: "debit", isPosting: true, level: 2, parentCode: "51000" },
    { code: "51400", name: "Salaries and Wages", type: "expense", normalBalance: "debit", isPosting: true, level: 2, parentCode: "51000" },
    { code: "51500", name: "Software Subscriptions", type: "expense", normalBalance: "debit", isPosting: true, level: 2, parentCode: "51000" },
    { code: "51600", name: "Travel Expense", type: "expense", normalBalance: "debit", isPosting: true, level: 2, parentCode: "51000" },
    { code: "51700", name: "Marketing", type: "expense", normalBalance: "debit", isPosting: true, level: 2, parentCode: "51000" },
    { code: "51800", name: "Insurance Expense", type: "expense", normalBalance: "debit", isPosting: true, level: 2, parentCode: "51000" },
    { code: "51900", name: "Depreciation Expense", type: "expense", normalBalance: "debit", isPosting: true, level: 2, parentCode: "51000" },
    { code: "52000", name: "Cost of Goods Sold", type: "expense", normalBalance: "debit", isPosting: true, level: 2, parentCode: "50000" },
    { code: "59000", name: "Uncategorized Expense", type: "expense", normalBalance: "debit", isPosting: true, level: 2, parentCode: "50000" },
    { code: "80000", name: "Other Expenses", type: "expense", normalBalance: "debit", isPosting: false, level: 0, parentCode: null },
    { code: "81000", name: "Exchange Gain/Loss", type: "expense", normalBalance: "debit", isPosting: true, level: 1, parentCode: "80000" },
];

/**
 * Recommended default account mappings keyed by purpose string to account code.
 * Uses plain strings (matching DefaultAccountPurpose enum values) so this file
 * stays free of Prisma server-side imports.
 */
export const RECOMMENDED_DEFAULT_ACCOUNT_MAPPINGS: {
    purpose: string;
    code: string;
}[] = [
        { purpose: "ACCOUNTS_RECEIVABLE", code: "11200" },
        { purpose: "ACCOUNTS_PAYABLE", code: "21100" },
        { purpose: "GOODS_RECEIVED_NOT_INVOICED", code: "21100" },
        { purpose: "INVENTORY_ASSET", code: "11300" },
        { purpose: "COGS", code: "52000" },
        { purpose: "SALES_REVENUE", code: "41200" },
        { purpose: "SALES_DISCOUNT", code: "42000" },
        { purpose: "SALES_TAX_PAYABLE", code: "21200" },
        { purpose: "PURCHASE_TAX_RECEIVABLE", code: "11400" },
        { purpose: "CASH_ON_HAND", code: "11120" },
        { purpose: "BANK", code: "11110" },
        { purpose: "OPENING_BALANCE_EQUITY", code: "33000" },
        { purpose: "RETAINED_EARNINGS", code: "32000" },
        { purpose: "UNCATEGORIZED_EXPENSE", code: "59000" },
        { purpose: "UNCATEGORIZED_INCOME", code: "49000" },
        { purpose: "UNCATEGORIZED_ASSET", code: "11900" },
        { purpose: "EXCHANGE_GAIN_LOSS", code: "81000" },
        { purpose: "SALARIES_EXPENSE", code: "51400" },
        { purpose: "PAYROLL_LIABILITY", code: "21300" },
        { purpose: "WIP_INVENTORY", code: "11300" },
        { purpose: "PRODUCTION_OVERHEAD", code: "51200" },
    ];

/** Default units to seed during initial setup */
export const DEFAULT_UNITS = [
    { name: "Pieces", symbol: "PCS" },
    { name: "Box", symbol: "BOX" },
    { name: "Kilogram", symbol: "KG" },
    { name: "Porsi", symbol: "PRS" },
    { name: "Botol", symbol: "BTL" },
    { name: "Gelas", symbol: "GLS" },
];

/** Default product categories to seed during initial setup */
export const DEFAULT_CATEGORIES = [
    { name: "General", description: "General products and services" },
    { name: "Menu Makanan", description: "Produk makanan siap jual untuk POS" },
    { name: "Menu Minuman", description: "Produk minuman siap jual untuk POS" },
    { name: "Menu Snack", description: "Menu camilan dan side dish siap jual" },
    { name: "Menu Dessert", description: "Menu pencuci mulut siap jual" },
    { name: "Bahan Baku", description: "Bahan baku operasional dapur/bar" },
];

export const SERVICE_CHART_OF_ACCOUNTS: AccountTemplate[] = STANDARD_CHART_OF_ACCOUNTS.map(a => {
    if (a.code === "11300") return { ...a, name: "Inventory / Supplies Asset" };
    if (a.code === "52000") return { ...a, name: "Cost of Services" };
    return a;
});

export const RETAIL_CHART_OF_ACCOUNTS: AccountTemplate[] = STANDARD_CHART_OF_ACCOUNTS;

export const MANUFACTURING_CHART_OF_ACCOUNTS: AccountTemplate[] = STANDARD_CHART_OF_ACCOUNTS.concat([
    { code: "11310", name: "Raw Materials", type: "asset", normalBalance: "debit", isPosting: true, level: 2, parentCode: "11000" },
    { code: "11320", name: "Work in Progress", type: "asset", normalBalance: "debit", isPosting: true, level: 2, parentCode: "11000" },
    { code: "11330", name: "Finished Goods", type: "asset", normalBalance: "debit", isPosting: true, level: 2, parentCode: "11000" },
]).sort((a, b) => a.code.localeCompare(b.code));

export const AVAILABLE_TEMPLATES = [
    { id: "general", name: "General Business", description: "Standard chart of accounts suitable for most businesses.", getTemplate: () => STANDARD_CHART_OF_ACCOUNTS },
    { id: "service", name: "Service Business", description: "Optimized for service-based businesses without physical inventory.", getTemplate: () => SERVICE_CHART_OF_ACCOUNTS },
    { id: "retail", name: "Retail / Trade", description: "Includes tracking for physical inventory and cost of goods sold.", getTemplate: () => RETAIL_CHART_OF_ACCOUNTS },
    { id: "manufacturing", name: "Manufacturing", description: "Includes raw materials, work in progress, and finished goods tracking.", getTemplate: () => MANUFACTURING_CHART_OF_ACCOUNTS },
];
