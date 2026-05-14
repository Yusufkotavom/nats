import "dotenv/config";
import { Decimal } from "decimal.js";
import { prisma } from "./seed/utils";
import { seedAccounting } from "./seed/accounting";
import { seedCompany } from "./seed/company";
import { seedUsers } from "./seed/users";
import {
  CashAccountType,
  ContactType,
  MovementStatus,
  MovementType,
  POSSessionStatus,
  PurchaseInvoiceStatus,
  PurchaseOrderStatus,
  PurchaseReceiveStatus,
  SalesInvoiceStatus,
  SalesOrderStatus,
} from "./generated/prisma/client";

const d = (value: number | string) => new Decimal(value);
const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);
const daysFrom = (date: Date, days: number) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

export type RestaurantProduct = {
  sku: string;
  name: string;
  description: string;
  category: string;
  unit: string;
  price: number;
  cost: number;
  minStock: number;
  outletStock: number;
  gudangStock: number;
};

type RestaurantMenuCatalogItem = {
  sku: string;
  name: string;
  category: string;
  price: number;
  unit?: string;
  bomHint: string;
};

type MenuSeedMode = "full" | "minimal";

export type RestaurantPackageBomSeed = {
  bomNumber: string;
  productSku: string;
  name: string;
  quantity: number;
  components: Array<{
    sku: string;
    quantity: number;
  }>;
};

const MENU_CATALOG: RestaurantMenuCatalogItem[] = [
  { sku: "ID-UDS-TELOR-ASIN", name: "Udang Super Telor Asin", category: "Menu Seafood", price: 150000, bomHint: "udang, tepung, telur asin, minyak" },
  { sku: "ID-UDS-BAKAR-MADU", name: "Udang Super Bakar Madu", category: "Menu Seafood", price: 140000, bomHint: "udang, madu, kecap, margarin" },
  { sku: "ID-UDS-SAUS-PADANG", name: "Udang Super Saus Padang", category: "Menu Seafood", price: 140000, bomHint: "udang, cabai, bawang, saus tomat" },
  { sku: "ID-UDS-ASAM-MANIS", name: "Udang Super Asam Manis", category: "Menu Seafood", price: 135000, bomHint: "udang, saus asam manis, bawang" },
  { sku: "ID-UDS-SAUS-TIRAM", name: "Udang Super Saus Tiram", category: "Menu Seafood", price: 135000, bomHint: "udang, saus tiram, bawang, minyak wijen" },
  { sku: "ID-UDS-GORENG-TEPUNG", name: "Udang Super Goreng Tepung", category: "Menu Seafood", price: 135000, bomHint: "udang, tepung, minyak" },
  { sku: "ID-UDS-GORENG", name: "Udang Super Goreng", category: "Menu Seafood", price: 135000, bomHint: "udang, bumbu marinasi, minyak" },
  { sku: "ID-UDS-REBUS", name: "Udang Super Rebus", category: "Menu Seafood", price: 135000, bomHint: "udang, garam, jeruk nipis" },
  { sku: "ID-UDS-SOP", name: "Udang Super Sop", category: "Menu Seafood", price: 135000, bomHint: "udang, kaldu, sayur sop" },
  { sku: "ID-UDT-TELOR-ASIN", name: "Udang Standar Telor Asin", category: "Menu Seafood", price: 135000, bomHint: "udang, tepung, telur asin, minyak" },
  { sku: "ID-UDT-BAKAR-MADU", name: "Udang Standar Bakar Madu", category: "Menu Seafood", price: 125000, bomHint: "udang, madu, kecap, margarin" },
  { sku: "ID-UDT-SAUS-PADANG", name: "Udang Standar Saus Padang", category: "Menu Seafood", price: 125000, bomHint: "udang, cabai, bawang, saus tomat" },
  { sku: "ID-UDT-ASAM-MANIS", name: "Udang Standar Asam Manis", category: "Menu Seafood", price: 120000, bomHint: "udang, saus asam manis, bawang" },
  { sku: "ID-UDT-SAUS-TIRAM", name: "Udang Standar Saus Tiram", category: "Menu Seafood", price: 120000, bomHint: "udang, saus tiram, bawang, minyak wijen" },
  { sku: "ID-UDT-GORENG-TEPUNG", name: "Udang Standar Goreng Tepung", category: "Menu Seafood", price: 120000, bomHint: "udang, tepung, minyak" },
  { sku: "ID-UDT-GORENG", name: "Udang Standar Goreng", category: "Menu Seafood", price: 120000, bomHint: "udang, bumbu marinasi, minyak" },
  { sku: "ID-UDT-REBUS", name: "Udang Standar Rebus", category: "Menu Seafood", price: 120000, bomHint: "udang, garam, jeruk nipis" },
  { sku: "ID-UDT-SOP", name: "Udang Standar Sop", category: "Menu Seafood", price: 120000, bomHint: "udang, kaldu, sayur sop" },
  { sku: "ID-GURAME-FILLET-TELOR-ASIN", name: "Gurame Fillet Telor Asin", category: "Menu Ikan", price: 125000, bomHint: "gurame fillet, telur asin, tepung" },
  { sku: "ID-GURAME-CENGHAR", name: "Gurame Cenghar", category: "Menu Ikan", price: 125000, bomHint: "gurame, bumbu cenghar, cabai" },
  { sku: "ID-GURAME-KECOMBRANG", name: "Gurame Kecombrang", category: "Menu Ikan", price: 125000, bomHint: "gurame, kecombrang, bawang, cabai" },
  { sku: "ID-GURAME-FILLET-ASAM-MANIS", name: "Gurame Fillet Asam Manis", category: "Menu Ikan", price: 120000, bomHint: "gurame fillet, saus asam manis" },
  { sku: "ID-GURAME-FILLET-SAUS-PADANG", name: "Gurame Fillet Saus Padang", category: "Menu Ikan", price: 120000, bomHint: "gurame fillet, bumbu padang" },
  { sku: "ID-GURAME-FILLET-SAUS-TIRAM", name: "Gurame Fillet Saus Tiram", category: "Menu Ikan", price: 120000, bomHint: "gurame fillet, saus tiram" },
  { sku: "ID-GURAME-PESMOL", name: "Gurame Pesmol", category: "Menu Ikan", price: 120000, bomHint: "gurame, kunyit, kemiri, bawang" },
  { sku: "ID-GURAME-TERBANG", name: "Gurame Terbang", category: "Menu Ikan", price: 120000, bomHint: "gurame, tepung tipis, minyak" },
  { sku: "ID-GURAME-BAKAR-MADU", name: "Gurame Bakar Madu", category: "Menu Ikan", price: 115000, bomHint: "gurame, madu, kecap, margarin" },
  { sku: "ID-GURAME-BAKAR-KECAP", name: "Gurame Bakar Kecap", category: "Menu Ikan", price: 115000, bomHint: "gurame, kecap, bawang, cabai" },
  { sku: "ID-GURAME-COBEK", name: "Gurame Bumbu Cobek", category: "Menu Ikan", price: 115000, bomHint: "gurame, sambal cobek, tomat, bawang" },
  { sku: "ID-GURAME-SAUS-TIRAM", name: "Gurame Saus Tiram", category: "Menu Ikan", price: 115000, bomHint: "gurame, saus tiram, bawang" },
  { sku: "ID-GURAME-SAUS-PADANG", name: "Gurame Saus Padang", category: "Menu Ikan", price: 115000, bomHint: "gurame, bumbu padang" },
  { sku: "ID-GURAME-ASAM-MANIS", name: "Gurame Asam Manis", category: "Menu Ikan", price: 115000, bomHint: "gurame, saus asam manis" },
  { sku: "ID-GURAME-SOP", name: "Gurame Sop", category: "Menu Ikan", price: 115000, bomHint: "gurame, kaldu, sayur sop" },
  { sku: "ID-GURAME-GORENG", name: "Gurame Goreng", category: "Menu Ikan", price: 115000, bomHint: "gurame, bumbu marinasi, minyak" },
  { sku: "ID-KERAPU-BAKAR-MADU", name: "Kerapu Bakar Madu", category: "Menu Ikan", price: 130000, bomHint: "kerapu, madu, kecap" },
  { sku: "ID-KERAPU-SAUS-TIRAM", name: "Kerapu Saus Tiram", category: "Menu Ikan", price: 130000, bomHint: "kerapu, saus tiram, bawang" },
  { sku: "ID-KERAPU-SAUS-PADANG", name: "Kerapu Saus Padang", category: "Menu Ikan", price: 130000, bomHint: "kerapu, bumbu padang" },
  { sku: "ID-KERAPU-ASAM-MANIS", name: "Kerapu Asam Manis", category: "Menu Ikan", price: 130000, bomHint: "kerapu, saus asam manis" },
  { sku: "ID-KERAPU-SAUS-MANGGA", name: "Kerapu Saus Mangga", category: "Menu Ikan", price: 130000, bomHint: "kerapu, mangga muda, cabai" },
  { sku: "ID-KERAPU-PESMOL", name: "Kerapu Pesmol", category: "Menu Ikan", price: 130000, bomHint: "kerapu, kunyit, kemiri, bawang" },
  { sku: "ID-KERAPU-BAKAR-KECAP", name: "Kerapu Bakar Kecap", category: "Menu Ikan", price: 130000, bomHint: "kerapu, kecap, bawang, cabai" },
  { sku: "ID-KERAPU-GORENG", name: "Kerapu Goreng", category: "Menu Ikan", price: 130000, bomHint: "kerapu, bumbu marinasi, minyak" },
  { sku: "ID-SEAFOOD-MANG-ENGKING", name: "Seafood Mang Engking", category: "Menu Paket", price: 260000, bomHint: "mix seafood, sambal, sayur pelengkap" },
  { sku: "ID-KEPITING-JANTAN-TELOR-ASIN", name: "Kepiting Jantan Telor Asin", category: "Menu Kepiting", price: 145000, bomHint: "kepiting, telur asin, tepung" },
  { sku: "ID-KEPITING-JANTAN-SAUS-PADANG", name: "Kepiting Jantan Saus Padang", category: "Menu Kepiting", price: 135000, bomHint: "kepiting, bumbu padang" },
  { sku: "ID-KEPITING-JANTAN-SAUS-TIRAM", name: "Kepiting Jantan Saus Tiram", category: "Menu Kepiting", price: 130000, bomHint: "kepiting, saus tiram, bawang" },
  { sku: "ID-KEPITING-JANTAN-ASAM-MANIS", name: "Kepiting Jantan Asam Manis", category: "Menu Kepiting", price: 130000, bomHint: "kepiting, saus asam manis" },
  { sku: "ID-KEPITING-JANTAN-GORENG", name: "Kepiting Jantan Goreng", category: "Menu Kepiting", price: 130000, bomHint: "kepiting, bumbu marinasi, minyak" },
  { sku: "ID-KEPITING-JANTAN-REBUS", name: "Kepiting Jantan Rebus", category: "Menu Kepiting", price: 130000, bomHint: "kepiting, garam, jahe" },
  { sku: "ID-KEPITING-SOKA-TELOR-ASIN", name: "Kepiting Soka Telor Asin", category: "Menu Kepiting", price: 140000, bomHint: "kepiting soka, telur asin, tepung" },
  { sku: "ID-KEPITING-SOKA-SAUS-PADANG", name: "Kepiting Soka Saus Padang", category: "Menu Kepiting", price: 130000, bomHint: "kepiting soka, bumbu padang" },
  { sku: "ID-KEPITING-SOKA-SAUS-TIRAM", name: "Kepiting Soka Saus Tiram", category: "Menu Kepiting", price: 125000, bomHint: "kepiting soka, saus tiram" },
  { sku: "ID-KEPITING-SOKA-ASAM-MANIS", name: "Kepiting Soka Asam Manis", category: "Menu Kepiting", price: 125000, bomHint: "kepiting soka, saus asam manis" },
  { sku: "ID-KEPITING-SOKA-GORENG-TEPUNG", name: "Kepiting Soka Goreng Tepung", category: "Menu Kepiting", price: 125000, bomHint: "kepiting soka, tepung, minyak" },
  { sku: "ID-CUMI-TELOR-ASIN", name: "Cumi Telor Asin", category: "Menu Cumi & Kerang", price: 80000, bomHint: "cumi, telur asin, tepung" },
  { sku: "ID-CUMI-SAUS-PADANG", name: "Cumi Saus Padang", category: "Menu Cumi & Kerang", price: 70000, bomHint: "cumi, bumbu padang" },
  { sku: "ID-CUMI-SAUS-TIRAM", name: "Cumi Saus Tiram", category: "Menu Cumi & Kerang", price: 70000, bomHint: "cumi, saus tiram" },
  { sku: "ID-CUMI-ASAM-MANIS", name: "Cumi Asam Manis", category: "Menu Cumi & Kerang", price: 70000, bomHint: "cumi, saus asam manis" },
  { sku: "ID-CUMI-GORENG-TEPUNG", name: "Cumi Goreng Tepung", category: "Menu Cumi & Kerang", price: 70000, bomHint: "cumi, tepung, minyak" },
  { sku: "ID-CUMI-GORENG", name: "Cumi Goreng", category: "Menu Cumi & Kerang", price: 70000, bomHint: "cumi, bumbu marinasi, minyak" },
  { sku: "ID-KERANG-SAUS-PADANG", name: "Kerang Saus Padang", category: "Menu Cumi & Kerang", price: 70000, bomHint: "kerang, bumbu padang" },
  { sku: "ID-KERANG-SAUS-TIRAM", name: "Kerang Saus Tiram", category: "Menu Cumi & Kerang", price: 70000, bomHint: "kerang, saus tiram" },
  { sku: "ID-KERANG-SAUS-ASAM-MANIS", name: "Kerang Saus Asam Manis", category: "Menu Cumi & Kerang", price: 70000, bomHint: "kerang, saus asam manis" },
  { sku: "ID-SIMPING-GORENG", name: "Kerang Simping Goreng", category: "Menu Cumi & Kerang", price: 70000, bomHint: "kerang simping, tepung, minyak" },
  { sku: "ID-SIMPING-REBUS", name: "Kerang Simping Rebus", category: "Menu Cumi & Kerang", price: 70000, bomHint: "kerang simping, garam, jahe" },
  { sku: "ID-BANDENG-TELOR-ASIN", name: "Bandeng Tanpa Duri Telor Asin", category: "Menu Ikan", price: 75000, bomHint: "bandeng, telur asin, tepung" },
  { sku: "ID-BANDENG-BAKAR-KECAP", name: "Bandeng Bakar Kecap", category: "Menu Ikan", price: 70000, bomHint: "bandeng, kecap, bawang" },
  { sku: "ID-BANDENG-BAKAR-MADU", name: "Bandeng Bakar Madu", category: "Menu Ikan", price: 70000, bomHint: "bandeng, madu, kecap" },
  { sku: "ID-BANDENG-SAUS-PADANG", name: "Bandeng Saus Padang", category: "Menu Ikan", price: 70000, bomHint: "bandeng, bumbu padang" },
  { sku: "ID-BANDENG-SAUS-ASAM-MANIS", name: "Bandeng Saus Asam Manis", category: "Menu Ikan", price: 70000, bomHint: "bandeng, saus asam manis" },
  { sku: "ID-BANDENG-SAUS-TIRAM", name: "Bandeng Saus Tiram", category: "Menu Ikan", price: 70000, bomHint: "bandeng, saus tiram" },
  { sku: "ID-AYAM-GRG-SERUNDENG", name: "Ayam Goreng Serundeng", category: "Menu Ayam Bebek Sapi", price: 99000, bomHint: "ayam, bumbu serundeng, kelapa parut" },
  { sku: "ID-AYAM-GRG-KREMES", name: "Ayam Goreng Kremes", category: "Menu Ayam Bebek Sapi", price: 99000, bomHint: "ayam, adonan kremes, minyak" },
  { sku: "ID-AYAM-BAKAR-MADU", name: "Ayam Bakar Madu", category: "Menu Ayam Bebek Sapi", price: 99000, bomHint: "ayam, madu, kecap, bawang" },
  { sku: "ID-AYAM-BAKAR-KECAP", name: "Ayam Bakar Kecap", category: "Menu Ayam Bebek Sapi", price: 99000, bomHint: "ayam, kecap, bawang, cabai" },
  { sku: "ID-BEBEK-GRG-SERUNDENG", name: "Bebek Goreng Serundeng", category: "Menu Ayam Bebek Sapi", price: 130000, bomHint: "bebek, bumbu serundeng, kelapa" },
  { sku: "ID-BEBEK-GRG-KREMES", name: "Bebek Goreng Kremes", category: "Menu Ayam Bebek Sapi", price: 130000, bomHint: "bebek, adonan kremes, minyak" },
  { sku: "ID-SAPI-TUMIS-PEDAS", name: "Daging Sapi Tumis Pedas", category: "Menu Ayam Bebek Sapi", price: 90000, bomHint: "daging sapi, cabai, bawang, saus" },
  { sku: "ID-SOP-IGA-SAPI", name: "Sop Iga Sapi", category: "Menu Ayam Bebek Sapi", price: 80000, bomHint: "iga sapi, kaldu, wortel, kentang" },
  { sku: "ID-SOP-BUNTUT", name: "Sop Buntut", category: "Menu Ayam Bebek Sapi", price: 80000, bomHint: "buntut sapi, kaldu, sayur sop" },
  { sku: "ID-IGA-BAKAR-MADU", name: "Iga Bakar Madu", category: "Menu Ayam Bebek Sapi", price: 80000, bomHint: "iga sapi, madu, kecap" },
  { sku: "ID-IGA-PENYET", name: "Iga Penyet", category: "Menu Ayam Bebek Sapi", price: 80000, bomHint: "iga sapi, sambal penyet, lalapan" },
  { sku: "ID-RAWON", name: "Rawon", category: "Menu Ayam Bebek Sapi", price: 80000, bomHint: "daging sapi, kluwek, tauge pendek" },
  { sku: "ID-TAHU-GORENG", name: "Tahu Goreng", category: "Menu Sayuran & Lauk", price: 12000, bomHint: "tahu, bumbu, minyak" },
  { sku: "ID-TEMPE-GORENG", name: "Tempe Goreng", category: "Menu Sayuran & Lauk", price: 12000, bomHint: "tempe, bumbu, minyak" },
  { sku: "ID-TAHU-TEMPE-GORENG", name: "Tahu + Tempe Goreng", category: "Menu Sayuran & Lauk", price: 12000, bomHint: "tahu, tempe, bumbu, minyak" },
  { sku: "ID-SAMBAL-PETAI", name: "Sambal Petai", category: "Menu Nasi & Sambal", price: 25000, bomHint: "petai, cabai, bawang, tomat" },
  { sku: "ID-SAMBAL-TERASI-DADAK", name: "Sambal Terasi Dadak", category: "Menu Nasi & Sambal", price: 25000, bomHint: "cabai, terasi, tomat, bawang" },
  { sku: "ID-SAMBAL-PENCIT", name: "Sambal Pencit", category: "Menu Nasi & Sambal", price: 8500, bomHint: "mangga muda, cabai, gula" },
  { sku: "ID-SAMBAL-MATAH", name: "Sambal Matah", category: "Menu Nasi & Sambal", price: 8500, bomHint: "bawang merah, cabai, serai, minyak" },
  { sku: "ID-SAMBAL-TOMAT", name: "Sambal Tomat", category: "Menu Nasi & Sambal", price: 7500, bomHint: "tomat, cabai, bawang" },
  { sku: "ID-SAMBAL-KECAP", name: "Sambal Kecap", category: "Menu Nasi & Sambal", price: 7500, bomHint: "kecap, cabai, bawang" },
  { sku: "ID-SAMBAL-BAWANG", name: "Sambal Bawang", category: "Menu Nasi & Sambal", price: 7500, bomHint: "cabai, bawang, minyak" },
  { sku: "ID-SAMBAL-TOLENGJENG", name: "Sambal Tolengjeng", category: "Menu Nasi & Sambal", price: 7500, bomHint: "cabai, bawang, rempah khas" },
  { sku: "ID-SAMBAL-HEJO", name: "Sambal Hejo", category: "Menu Nasi & Sambal", price: 7500, bomHint: "cabai hijau, tomat hijau, bawang" },
  { sku: "ID-SAMBAL-SEGAR", name: "Sambal Segar", category: "Menu Nasi & Sambal", price: 7500, bomHint: "cabai segar, tomat, bawang" },
  { sku: "ID-NASI-PUTIH", name: "Nasi Putih", category: "Menu Nasi & Sambal", price: 10000, bomHint: "beras, air" },
  { sku: "ID-NASI-BAKUL-KECIL", name: "Nasi Bakul Kecil", category: "Menu Nasi & Sambal", price: 40000, bomHint: "beras, air, daun pisang opsional" },
  { sku: "ID-NASI-BAKUL-BESAR", name: "Nasi Bakul Besar", category: "Menu Nasi & Sambal", price: 60000, bomHint: "beras, air, daun pisang opsional" },
  { sku: "ID-NASI-LIWET", name: "Nasi Liwet", category: "Menu Nasi & Sambal", price: 44000, bomHint: "beras, santan, daun salam, serai" },
  { sku: "ID-PAKET-10-ORANG", name: "Paket 10 Orang", category: "Menu Paket", price: 1195000, bomHint: "bundle multi-menu sesuai daftar paket" },
  { sku: "ID-PAKET-6-ORANG", name: "Paket 6 Orang", category: "Menu Paket", price: 795000, bomHint: "bundle multi-menu sesuai daftar paket" },
  { sku: "ID-PAKET-4-ORANG", name: "Paket 4 Orang", category: "Menu Paket", price: 495000, bomHint: "bundle multi-menu sesuai daftar paket" },
  { sku: "ID-CAPCAY-SEAFOOD", name: "Capcay Seafood", category: "Menu Sayuran & Lauk", price: 45000, bomHint: "mix sayur, udang/cumi, saus" },
  { sku: "ID-CAPCAY-AYAM", name: "Capcay Ayam", category: "Menu Sayuran & Lauk", price: 35000, bomHint: "mix sayur, ayam, saus" },
  { sku: "ID-CAPCAY-BIASA", name: "Capcay Biasa", category: "Menu Sayuran & Lauk", price: 30000, bomHint: "mix sayur, bawang, saus" },
  { sku: "ID-KAREDOK", name: "Karedok", category: "Menu Sayuran & Lauk", price: 30000, bomHint: "sayuran segar, bumbu kacang" },
  { sku: "ID-TUMIS-KANGKUNG", name: "Tumis Kangkung", category: "Menu Sayuran & Lauk", price: 30000, bomHint: "kangkung, bawang, cabai" },
  { sku: "ID-TUMIS-GENJER", name: "Tumis Genjer", category: "Menu Sayuran & Lauk", price: 30000, bomHint: "genjer, bawang, cabai" },
  { sku: "ID-TUMIS-BABY-KAILAN", name: "Tumis Baby Kailan", category: "Menu Sayuran & Lauk", price: 30000, bomHint: "baby kailan, bawang putih, saus tiram" },
  { sku: "ID-TUMIS-BROKOLI", name: "Tumis Brokoli", category: "Menu Sayuran & Lauk", price: 30000, bomHint: "brokoli, bawang putih, saus" },
  { sku: "ID-TUMIS-DAUN-PEPAYA", name: "Tumis Daun Pepaya", category: "Menu Sayuran & Lauk", price: 30000, bomHint: "daun pepaya, bawang, cabai" },
  { sku: "ID-TUMIS-BABY-BUNCIS", name: "Tumis Baby Buncis", category: "Menu Sayuran & Lauk", price: 30000, bomHint: "baby buncis, bawang, saus" },
  { sku: "ID-OSENG-TOGE-IKAN-TERI", name: "Oseng Toge Ikan Teri", category: "Menu Sayuran & Lauk", price: 30000, bomHint: "toge, ikan teri, bawang, cabai" },
  { sku: "ID-OSENG-TEMPE-LEUNCA", name: "Oseng Tempe Leunca", category: "Menu Sayuran & Lauk", price: 30000, bomHint: "tempe, leunca, bawang, cabai" },
  { sku: "ID-SAYUR-ASEM", name: "Sayur Asem", category: "Menu Sayuran & Lauk", price: 25000, bomHint: "sayur asem mix, asam jawa, gula" },
  { sku: "ID-PETAI-BAKAR-GORENG-REBUS", name: "Petai Bakar/Goreng/Rebus", category: "Menu Sayuran & Lauk", price: 30000, bomHint: "petai, minyak/air, bumbu sederhana" },
  { sku: "ID-LALAPAN-MENTAH", name: "Lalapan Mentah", category: "Menu Sayuran & Lauk", price: 15000, bomHint: "timun, kemangi, kol, selada" },
  { sku: "ID-ES-TELER", name: "Es Teler", category: "Menu Minuman", price: 33000, bomHint: "alpukat, kelapa, nangka, susu, es" },
  { sku: "ID-ES-CAMPUR", name: "Es Campur", category: "Menu Minuman", price: 33000, bomHint: "campuran buah/jeli, sirup, es" },
  { sku: "ID-ES-DAWET", name: "Es Dawet", category: "Menu Minuman", price: 25000, bomHint: "cendol, santan, gula merah, es" },
  { sku: "ID-ES-MARQUISA", name: "Es Marquisa", category: "Menu Minuman", price: 25000, bomHint: "sirup markisa, gula, es" },
  { sku: "ID-ES-LEMON-TEA", name: "Es Lemon Tea", category: "Menu Minuman", price: 25000, bomHint: "teh, lemon, gula, es" },
  { sku: "ID-ES-JERUK-NIPIS", name: "Es Jeruk Nipis", category: "Menu Minuman", price: 22500, bomHint: "jeruk nipis, gula, es" },
  { sku: "ID-ES-JERUK-MANIS", name: "Es Jeruk Manis", category: "Menu Minuman", price: 25000, bomHint: "jeruk manis, gula, es" },
  { sku: "ID-ES-TEH-MANIS", name: "Es Teh Manis", category: "Menu Minuman", price: 10000, bomHint: "teh, gula, es" },
  { sku: "ID-ES-TEH-TAWAR", name: "Es Teh Tawar", category: "Menu Minuman", price: 7500, bomHint: "teh, es" },
  { sku: "ID-ES-SUSU-PUTIH-COKLAT", name: "Es Susu Putih/Coklat", category: "Menu Minuman", price: 15000, bomHint: "susu, coklat/sirup, es" },
  { sku: "ID-LECI-TEA", name: "Leci Tea", category: "Menu Minuman", price: 23000, bomHint: "teh, leci, gula, es" },
  { sku: "ID-AIR-MINERAL-600", name: "Air Mineral Prim-A 600 ml", category: "Menu Minuman", price: 10000, unit: "Botol", bomHint: "produk jadi siap jual" },
  { sku: "ID-AIR-ES-BATU", name: "Air Es / Es Batu", category: "Menu Minuman", price: 2000, bomHint: "es batu, air" },
  { sku: "ID-MILKSHAKE-STRAWBERRY", name: "Milkshake Strawberry", category: "Menu Minuman", price: 27500, bomHint: "susu, es krim, sirup strawberry" },
  { sku: "ID-MILKSHAKE-VANILLA", name: "Milkshake Vanilla", category: "Menu Minuman", price: 27500, bomHint: "susu, es krim vanilla" },
  { sku: "ID-MILKSHAKE-CHOCOLATE", name: "Milkshake Chocolate", category: "Menu Minuman", price: 27500, bomHint: "susu, es krim coklat" },
  { sku: "ID-FLOAT-STRAWBERRY", name: "Float Strawberry", category: "Menu Minuman", price: 35000, bomHint: "soft drink/susu, es krim strawberry" },
  { sku: "ID-FLOAT-VANILLA", name: "Float Vanilla", category: "Menu Minuman", price: 35000, bomHint: "soft drink/susu, es krim vanilla" },
  { sku: "ID-FLOAT-CHOCOLATE", name: "Float Chocolate", category: "Menu Minuman", price: 35000, bomHint: "soft drink/susu, es krim coklat" },
  { sku: "ID-FLOAT-CAPPUCCINO", name: "Float Cappuccino", category: "Menu Minuman", price: 35000, bomHint: "kopi, susu, es krim vanilla" },
  { sku: "ID-FLOAT-MANGGA", name: "Float Mangga", category: "Menu Minuman", price: 35000, bomHint: "sirup mangga, es krim vanilla" },
  { sku: "ID-FLOAT-ALPUKAT", name: "Float Alpukat", category: "Menu Minuman", price: 35000, bomHint: "alpukat, susu, es krim vanilla" },
  { sku: "ID-MINP-MARQUISA", name: "Marquisa Panas", category: "Menu Minuman", price: 22000, bomHint: "sirup markisa, air panas" },
  { sku: "ID-MINP-LEMON-TEA", name: "Lemon Tea Panas", category: "Menu Minuman", price: 24000, bomHint: "teh, lemon, air panas" },
  { sku: "ID-MINP-JERUK-MANIS", name: "Jeruk Manis Panas", category: "Menu Minuman", price: 22000, bomHint: "jeruk manis, air panas" },
  { sku: "ID-MINP-JERUK-NIPIS", name: "Jeruk Nipis Panas", category: "Menu Minuman", price: 22000, bomHint: "jeruk nipis, air panas" },
  { sku: "ID-MINP-TEH-TAWAR", name: "Teh Tawar Panas", category: "Menu Minuman", price: 5000, bomHint: "teh, air panas" },
  { sku: "ID-MINP-TEH-MANIS", name: "Teh Manis Panas", category: "Menu Minuman", price: 8000, bomHint: "teh, gula, air panas" },
  { sku: "ID-MINP-KOPI-HITAM", name: "Kopi Hitam", category: "Menu Minuman", price: 15000, bomHint: "kopi bubuk, air panas" },
  { sku: "ID-MINP-KOPI-SUSU", name: "Kopi Susu", category: "Menu Minuman", price: 15000, bomHint: "kopi, susu, gula" },
  { sku: "ID-MINP-SUSU-PUTIH-COKLAT", name: "Susu Putih / Coklat Panas", category: "Menu Minuman", price: 15000, bomHint: "susu, coklat opsional" },
  { sku: "ID-MINP-LATTE", name: "Latte", category: "Menu Minuman", price: 15000, bomHint: "espresso, susu" },
  { sku: "ID-MINP-VANILLA-LATTE", name: "Vanilla Latte", category: "Menu Minuman", price: 15000, bomHint: "espresso, susu, vanilla" },
  { sku: "ID-MINP-MOCHA-LATTE", name: "Mocha Latte", category: "Menu Minuman", price: 15000, bomHint: "espresso, susu, coklat" },
  { sku: "ID-MINP-CAPPUCINO", name: "Cappucino Panas", category: "Menu Minuman", price: 15000, bomHint: "espresso, susu foam" },
  { sku: "ID-JUS-DURIAN", name: "Jus Durian", category: "Menu Minuman", price: 33000, bomHint: "buah durian, gula, air/es" },
  { sku: "ID-JUS-ALPUKAT", name: "Jus Alpukat", category: "Menu Minuman", price: 28000, bomHint: "alpukat, gula, susu opsional" },
  { sku: "ID-JUS-STRAWBERRY", name: "Jus Strawberry", category: "Menu Minuman", price: 25000, bomHint: "strawberry, gula, air/es" },
  { sku: "ID-JUS-MELON", name: "Jus Melon", category: "Menu Minuman", price: 23000, bomHint: "melon, gula, air/es" },
  { sku: "ID-JUS-JAMBU", name: "Jus Jambu", category: "Menu Minuman", price: 23000, bomHint: "jambu, gula, air/es" },
  { sku: "ID-JUS-SIRSAK", name: "Jus Sirsak", category: "Menu Minuman", price: 23000, bomHint: "sirsak, gula, air/es" },
  { sku: "ID-JUS-TOMAT", name: "Jus Tomat", category: "Menu Minuman", price: 23000, bomHint: "tomat, gula, air/es" },
  { sku: "ID-JUS-SEMANGKA", name: "Jus Semangka", category: "Menu Minuman", price: 23000, bomHint: "semangka, gula, air/es" },
  { sku: "ID-JUS-APEL", name: "Jus Apel", category: "Menu Minuman", price: 23000, bomHint: "apel, gula, air/es" },
  { sku: "ID-JUS-JERUK", name: "Jus Jeruk", category: "Menu Minuman", price: 23000, bomHint: "jeruk, gula, air/es" },
  { sku: "ID-JUS-MANGGA", name: "Jus Mangga", category: "Menu Minuman", price: 23000, bomHint: "mangga, gula, air/es" },
  { sku: "ID-JUS-PEPAYA", name: "Jus Pepaya", category: "Menu Minuman", price: 23000, bomHint: "pepaya, gula, air/es" },
  { sku: "ID-ES-KELAPA-KOPYOR", name: "Es Kelapa Kopyor", category: "Menu Minuman", price: 45000, bomHint: "kelapa kopyor, sirup, es" },
  { sku: "ID-KELAPA-MUDA-UTUH", name: "Kelapa Muda Utuh", category: "Menu Minuman", price: 30000, bomHint: "kelapa muda utuh" },
  { sku: "ID-KELAPA-MUDA-UTUH-JERUK", name: "Kelapa Muda Utuh + Jeruk", category: "Menu Minuman", price: 35000, bomHint: "kelapa muda, jeruk" },
  { sku: "ID-ES-KELAPA-MUDA-GELAS", name: "Es Kelapa Muda Gelas", category: "Menu Minuman", price: 25000, bomHint: "daging kelapa muda, es, sirup" },
  { sku: "ID-ES-KELAPA-MUDA-GELAS-JERUK", name: "Es Kelapa Muda Gelas + Jeruk", category: "Menu Minuman", price: 27500, bomHint: "kelapa muda, jeruk, es" },
  { sku: "ID-ES-CINCAU", name: "Es Cincau", category: "Menu Minuman", price: 25000, bomHint: "cincau, sirup gula, es" },
  { sku: "ID-BANDREK-ORIGINAL-PANAS", name: "Bandrek Original Panas", category: "Menu Minuman", price: 20000, bomHint: "jahe, gula aren, rempah" },
  { sku: "ID-BANDREK-SUSU-PANAS", name: "Bandrek Susu Panas", category: "Menu Minuman", price: 20000, bomHint: "jahe, susu, gula aren" },
  { sku: "ID-ES-KUWUT", name: "Es Kuwut", category: "Menu Minuman", price: 25000, bomHint: "melon, selasih, jeruk, es" },
  { sku: "ID-SODA-GEMBIRA", name: "Soda Gembira", category: "Menu Minuman", price: 25000, bomHint: "soda, susu kental manis, sirup" },
  { sku: "ID-LEMON-SQUASH", name: "Lemon Squash", category: "Menu Minuman", price: 25000, bomHint: "lemon, soda, gula" },
  { sku: "ID-ES-MARQUISA-SODA", name: "Es Marquisa Soda", category: "Menu Minuman", price: 25000, bomHint: "sirup markisa, soda, es" },
  { sku: "ID-RUJAK-MANIS", name: "Rujak Manis", category: "Menu Dessert", price: 30000, bomHint: "buah mix, bumbu rujak" },
  { sku: "ID-ES-CREAM-GORENG", name: "Es Cream Goreng", category: "Menu Dessert", price: 30000, bomHint: "es krim, roti/tepung, minyak" },
  { sku: "ID-SINGKONG-GORENG", name: "Singkong Goreng", category: "Menu Dessert", price: 30000, bomHint: "singkong, minyak, garam" },
  { sku: "ID-BUAH-POTONG", name: "Buah Potong", category: "Menu Dessert", price: 25000, bomHint: "buah segar mix" },
  { sku: "ID-ICE-CREAM-STRAWBERRY", name: "Ice Cream Strawberry", category: "Menu Dessert", price: 25000, bomHint: "es krim strawberry siap saji" },
  { sku: "ID-ICE-CREAM-VANILLA", name: "Ice Cream Vanilla", category: "Menu Dessert", price: 25000, bomHint: "es krim vanilla siap saji" },
  { sku: "ID-ICE-CREAM-CHOCOLATE", name: "Ice Cream Chocolate", category: "Menu Dessert", price: 25000, bomHint: "es krim coklat siap saji" },
  { sku: "ID-PISANG-GORENG-COKLAT-KEJU", name: "Pisang Goreng Coklat / Keju", category: "Menu Dessert", price: 25000, bomHint: "pisang, tepung, coklat/keju" },
  { sku: "ID-TEMPE-MENDOAN", name: "Tempe Mendoan", category: "Menu Dessert", price: 25000, bomHint: "tempe, adonan mendoan, minyak" },
  { sku: "ID-JAVANESE-ICE-KOPI", name: "Javanese Ice Kopi", category: "Menu Minuman", price: 30000, bomHint: "espresso/kopi, gula, es" },
  { sku: "ID-V60-HOT-COFFEE", name: "V.60 - Hot Coffe", category: "Menu Minuman", price: 30000, bomHint: "biji kopi, filter V60, air panas" },
  { sku: "ID-VIETNAM-DRIP", name: "Vietnam Drip", category: "Menu Minuman", price: 25000, bomHint: "kopi vietnam, susu kental manis" },
  { sku: "ID-TUBRUK-ARIGINAL", name: "Tubruk Ariginal", category: "Menu Minuman", price: 20000, bomHint: "kopi bubuk, air panas" },
  { sku: "ID-TUBRUK-ORIGINAL", name: "Tubruk Original", category: "Menu Minuman", price: 20000, bomHint: "kopi bubuk, air panas" },
  { sku: "ID-ESPRESSO", name: "Espresso", category: "Menu Minuman", price: 25000, bomHint: "single/double shot espresso" },
  { sku: "ID-AMERICANO", name: "Americano", category: "Menu Minuman", price: 25000, bomHint: "espresso, air panas" },
  { sku: "ID-ES-KOPI-GULA-AREN", name: "Es Kopi Gula Aren", category: "Menu Minuman", price: 30000, bomHint: "espresso, susu, gula aren, es" },
  { sku: "ID-ES-CAPPUCINO", name: "Es Cappucino", category: "Menu Minuman", price: 30000, bomHint: "espresso, susu, es" },
  { sku: "ID-ES-KOPI-LATE", name: "Es Kopi Late", category: "Menu Minuman", price: 30000, bomHint: "espresso, susu, es" },
  { sku: "ID-CARAMEL-MACCHIATO", name: "Caramel Macchiato", category: "Menu Minuman", price: 30000, bomHint: "espresso, susu, caramel" },
];

const MENU_SEED_MODE: MenuSeedMode =
  process.env.RESTAURANT_MENU_SEED_MODE === "minimal" ? "minimal" : "full";
const MENU_LIMIT_PER_CATEGORY = Math.max(
  1,
  Number(process.env.RESTAURANT_MENU_LIMIT_PER_CATEGORY ?? "2"),
);

function pickMenuCatalogForSeed(source: RestaurantMenuCatalogItem[]) {
  if (MENU_SEED_MODE !== "minimal") return source;
  const grouped = new Map<string, RestaurantMenuCatalogItem[]>();
  for (const item of source) {
    grouped.set(item.category, [...(grouped.get(item.category) ?? []), item]);
  }
  return Array.from(grouped.entries()).flatMap(([category, items]) => {
    if (category !== "Menu Paket") {
      return items.slice(0, MENU_LIMIT_PER_CATEGORY);
    }

    const prioritized = [
      ...items.filter((item) => item.sku.startsWith("ID-PAKET-")),
      ...items.filter((item) => !item.sku.startsWith("ID-PAKET-")),
    ];
    return prioritized.slice(0, MENU_LIMIT_PER_CATEGORY);
  });
}

const ACTIVE_MENU_CATALOG = pickMenuCatalogForSeed(MENU_CATALOG);
const ACTIVE_SKUS = new Set(ACTIVE_MENU_CATALOG.map((item) => item.sku));

function estimateCost(price: number, category: string) {
  if (category === "Menu Paket") return Math.round(price * 0.62);
  if (category === "Menu Minuman") return Math.round(price * 0.35);
  if (category === "Menu Dessert") return Math.round(price * 0.4);
  return Math.round(price * 0.48);
}

function minStockByCategory(category: string) {
  if (category === "Menu Minuman") return 25;
  if (category === "Menu Dessert") return 12;
  if (category === "Menu Paket") return 8;
  return 10;
}

export const RESTAURANT_ID_PRODUCTS: RestaurantProduct[] = ACTIVE_MENU_CATALOG.map((item) => ({
  sku: item.sku,
  name: item.name,
  description: `Menu transcript Mang Engking. BOM kandidat: ${item.bomHint}`,
  category: item.category,
  unit: item.unit ?? "Porsi",
  price: item.price,
  cost: estimateCost(item.price, item.category),
  minStock: minStockByCategory(item.category),
  outletStock: 0,
  gudangStock: 0,
}));

export const RESTAURANT_ID_BOM_CANDIDATES = ACTIVE_MENU_CATALOG.map((item) => ({
  sku: item.sku,
  name: item.name,
  bomHint: item.bomHint,
}));

const BASE_PACKAGE_BOMS: RestaurantPackageBomSeed[] = [
  {
    bomNumber: "ID-BOM-PKG-10-ORANG",
    productSku: "ID-PAKET-10-ORANG",
    name: "BOM Paket 10 Orang",
    quantity: 1,
    components: [
      { sku: "ID-UDT-BAKAR-MADU", quantity: 1 },
      { sku: "ID-UDT-GORENG", quantity: 1 },
      { sku: "ID-UDS-SAUS-TIRAM", quantity: 1 },
      { sku: "ID-GURAME-COBEK", quantity: 1 },
      { sku: "ID-GURAME-BAKAR-KECAP", quantity: 1 },
      { sku: "ID-GURAME-SAUS-PADANG", quantity: 1 },
      { sku: "ID-AYAM-GRG-SERUNDENG", quantity: 1 },
      { sku: "ID-CUMI-GORENG-TEPUNG", quantity: 1 },
      { sku: "ID-NASI-PUTIH", quantity: 10 },
      { sku: "ID-TUMIS-KANGKUNG", quantity: 2 },
      { sku: "ID-KAREDOK", quantity: 2 },
      { sku: "ID-LALAPAN-MENTAH", quantity: 2 },
      { sku: "ID-SAMBAL-TERASI-DADAK", quantity: 3 },
      { sku: "ID-SAMBAL-TOMAT", quantity: 2 },
      { sku: "ID-AIR-MINERAL-600", quantity: 10 },
    ],
  },
  {
    bomNumber: "ID-BOM-PKG-6-ORANG",
    productSku: "ID-PAKET-6-ORANG",
    name: "BOM Paket 6 Orang",
    quantity: 1,
    components: [
      { sku: "ID-UDT-BAKAR-MADU", quantity: 1 },
      { sku: "ID-AYAM-GRG-KREMES", quantity: 1 },
      { sku: "ID-UDS-SAUS-TIRAM", quantity: 1 },
      { sku: "ID-GURAME-COBEK", quantity: 1 },
      { sku: "ID-GURAME-BAKAR-KECAP", quantity: 1 },
      { sku: "ID-NASI-PUTIH", quantity: 6 },
      { sku: "ID-TUMIS-KANGKUNG", quantity: 1 },
      { sku: "ID-KAREDOK", quantity: 1 },
      { sku: "ID-LALAPAN-MENTAH", quantity: 1 },
      { sku: "ID-SAMBAL-TERASI-DADAK", quantity: 2 },
      { sku: "ID-SAMBAL-TOMAT", quantity: 1 },
      { sku: "ID-ES-JERUK-MANIS", quantity: 3 },
      { sku: "ID-ES-TEH-MANIS", quantity: 3 },
    ],
  },
  {
    bomNumber: "ID-BOM-PKG-4-ORANG",
    productSku: "ID-PAKET-4-ORANG",
    name: "BOM Paket 4 Orang",
    quantity: 1,
    components: [
      { sku: "ID-UDT-BAKAR-MADU", quantity: 1 },
      { sku: "ID-GURAME-COBEK", quantity: 1 },
      { sku: "ID-AYAM-GRG-KREMES", quantity: 1 },
      { sku: "ID-NASI-PUTIH", quantity: 4 },
      { sku: "ID-TUMIS-KANGKUNG", quantity: 1 },
      { sku: "ID-KAREDOK", quantity: 1 },
      { sku: "ID-SAMBAL-TERASI-DADAK", quantity: 1 },
      { sku: "ID-SAMBAL-TOMAT", quantity: 1 },
      { sku: "ID-ES-JERUK-MANIS", quantity: 2 },
      { sku: "ID-ES-TEH-MANIS", quantity: 2 },
    ],
  },
];

function buildMinimalPackageBoms(catalog: RestaurantMenuCatalogItem[]) {
  const byCategory = new Map<string, RestaurantMenuCatalogItem[]>();
  for (const item of catalog) {
    byCategory.set(item.category, [...(byCategory.get(item.category) ?? []), item]);
  }

  const packageMenus = (byCategory.get("Menu Paket") ?? []).slice(0, 2);
  const seafood = byCategory.get("Menu Seafood")?.[0];
  const fish = byCategory.get("Menu Ikan")?.[0];
  const side = byCategory.get("Menu Sayuran & Lauk")?.[0];
  const riceOrSambal = byCategory.get("Menu Nasi & Sambal")?.[0];
  const drink = byCategory.get("Menu Minuman")?.[0];

  return packageMenus
    .map((pkg, idx) => {
      const components = [
        seafood && { sku: seafood.sku, quantity: 1 },
        fish && { sku: fish.sku, quantity: 1 },
        side && { sku: side.sku, quantity: 1 },
        riceOrSambal && { sku: riceOrSambal.sku, quantity: idx === 0 ? 2 : 1 },
        drink && { sku: drink.sku, quantity: idx === 0 ? 3 : 2 },
      ].filter((item): item is { sku: string; quantity: number } => Boolean(item));

      return {
        bomNumber: `ID-BOM-${pkg.sku.replace("ID-", "")}`,
        productSku: pkg.sku,
        name: `BOM ${pkg.name}`,
        quantity: 1,
        components,
      };
    })
    .filter((bom) => bom.components.length > 0);
}

export const RESTAURANT_ID_PACKAGE_BOMS: RestaurantPackageBomSeed[] =
  MENU_SEED_MODE === "minimal"
    ? buildMinimalPackageBoms(ACTIVE_MENU_CATALOG)
    : BASE_PACKAGE_BOMS.filter(
        (bom) =>
          ACTIVE_SKUS.has(bom.productSku) &&
          bom.components.every((component) => ACTIVE_SKUS.has(component.sku)),
      );

async function upsertContact(data: {
  name: string;
  type: ContactType;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
}) {
  const existing = await prisma.contact.findFirst({ where: { name: data.name, type: data.type } });
  if (existing) {
    return prisma.contact.update({ where: { id: existing.id }, data: { ...data, isActive: true } });
  }
  return prisma.contact.create({ data: { ...data, isActive: true } });
}

async function upsertWarehouse(name: string, location: string) {
  return prisma.warehouse.upsert({
    where: { name },
    update: { location },
    create: { name, location },
  });
}

async function upsertUnit(name: string, symbol: string) {
  return prisma.unit.upsert({
    where: { name },
    update: { symbol },
    create: { name, symbol },
  });
}

async function upsertCategory(name: string, description: string) {
  return prisma.category.upsert({
    where: { name },
    update: { description },
    create: { name, description },
  });
}

async function setInventory(productId: string, warehouseId: string, quantity: number, unitCost: number, reorderPoint: number) {
  const existing = await prisma.inventory.findFirst({
    where: { productId, warehouseId, batchNumber: null },
  });

  if (existing) {
    return prisma.inventory.update({
      where: { id: existing.id },
      data: { quantity, unitCost: d(unitCost), reorderPoint },
    });
  }

  return prisma.inventory.create({
    data: {
      productId,
      warehouseId,
      quantity,
      unitCost: d(unitCost),
      reorderPoint,
    },
  });
}

async function cleanupRestaurantSeedProducts() {
  console.log("🧹 Cleaning all existing products before restaurant reseed...");
  const idProducts = await prisma.product.findMany({
    select: { id: true },
  });
  if (idProducts.length === 0) return;
  const productIds = idProducts.map((item) => item.id);

  await prisma.$transaction(async (tx) => {
    await tx.priceHistory.deleteMany({ where: { productId: { in: productIds } } });
    await tx.kitchenTicketItem.deleteMany({ where: { productId: { in: productIds } } });
    await tx.restaurantOrderItem.deleteMany({ where: { productId: { in: productIds } } });
    await tx.productionIssueItem.deleteMany({ where: { productId: { in: productIds } } });
    await tx.productionReceiptItem.deleteMany({ where: { productId: { in: productIds } } });
    await tx.productionIssue.deleteMany({
      where: { productionOrder: { productId: { in: productIds } } },
    });
    await tx.productionReceipt.deleteMany({
      where: { productionOrder: { productId: { in: productIds } } },
    });
    await tx.purchaseReceiveItem.deleteMany({ where: { productId: { in: productIds } } });
    await tx.purchaseOrderItem.deleteMany({ where: { productId: { in: productIds } } });
    await tx.purchaseReturnItem.deleteMany({ where: { productId: { in: productIds } } });
    await tx.salesShipmentItem.deleteMany({ where: { productId: { in: productIds } } });
    await tx.salesOrderItem.deleteMany({ where: { productId: { in: productIds } } });
    await tx.salesInvoiceItem.deleteMany({ where: { productId: { in: productIds } } });
    await tx.salesReturnItem.deleteMany({ where: { productId: { in: productIds } } });

    await tx.billOfMaterialItem.deleteMany({
      where: {
        OR: [
          { productId: { in: productIds } },
          { billOfMaterial: { productId: { in: productIds } } },
        ],
      },
    });
    await tx.billOfMaterial.deleteMany({
      where: {
        OR: [
          { productId: { in: productIds } },
          { bomNumber: { startsWith: "ID-BOM-" } },
        ],
      },
    });

    await tx.inventoryMovementDetail.deleteMany({ where: { productId: { in: productIds } } });
    await tx.inventoryMovement.updateMany({
      where: { productId: { in: productIds } },
      data: { productId: null },
    });
    await tx.inventory.deleteMany({ where: { productId: { in: productIds } } });

    await tx.productionOrder.deleteMany({ where: { productId: { in: productIds } } });
    await tx.product.deleteMany({ where: { id: { in: productIds } } });
  });
}

async function seedCompanyIndonesia() {
  console.log("🇮🇩 Updating company profile for Indonesian restaurant demo...");

  const profile = await prisma.companyProfile.findFirst();
  const data = {
    name: "Restoran Nusantara Rasa",
    address: "Jl. Kemang Raya No. 88, Jakarta Selatan, DKI Jakarta 12730",
    phone: "+62 21 5550 7788",
    email: "halo@nusantararasa.example",
    website: "https://nats.piiblog.net",
    taxId: "NPWP 09.123.456.7-012.000",
    currency: "IDR",
    locale: "id-ID",
    timezone: "Asia/Jakarta",
  };

  if (profile) return prisma.companyProfile.update({ where: { id: profile.id }, data });
  return prisma.companyProfile.create({ data });
}

async function seedCashAccountsIndonesia() {
  console.log("💰 Seeding Indonesian restaurant cash/bank/e-wallet accounts...");

  const configs = [
    {
      glCode: "11120",
      name: "Laci Kasir Outlet Kemang",
      type: CashAccountType.CASH,
      description: "Kas tunai harian untuk transaksi dine-in dan takeaway",
    },
    {
      glCode: "11110",
      name: "BCA Operasional Restoran",
      type: CashAccountType.BANK,
      bankName: "BCA",
      accountNumber: "[REDACTED-DEMO]",
      description: "Rekening operasional pembayaran supplier dan settlement merchant",
    },
    {
      glCode: "11130",
      name: "QRIS / GoPay / OVO Settlement",
      type: CashAccountType.EWALLET,
      bankName: "QRIS Aggregator",
      accountNumber: "merchant-nusantararasa",
      description: "Settlement pembayaran QRIS, GoFood, GrabFood, dan ShopeeFood",
    },
  ];

  for (const cfg of configs) {
    const gl = await prisma.account.findUnique({ where: { code: cfg.glCode } });
    if (!gl) continue;
    await prisma.cashAccount.upsert({
      where: { glAccountId: gl.id },
      update: {
        name: cfg.name,
        type: cfg.type,
        accountNumber: cfg.accountNumber,
        bankName: cfg.bankName,
        description: cfg.description,
      },
      create: {
        name: cfg.name,
        type: cfg.type,
        accountNumber: cfg.accountNumber,
        bankName: cfg.bankName,
        description: cfg.description,
        glAccountId: gl.id,
      },
    });
  }
}

async function seedContactsIndonesia() {
  console.log("🤝 Seeding Indonesian restaurant customers and suppliers...");

  const customers = [
    {
      name: "Pelanggan Umum Dine-In",
      email: "pelanggan@nusantararasa.example",
      phone: "+62 812-1000-0001",
      address: "Walk-in customer / meja restoran",
    },
    {
      name: "GoFood Merchant - Nusantara Rasa",
      email: "settlement.gofood@nusantararasa.example",
      phone: "+62 812-1000-0002",
      address: "Channel delivery GoFood Jakarta Selatan",
    },
    {
      name: "GrabFood Merchant - Nusantara Rasa",
      email: "settlement.grabfood@nusantararasa.example",
      phone: "+62 812-1000-0003",
      address: "Channel delivery GrabFood Jakarta Selatan",
    },
    {
      name: "Katering PT Maju Bersama",
      email: "finance@majubersama.example",
      phone: "+62 21 7788 1122",
      address: "Jl. TB Simatupang, Jakarta Selatan",
      taxId: "NPWP 03.222.333.4-015.000",
    },
  ];

  const vendors = [
    {
      name: "Pasar Induk Kramat Jati - Supplier Sayur",
      email: "order@pasarkramatjati.example",
      phone: "+62 812-2000-1001",
      address: "Pasar Induk Kramat Jati, Jakarta Timur",
    },
    {
      name: "CV Beras Makmur Sentosa",
      email: "sales@berasmkm.example",
      phone: "+62 812-2000-1002",
      address: "Karawang, Jawa Barat",
      taxId: "NPWP 02.456.789.0-433.000",
    },
    {
      name: "UD Ayam Segar Barokah",
      email: "order@ayamsegarbarokah.example",
      phone: "+62 812-2000-1003",
      address: "Ciputat, Tangerang Selatan",
    },
    {
      name: "Toko Plastik & Kemasan Sumber Jaya",
      email: "admin@sumberjaya-pack.example",
      phone: "+62 812-2000-1004",
      address: "Jl. Mampang Prapatan, Jakarta Selatan",
    },
    {
      name: "PT Bumbu Nusantara Indonesia",
      email: "ar@bumbunusantara.example",
      phone: "+62 21 8899 1000",
      address: "Bekasi, Jawa Barat",
      taxId: "NPWP 01.987.654.3-432.000",
    },
  ];

  const result: Record<string, Awaited<ReturnType<typeof upsertContact>>> = {};
  for (const c of customers) result[c.name] = await upsertContact({ ...c, type: ContactType.CUSTOMER });
  for (const v of vendors) result[v.name] = await upsertContact({ ...v, type: ContactType.VENDOR });
  return result;
}

async function seedInventoryIndonesia() {
  console.log("🍛 Seeding Indonesian restaurant products, menu, stock, and warehouses...");

  const gudang = await upsertWarehouse("Gudang Bahan Baku - Dapur Utama", "Jakarta Selatan");
  const outletKemang = await upsertWarehouse("Outlet Kemang", "Jl. Kemang Raya, Jakarta Selatan");
  await upsertWarehouse("Outlet Bintaro", "Bintaro, Tangerang Selatan");

  const units = [
    ["Porsi", "porsi"],
    ["Botol", "btl"],
  ] as const;
  const unitByName: Record<string, Awaited<ReturnType<typeof upsertUnit>>> = {};
  for (const [name, symbol] of units) unitByName[name] = await upsertUnit(name, symbol);

  const categories = [
    ["Menu Seafood", "Menu seafood utama berdasarkan transcript menu."],
    ["Menu Ikan", "Menu ikan gurame, kerapu, bandeng."],
    ["Menu Kepiting", "Menu kepiting jantan dan kepiting soka."],
    ["Menu Cumi & Kerang", "Menu cumi serta kerang/simping."],
    ["Menu Ayam Bebek Sapi", "Menu ayam, bebek, dan daging sapi."],
    ["Menu Sayuran & Lauk", "Sayur, lauk pelengkap, dan gorengan pendamping."],
    ["Menu Nasi & Sambal", "Nasi dan aneka sambal."],
    ["Menu Paket", "Paket rame/rame berdasarkan menu cetak."],
    ["Menu Minuman", "Minuman dingin, panas, kopi, soda, jus."],
    ["Menu Dessert", "Dessert dan kudapan manis."],
  ] as const;
  const categoryByName: Record<string, Awaited<ReturnType<typeof upsertCategory>>> = {};
  for (const [name, description] of categories) categoryByName[name] = await upsertCategory(name, description);

  const products = RESTAURANT_ID_PRODUCTS;

  const productBySku: Record<string, Awaited<ReturnType<typeof prisma.product.upsert>>> = {};
  for (const p of products) {
    const category = categoryByName[p.category];
    const unit = unitByName[p.unit];
    const product = await prisma.product.upsert({
      where: { sku: p.sku },
      update: {
        name: p.name,
        description: p.description,
        categoryId: category.id,
        baseUnitId: unit.id,
        purchaseUnitId: unit.id,
        salesUnitId: unit.id,
        price: d(p.price),
        cost: d(p.cost),
        averageCost: d(p.cost),
        minStock: p.minStock,
        isActive: true,
      },
      create: {
        sku: p.sku,
        name: p.name,
        description: p.description,
        categoryId: category.id,
        baseUnitId: unit.id,
        purchaseUnitId: unit.id,
        salesUnitId: unit.id,
        price: d(p.price),
        cost: d(p.cost),
        averageCost: d(p.cost),
        minStock: p.minStock,
        isActive: true,
      },
    });
    productBySku[p.sku] = product;
    await setInventory(product.id, outletKemang.id, p.outletStock, p.cost, p.minStock);
    if (p.gudangStock > 0) await setInventory(product.id, gudang.id, p.gudangStock, p.cost, p.minStock);
  }

  return { productBySku, gudang, outletKemang };
}

async function seedPackageBomsIndonesia(
  context: Awaited<ReturnType<typeof seedInventoryIndonesia>>,
) {
  console.log("📦 Seeding minimal BOM for package products...");

  const activeBomNumbers = new Set(RESTAURANT_ID_PACKAGE_BOMS.map((item) => item.bomNumber));
  const stalePackageBoms = await prisma.billOfMaterial.findMany({
    where: { bomNumber: { startsWith: "ID-BOM-PKG-" } },
    select: { id: true, bomNumber: true },
  });
  for (const stale of stalePackageBoms) {
    if (!activeBomNumbers.has(stale.bomNumber)) {
      await prisma.billOfMaterialItem.deleteMany({ where: { billOfMaterialId: stale.id } });
      await prisma.billOfMaterial.delete({ where: { id: stale.id } });
    }
  }

  for (const bom of RESTAURANT_ID_PACKAGE_BOMS) {
    const targetProduct = context.productBySku[bom.productSku];
    if (!targetProduct) {
      throw new Error(`Missing package product SKU: ${bom.productSku}`);
    }

    const existing = await prisma.billOfMaterial.findUnique({
      where: { bomNumber: bom.bomNumber },
      include: { items: true },
    });

    if (existing) {
      await prisma.billOfMaterial.update({
        where: { id: existing.id },
        data: {
          productId: targetProduct.id,
          name: bom.name,
          quantity: bom.quantity,
          isActive: true,
        },
      });

      await prisma.billOfMaterialItem.deleteMany({
        where: { billOfMaterialId: existing.id },
      });

      await prisma.billOfMaterialItem.createMany({
        data: bom.components.map((component) => {
          const product = context.productBySku[component.sku];
          if (!product) {
            throw new Error(
              `Missing BOM component SKU: ${component.sku} for ${bom.bomNumber}`,
            );
          }
          return {
            billOfMaterialId: existing.id,
            productId: product.id,
            quantity: d(component.quantity),
            unitCost: product.cost,
          };
        }),
      });
      continue;
    }

    const created = await prisma.billOfMaterial.create({
      data: {
        bomNumber: bom.bomNumber,
        productId: targetProduct.id,
        name: bom.name,
        quantity: bom.quantity,
        isActive: true,
      },
    });

    await prisma.billOfMaterialItem.createMany({
      data: bom.components.map((component) => {
        const product = context.productBySku[component.sku];
        if (!product) {
          throw new Error(
            `Missing BOM component SKU: ${component.sku} for ${bom.bomNumber}`,
          );
        }
        return {
          billOfMaterialId: created.id,
          productId: product.id,
          quantity: d(component.quantity),
          unitCost: product.cost,
        };
      }),
    });
  }
}

async function seedRestaurantTransactionsIndonesia(context: Awaited<ReturnType<typeof seedInventoryIndonesia>>, contacts: Awaited<ReturnType<typeof seedContactsIndonesia>>) {
  console.log("🧾 Seeding Indonesian restaurant purchases, POS sales, payments, and stock movements...");

  const admin = await prisma.user.findFirst({ where: { email: "admin@example.com" } });
  const cashier = await prisma.user.findFirst({ where: { email: "cashier@example.com" } });
  const salesAccount = await prisma.account.findUnique({ where: { code: "41200" } });
  const cogsAccount = await prisma.account.findUnique({ where: { code: "52000" } });
  const cashAccount = await prisma.cashAccount.findFirst({ where: { name: "Laci Kasir Outlet Kemang" } }) || await prisma.cashAccount.findFirst();
  const qrisAccount = await prisma.cashAccount.findFirst({ where: { name: "QRIS / GoPay / OVO Settlement" } }) || cashAccount;
  if (!admin || !salesAccount || !cogsAccount || !cashAccount || !qrisAccount) {
    throw new Error("Missing required base users/accounts/cash accounts for restaurant transactions");
  }

  const posSession = await prisma.pOSSession.upsert({
    where: { sessionNumber: "POS-KMG-2026-05-01-PAGI" },
    update: {
      cashierId: cashier?.id || admin.id,
      status: POSSessionStatus.OPEN,
      warehouseId: context.outletKemang.id,
      openingCash: d(1500000),
      notes: "Shift pagi Outlet Kemang - seed restoran Indonesia",
    },
    create: {
      sessionNumber: "POS-KMG-2026-05-01-PAGI",
      cashierId: cashier?.id || admin.id,
      status: POSSessionStatus.OPEN,
      warehouseId: context.outletKemang.id,
      openingCash: d(1500000),
      notes: "Shift pagi Outlet Kemang - seed restoran Indonesia",
    },
  });

  const purchasePlans = [
    {
      number: "ID-REST-PO-BERAS-001",
      vendor: contacts["CV Beras Makmur Sentosa"],
      date: daysAgo(8),
      items: [{ sku: "ID-BB-BERAS-PANDAN", qty: 250, cost: 14500 }, { sku: "ID-BB-GULA-PASIR", qty: 70, cost: 17000 }],
    },
    {
      number: "ID-REST-PO-SEAFOOD-001",
      vendor: contacts["Pasar Induk Kramat Jati - Supplier Sayur"],
      date: daysAgo(5),
      items: [{ sku: "ID-BB-GURAME-SEGAR", qty: 120, cost: 42000 }, { sku: "ID-BB-CUMI-SEGAR", qty: 80, cost: 78000 }],
    },
    {
      number: "ID-REST-PO-BUMBU-001",
      vendor: contacts["PT Bumbu Nusantara Indonesia"],
      date: daysAgo(3),
      items: [{ sku: "ID-BB-CABE-RAWIT", qty: 25, cost: 65000 }, { sku: "ID-BB-BAWANG-MERAH", qty: 40, cost: 42000 }, { sku: "ID-BB-MINYAK-GORENG", qty: 60, cost: 17000 }],
    },
    {
      number: "ID-REST-PO-PACK-001",
      vendor: contacts["Toko Plastik & Kemasan Sumber Jaya"],
      date: daysAgo(2),
      items: [{ sku: "ID-PACK-BOX-NASI", qty: 30, cost: 55000 }, { sku: "ID-PACK-CUP-16OZ", qty: 25, cost: 38000 }],
    },
    {
      number: "ID-REST-PO-SAYUR-MINUM-001",
      vendor: contacts["Pasar Induk Kramat Jati - Supplier Sayur"],
      date: daysAgo(1),
      items: [
        { sku: "ID-BB-KANGKUNG", qty: 55, cost: 9000 },
        { sku: "ID-BB-JERUK-PERAS", qty: 60, cost: 18000 },
        { sku: "ID-BB-TEH-MELATI", qty: 35, cost: 48000 },
      ],
    },
  ];

  for (const plan of purchasePlans) {
    const total = plan.items.reduce((sum, item) => sum + item.qty * item.cost, 0);
    const purchaseOrder = await prisma.purchaseOrder.upsert({
      where: { orderNumber: plan.number },
      update: { status: PurchaseOrderStatus.CLOSED, totalAmount: d(total), notes: "Pembelian bahan baku restoran - seed Indonesia" },
      create: {
        orderNumber: plan.number,
        contactId: plan.vendor.id,
        orderDate: plan.date,
        expectedDate: daysFrom(plan.date, 1),
        status: PurchaseOrderStatus.CLOSED,
        totalAmount: d(total),
        notes: "Pembelian bahan baku restoran - seed Indonesia",
        createdById: admin.id,
        items: {
          create: plan.items.map((item) => ({
            productId: context.productBySku[item.sku].id,
            quantity: item.qty,
            receivedQuantity: item.qty,
            unitCost: d(item.cost),
            totalCost: d(item.qty * item.cost),
          })),
        },
      },
      include: { items: true },
    });

    const receiveNumber = plan.number.replace("PO", "RCV");
    const existingReceive = await prisma.purchaseReceive.findFirst({ where: { receiveNumber } });
    if (!existingReceive) {
      await prisma.purchaseReceive.create({
        data: {
          receiveNumber,
          purchaseOrderId: purchaseOrder.id,
          contactId: plan.vendor.id,
          receiveDate: daysFrom(plan.date, 1),
          status: PurchaseReceiveStatus.COMPLETED,
          notes: "Barang diterima gudang/dapur utama",
          items: {
            create: plan.items.map((item) => ({
              productId: context.productBySku[item.sku].id,
              quantity: item.qty,
            })),
          },
        },
      });
    }

    const invoiceNumber = plan.number.replace("PO", "PINV");
    const existingInvoice = await prisma.purchaseInvoice.findFirst({ where: { contactId: plan.vendor.id, invoiceNumber } });
    if (!existingInvoice) {
      const invoice = await prisma.purchaseInvoice.create({
        data: {
          invoiceNumber,
          contactId: plan.vendor.id,
          purchaseOrderId: purchaseOrder.id,
          invoiceDate: daysFrom(plan.date, 1),
          dueDate: daysFrom(plan.date, 14),
          status: PurchaseInvoiceStatus.PAID,
          totalAmount: d(total),
          notes: "Invoice supplier restoran - seed Indonesia",
          items: {
            create: plan.items.map((item) => ({
              description: context.productBySku[item.sku].name,
              quantity: item.qty,
              unitPrice: d(item.cost),
              totalPrice: d(item.qty * item.cost),
              accountId: cogsAccount.id,
            })),
          },
        },
      });
      await prisma.purchasePayment.create({
        data: {
          paymentNumber: invoiceNumber.replace("PINV", "PPAY"),
          contactId: plan.vendor.id,
          purchaseInvoiceId: invoice.id,
          paymentDate: daysFrom(plan.date, 2),
          amount: d(total),
          cashAccountId: qrisAccount.id,
          reference: "Transfer BCA / QRIS settlement demo",
          notes: "Pelunasan invoice supplier",
        },
      });
    }

    const movementRef = plan.number.replace("PO", "STOCK-IN");
    const existingMovement = await prisma.inventoryMovement.findFirst({ where: { reference: movementRef } });
    if (!existingMovement) {
      await prisma.inventoryMovement.create({
        data: {
          type: MovementType.IN,
          reference: movementRef,
          status: MovementStatus.COMPLETED,
          transactionDate: daysFrom(plan.date, 1),
          toWarehouseId: context.gudang.id,
          notes: "Stok masuk bahan baku dari supplier Indonesia",
          approvedById: admin.id,
          approvedAt: daysFrom(plan.date, 1),
          details: {
            create: plan.items.map((item) => ({
              productId: context.productBySku[item.sku].id,
              quantity: item.qty,
              unitCost: d(item.cost),
              notes: "Penerimaan bahan baku restoran",
            })),
          },
        },
      });
    }
  }

  const salesPlans = [
    {
      number: "ID-REST-SO-DINEIN-001",
      customer: contacts["Pelanggan Umum Dine-In"],
      method: "CASH",
      cashAccountId: cashAccount.id,
      date: daysAgo(1),
      items: [
        { sku: "ID-MENU-NASI-TIMBEL", qty: 16 },
        { sku: "ID-MENU-GURAME-BAKAR", qty: 8 },
        { sku: "ID-MENU-ES-TEH", qty: 25 },
        { sku: "ID-MENU-AIR-MINERAL", qty: 10 },
      ],
    },
    {
      number: "ID-REST-SO-GOFOOD-001",
      customer: contacts["GoFood Merchant - Nusantara Rasa"],
      method: "GOFOOD_QRIS",
      cashAccountId: qrisAccount.id,
      date: daysAgo(1),
      items: [
        { sku: "ID-PKG-HEMAT-TIMBEL", qty: 20 },
        { sku: "ID-PKG-SEAFOOD-BERDUA", qty: 8 },
        { sku: "ID-MENU-ES-JERUK", qty: 14 },
      ],
    },
    {
      number: "ID-REST-SO-KATERING-001",
      customer: contacts["Katering PT Maju Bersama"],
      method: "BANK_TRANSFER",
      cashAccountId: qrisAccount.id,
      date: daysAgo(4),
      items: [
        { sku: "ID-PKG-SUNDA-KELUARGA", qty: 18 },
        { sku: "ID-MENU-ES-TEH", qty: 54 },
        { sku: "ID-MENU-AIR-MINERAL", qty: 54 },
      ],
    },
  ];

  for (const plan of salesPlans) {
    const subtotal = plan.items.reduce((sum, item) => {
      const product = context.productBySku[item.sku];
      return sum + Number(product.price) * item.qty;
    }, 0);
    const serviceCharge = Math.round(subtotal * 0.05);
    const total = subtotal + serviceCharge;

    const salesOrder = await prisma.salesOrder.upsert({
      where: { orderNumber: plan.number },
      update: {
        status: SalesOrderStatus.CLOSED,
        subtotal: d(subtotal),
        taxAmount: d(0),
        totalAmount: d(total),
        notes: `Transaksi restoran Indonesia (${plan.method}) termasuk service charge 5%`,
        posSessionId: posSession.id,
      },
      create: {
        orderNumber: plan.number,
        contactId: plan.customer.id,
        orderDate: plan.date,
        status: SalesOrderStatus.CLOSED,
        subtotal: d(subtotal),
        taxAmount: d(0),
        totalAmount: d(total),
        notes: `Transaksi restoran Indonesia (${plan.method}) termasuk service charge 5%`,
        createdById: admin.id,
        posSessionId: posSession.id,
        items: {
          create: plan.items.map((item) => {
            const product = context.productBySku[item.sku];
            return {
              productId: product.id,
              quantity: item.qty,
              shippedQuantity: item.qty,
              unitPrice: product.price,
              totalPrice: d(Number(product.price) * item.qty),
            };
          }),
        },
      },
    });

    const invoiceNumber = plan.number.replace("SO", "SINV");
    const existingInvoice = await prisma.salesInvoice.findFirst({ where: { invoiceNumber } });
    if (!existingInvoice) {
      const invoice = await prisma.salesInvoice.create({
        data: {
          invoiceNumber,
          contactId: plan.customer.id,
          salesOrderId: salesOrder.id,
          invoiceDate: plan.date,
          dueDate: daysFrom(plan.date, 3),
          status: SalesInvoiceStatus.PAID,
          subtotal: d(subtotal),
          totalTax: d(0),
          shippingCost: d(0),
          totalAmount: d(total),
          balanceDue: d(0),
          notes: "Invoice POS/restoran Indonesia - sudah lunas",
          terms: "Pembayaran tunai/QRIS/transfer sesuai channel",
          posSessionId: posSession.id,
          items: {
            create: [
              ...plan.items.map((item) => {
                const product = context.productBySku[item.sku];
                return {
                  description: product.name,
                  productId: product.id,
                  quantity: item.qty,
                  unitPrice: product.price,
                  totalPrice: d(Number(product.price) * item.qty),
                  accountId: salesAccount.id,
                };
              }),
              {
                description: "Service Charge Restoran 5%",
                quantity: 1,
                unitPrice: d(serviceCharge),
                totalPrice: d(serviceCharge),
                accountId: salesAccount.id,
              },
            ],
          },
        },
      });
      await prisma.salesPayment.create({
        data: {
          paymentNumber: invoiceNumber.replace("SINV", "SPAY"),
          contactId: plan.customer.id,
          salesInvoiceId: invoice.id,
          paymentDate: plan.date,
          amount: d(total),
          method: plan.method,
          cashAccountId: plan.cashAccountId,
          reference: `${plan.method}-RESTO-ID`,
          notes: "Pembayaran transaksi restoran Indonesia",
          posSessionId: posSession.id,
        },
      });
    }

    const movementRef = plan.number.replace("SO", "STOCK-OUT");
    const existingMovement = await prisma.inventoryMovement.findFirst({ where: { reference: movementRef } });
    if (!existingMovement) {
      await prisma.inventoryMovement.create({
        data: {
          type: MovementType.OUT,
          reference: movementRef,
          status: MovementStatus.COMPLETED,
          transactionDate: plan.date,
          fromWarehouseId: context.outletKemang.id,
          notes: "Stok keluar karena penjualan POS/restoran",
          approvedById: admin.id,
          approvedAt: plan.date,
          details: {
            create: plan.items.map((item) => ({
              productId: context.productBySku[item.sku].id,
              quantity: item.qty,
              unitCost: context.productBySku[item.sku].cost,
              notes: "Pemakaian/penjualan menu restoran",
            })),
          },
        },
      });
    }
  }
}

async function seedReportTemplatesIndonesia() {
  console.log("🖨️ Seeding POS receipt report template...");

  await prisma.reportTemplate.upsert({
    where: { code: "POS_RECEIPT" },
    update: {
      name: "Struk POS Restoran (Thermal 80mm)",
      module: "POS",
      description: "Template struk kasir restoran Indonesia untuk print thermal 80mm.",
      config: { pageSize: [226, 600], thermalWidth: "80mm" },
      isSystem: true,
      isActive: true,
    },
    create: {
      code: "POS_RECEIPT",
      name: "Struk POS Restoran (Thermal 80mm)",
      module: "POS",
      description: "Template struk kasir restoran Indonesia untuk print thermal 80mm.",
      config: { pageSize: [226, 600], thermalWidth: "80mm" },
      isSystem: true,
      isActive: true,
    },
  });
}

async function main() {
  console.log("🚀 Start Indonesian restaurant product-only seeding for NATS...");
  const start = Date.now();
  try {
    await seedCompany();
    await seedAccounting();
    await seedUsers();
    await seedCompanyIndonesia();
    console.log(`🧭 Menu seed mode: ${MENU_SEED_MODE}${MENU_SEED_MODE === "minimal" ? ` (limit ${MENU_LIMIT_PER_CATEGORY} per category)` : ""}`);
    await cleanupRestaurantSeedProducts();
    const inventoryContext = await seedInventoryIndonesia();
    await seedPackageBomsIndonesia(inventoryContext);
    console.log("ℹ️ Contact, cash account, and transaction seed are intentionally skipped.");
    console.log(`✅ Indonesian restaurant product-only seeding completed in ${(Date.now() - start) / 1000}s`);
  } catch (error) {
    console.error("❌ Indonesian restaurant seeding failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

const isDirectExecution =
  typeof process.argv[1] === "string" &&
  process.argv[1].includes("seed-restaurant-id.ts");

if (isDirectExecution) {
  void main();
}
