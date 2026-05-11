type AccountLocale = "en" | "id";

type LocalizedAccountName = {
  en: string;
  id: string;
};

const LOCALIZED_ACCOUNT_NAMES_BY_CODE: Record<string, LocalizedAccountName> = {
  "10000": { en: "Assets", id: "Aset" },
  "11000": { en: "Current Assets", id: "Aset Lancar" },
  "11100": { en: "Cash and Cash Equivalents", id: "Kas dan Setara Kas" },
  "11110": { en: "Bank - Main", id: "Bank - Utama" },
  "11120": { en: "Petty Cash", id: "Kas Kecil" },
  "11130": { en: "E-Wallet", id: "Dompet Digital" },
  "11200": { en: "Accounts Receivable", id: "Piutang Usaha" },
  "11300": { en: "Inventory Asset", id: "Aset Persediaan" },
  "11310": { en: "Raw Materials", id: "Bahan Baku" },
  "11320": { en: "Work in Progress", id: "Barang Dalam Proses" },
  "11330": { en: "Finished Goods", id: "Barang Jadi" },
  "11400": { en: "Purchase Tax Receivable", id: "Pajak Masukan" },
  "11900": { en: "Uncategorized Asset", id: "Aset Belum Terkategori" },
  "12000": { en: "Non-Current Assets", id: "Aset Tidak Lancar" },
  "12100": { en: "Fixed Assets", id: "Aset Tetap" },
  "12200": { en: "Accumulated Depreciation", id: "Akumulasi Penyusutan" },
  "20000": { en: "Liabilities", id: "Liabilitas" },
  "21000": { en: "Current Liabilities", id: "Liabilitas Jangka Pendek" },
  "21100": { en: "Accounts Payable", id: "Utang Usaha" },
  "21200": { en: "Sales Tax Payable", id: "Utang Pajak Keluaran" },
  "22000": { en: "Long-Term Liabilities", id: "Liabilitas Jangka Panjang" },
  "30000": { en: "Equity", id: "Ekuitas" },
  "31000": { en: "Capital", id: "Modal" },
  "32000": { en: "Retained Earnings", id: "Laba Ditahan" },
  "33000": { en: "Opening Balance Equity", id: "Ekuitas Saldo Awal" },
  "40000": { en: "Revenue", id: "Pendapatan" },
  "41000": { en: "Operating Revenue", id: "Pendapatan Operasional" },
  "41100": { en: "Service Revenue", id: "Pendapatan Jasa" },
  "41200": { en: "Product Sales", id: "Penjualan Produk" },
  "41300": { en: "Consulting Income", id: "Pendapatan Konsultasi" },
  "42000": { en: "Sales Discount", id: "Diskon Penjualan" },
  "49000": { en: "Uncategorized Income", id: "Pendapatan Belum Terkategori" },
  "50000": { en: "Expenses", id: "Beban" },
  "51000": { en: "Operating Expenses", id: "Beban Operasional" },
  "51100": { en: "Rent Expense", id: "Beban Sewa" },
  "51200": { en: "Utilities Expense", id: "Beban Utilitas" },
  "51300": { en: "Office Supplies", id: "Perlengkapan Kantor" },
  "51400": { en: "Salaries and Wages", id: "Beban Gaji dan Upah" },
  "51500": { en: "Software Subscriptions", id: "Langganan Perangkat Lunak" },
  "51600": { en: "Travel Expense", id: "Beban Perjalanan" },
  "51700": { en: "Marketing", id: "Pemasaran" },
  "51800": { en: "Insurance Expense", id: "Beban Asuransi" },
  "51900": { en: "Depreciation Expense", id: "Beban Penyusutan" },
  "52000": { en: "Cost of Goods Sold", id: "Harga Pokok Penjualan" },
  "59000": { en: "Uncategorized Expense", id: "Beban Belum Terkategori" },
  "80000": { en: "Other Expenses", id: "Beban Lainnya" },
  "81000": { en: "Exchange Gain/Loss", id: "Laba/Rugi Selisih Kurs" },
};

export function resolveAccountLocale(locale: string | null | undefined): AccountLocale {
  return locale?.toLowerCase().startsWith("id") ? "id" : "en";
}

export function getLocalizedAccountName(params: {
  code?: string | null;
  name: string;
  locale?: string | null;
}): string {
  const locale = resolveAccountLocale(params.locale);
  const code = params.code ?? "";
  const localized = LOCALIZED_ACCOUNT_NAMES_BY_CODE[code];
  return localized?.[locale] ?? params.name;
}

export function formatLocalizedAccountLabel(
  account: { code?: string | null; name: string },
  locale?: string | null,
): string {
  const name = getLocalizedAccountName({
    code: account.code,
    name: account.name,
    locale,
  });
  const code = account.code ?? "";
  return code ? `${code} - ${name}` : name;
}
