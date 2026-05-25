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
    { name: "ATK & Percetakan", description: "Produk ATK dan kebutuhan cetak harian" },
    { name: "Aksesoris HP", description: "Produk aksesoris ponsel dan gadget" },
    { name: "Jasa Service", description: "Layanan service perangkat dan pekerjaan non-stok" },
];

export type SampleCatalogTemplate = {
    skuCode: string;
    name: string;
    categoryName: string;
    unitSymbol: string;
    price: number;
    cost: number;
    isService?: boolean;
    description?: string;
};

/** Sample products/services seeded in setup wizard for quick trial transactions */
export const DEFAULT_SAMPLE_CATALOG: SampleCatalogTemplate[] = [
    // Restaurant
    { skuCode: "RST-NASGOR", name: "Nasi Goreng Spesial", categoryName: "Menu Makanan", unitSymbol: "PRS", price: 25000, cost: 12000 },
    { skuCode: "RST-ES-TEH", name: "Es Teh Manis", categoryName: "Menu Minuman", unitSymbol: "GLS", price: 8000, cost: 2500 },
    { skuCode: "RST-FRENCH", name: "French Fries", categoryName: "Menu Snack", unitSymbol: "PRS", price: 15000, cost: 7000 },
    { skuCode: "RST-PUDING", name: "Puding Coklat", categoryName: "Menu Dessert", unitSymbol: "PRS", price: 12000, cost: 5000 },
    // Printing + stationeries
    { skuCode: "PRT-A4-80", name: "Kertas A4 80gsm", categoryName: "ATK & Percetakan", unitSymbol: "PCS", price: 70000, cost: 58000 },
    { skuCode: "PRT-BALLP", name: "Pulpen Gel", categoryName: "ATK & Percetakan", unitSymbol: "PCS", price: 5000, cost: 2500 },
    { skuCode: "PRT-LAM-A4", name: "Laminating A4", categoryName: "Jasa Service", unitSymbol: "PCS", price: 6000, cost: 1500, isService: true, description: "Jasa laminating dokumen ukuran A4" },
    // Phone counter + services
    { skuCode: "HP-CASE", name: "Case HP Premium", categoryName: "Aksesoris HP", unitSymbol: "PCS", price: 45000, cost: 22000 },
    { skuCode: "HP-CABLE", name: "Kabel Data Type-C", categoryName: "Aksesoris HP", unitSymbol: "PCS", price: 30000, cost: 15000 },
    { skuCode: "HP-TG", name: "Tempered Glass", categoryName: "Aksesoris HP", unitSymbol: "PCS", price: 25000, cost: 10000 },
    { skuCode: "SRV-HP-CLEAN", name: "Service Cleaning HP", categoryName: "Jasa Service", unitSymbol: "PCS", price: 35000, cost: 10000, isService: true },
    { skuCode: "SRV-HP-SW", name: "Service Update Software", categoryName: "Jasa Service", unitSymbol: "PCS", price: 75000, cost: 20000, isService: true },
];

export const SERVICE_CHART_OF_ACCOUNTS: AccountTemplate[] = STANDARD_CHART_OF_ACCOUNTS.map(a => {
    if (a.code === "11300") return { ...a, name: "Inventory / Supplies Asset" };
    if (a.code === "52000") return { ...a, name: "Cost of Services" };
    return a;
});

export const RETAIL_CHART_OF_ACCOUNTS: AccountTemplate[] = STANDARD_CHART_OF_ACCOUNTS;

/**
 * Balanced UMKM template:
 * Keeps onboarding practical (not too many accounts) while still covering
 * common micro/small-business flows for product + service businesses.
 */
export const UMKM_BALANCED_CHART_OF_ACCOUNTS: AccountTemplate[] = [
    // ASSETS
    { code: "10000", name: "Assets", type: "asset", normalBalance: "debit", isPosting: false, level: 0, parentCode: null },
    { code: "11000", name: "Current Assets", type: "asset", normalBalance: "debit", isPosting: false, level: 1, parentCode: "10000" },
    { code: "11100", name: "Cash and Cash Equivalents", type: "asset", normalBalance: "debit", isPosting: true, level: 2, parentCode: "11000" },
    { code: "11110", name: "Bank - Main", type: "asset", normalBalance: "debit", isPosting: true, level: 2, parentCode: "11000" },
    { code: "11120", name: "Petty Cash", type: "asset", normalBalance: "debit", isPosting: true, level: 2, parentCode: "11000" },
    { code: "11130", name: "E-Wallet", type: "asset", normalBalance: "debit", isPosting: true, level: 2, parentCode: "11000" },
    { code: "11200", name: "Accounts Receivable", type: "asset", normalBalance: "debit", isPosting: true, level: 2, parentCode: "11000" },
    { code: "11300", name: "Inventory Asset", type: "asset", normalBalance: "debit", isPosting: true, level: 2, parentCode: "11000" },
    { code: "11900", name: "Uncategorized Asset", type: "asset", normalBalance: "debit", isPosting: true, level: 2, parentCode: "11000" },

    // LIABILITIES
    { code: "20000", name: "Liabilities", type: "liability", normalBalance: "credit", isPosting: false, level: 0, parentCode: null },
    { code: "21000", name: "Current Liabilities", type: "liability", normalBalance: "credit", isPosting: false, level: 1, parentCode: "20000" },
    { code: "21100", name: "Accounts Payable", type: "liability", normalBalance: "credit", isPosting: true, level: 2, parentCode: "21000" },
    { code: "21200", name: "Sales Tax Payable", type: "liability", normalBalance: "credit", isPosting: true, level: 2, parentCode: "21000" },
    { code: "21300", name: "Payroll Liability", type: "liability", normalBalance: "credit", isPosting: true, level: 2, parentCode: "21000" },

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
    { code: "42000", name: "Sales Discount", type: "revenue", normalBalance: "debit", isPosting: true, level: 2, parentCode: "40000" },
    { code: "49000", name: "Uncategorized Income", type: "revenue", normalBalance: "credit", isPosting: true, level: 2, parentCode: "40000" },

    // EXPENSES
    { code: "50000", name: "Expenses", type: "expense", normalBalance: "debit", isPosting: false, level: 0, parentCode: null },
    { code: "51000", name: "Operating Expenses", type: "expense", normalBalance: "debit", isPosting: false, level: 1, parentCode: "50000" },
    { code: "51400", name: "Salaries and Wages", type: "expense", normalBalance: "debit", isPosting: true, level: 2, parentCode: "51000" },
    { code: "51700", name: "Marketing", type: "expense", normalBalance: "debit", isPosting: true, level: 2, parentCode: "51000" },
    { code: "52000", name: "Cost of Goods Sold", type: "expense", normalBalance: "debit", isPosting: true, level: 2, parentCode: "50000" },
    { code: "59000", name: "Uncategorized Expense", type: "expense", normalBalance: "debit", isPosting: true, level: 2, parentCode: "50000" },
    { code: "80000", name: "Other Expenses", type: "expense", normalBalance: "debit", isPosting: false, level: 0, parentCode: null },
    { code: "81000", name: "Exchange Gain/Loss", type: "expense", normalBalance: "debit", isPosting: true, level: 1, parentCode: "80000" },
];

export const MANUFACTURING_CHART_OF_ACCOUNTS: AccountTemplate[] = STANDARD_CHART_OF_ACCOUNTS.concat([
    { code: "11310", name: "Raw Materials", type: "asset", normalBalance: "debit", isPosting: true, level: 2, parentCode: "11000" },
    { code: "11320", name: "Work in Progress", type: "asset", normalBalance: "debit", isPosting: true, level: 2, parentCode: "11000" },
    { code: "11330", name: "Finished Goods", type: "asset", normalBalance: "debit", isPosting: true, level: 2, parentCode: "11000" },
]).sort((a, b) => a.code.localeCompare(b.code));

export const AVAILABLE_TEMPLATES = [
    { id: "umkm_balanced", name: "UMKM Balanced (Recommended)", description: "Ringkas untuk UMKM, mencakup akun wajib + akun operasional penting termasuk pendapatan service.", getTemplate: () => UMKM_BALANCED_CHART_OF_ACCOUNTS },
    { id: "general", name: "General Business", description: "Standard chart of accounts suitable for most businesses.", getTemplate: () => STANDARD_CHART_OF_ACCOUNTS },
    { id: "service", name: "Service Business", description: "Optimized for service-based businesses without physical inventory.", getTemplate: () => SERVICE_CHART_OF_ACCOUNTS },
    { id: "retail", name: "Retail / Trade", description: "Includes tracking for physical inventory and cost of goods sold.", getTemplate: () => RETAIL_CHART_OF_ACCOUNTS },
    { id: "manufacturing", name: "Manufacturing", description: "Includes raw materials, work in progress, and finished goods tracking.", getTemplate: () => MANUFACTURING_CHART_OF_ACCOUNTS },
];
