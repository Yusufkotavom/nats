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

export const RESTAURANT_ID_PRODUCTS: RestaurantProduct[] = [
  { sku: "ID-MENU-NASI-TIMBEL", name: "Nasi Timbel Komplit", description: "Nasi timbel, ayam goreng, tahu-tempe, sambal, lalapan", category: "Menu Makanan Indonesia", unit: "Porsi", price: 32000, cost: 14500, minStock: 20, outletStock: 85, gudangStock: 0 },
  { sku: "ID-MENU-GURAME-BAKAR", name: "Gurame Bakar Sunda", description: "Gurame bakar bumbu kecap, sambal terasi, lalapan", category: "Menu Makanan Indonesia", unit: "Porsi", price: 68000, cost: 34000, minStock: 12, outletStock: 45, gudangStock: 0 },
  { sku: "ID-MENU-CUMI-GORENG", name: "Cumi Goreng Tepung", description: "Cumi segar goreng tepung dengan sambal matah", category: "Menu Makanan Indonesia", unit: "Porsi", price: 52000, cost: 26500, minStock: 12, outletStock: 40, gudangStock: 0 },
  { sku: "ID-MENU-KANGKUNG-CAH", name: "Kangkung Cah Bawang", description: "Tumis kangkung bawang putih khas warung Sunda", category: "Menu Makanan Indonesia", unit: "Porsi", price: 18000, cost: 7000, minStock: 15, outletStock: 60, gudangStock: 0 },
  { sku: "ID-MENU-ES-TEH", name: "Es Teh Manis", description: "Teh melati, gula cair, es batu", category: "Menu Minuman", unit: "Porsi", price: 8000, cost: 2500, minStock: 60, outletStock: 180, gudangStock: 0 },
  { sku: "ID-MENU-ES-JERUK", name: "Es Jeruk Peras", description: "Jeruk peras segar dan gula cair", category: "Menu Minuman", unit: "Porsi", price: 15000, cost: 6000, minStock: 40, outletStock: 110, gudangStock: 0 },
  { sku: "ID-MENU-AIR-MINERAL", name: "Air Mineral 600ml", description: "Air mineral botol 600ml", category: "Menu Minuman", unit: "Botol", price: 7000, cost: 3500, minStock: 48, outletStock: 120, gudangStock: 0 },
  { sku: "ID-PKG-HEMAT-TIMBEL", name: "Paket Hemat Timbel + Es Teh", description: "1 Nasi Timbel Komplit + 1 Es Teh Manis", category: "Menu Makanan Indonesia", unit: "Porsi", price: 38000, cost: 17000, minStock: 25, outletStock: 70, gudangStock: 0 },
  { sku: "ID-PKG-SEAFOOD-BERDUA", name: "Paket Seafood Berdua", description: "1 Gurame Bakar + 1 Cumi Goreng + 2 Es Teh", category: "Menu Makanan Indonesia", unit: "Porsi", price: 125000, cost: 69000, minStock: 10, outletStock: 25, gudangStock: 0 },
  { sku: "ID-PKG-SUNDA-KELUARGA", name: "Paket Sunda Keluarga", description: "2 Nasi Timbel + 1 Gurame Bakar + 1 Kangkung Cah + 3 Es Teh", category: "Menu Makanan Indonesia", unit: "Porsi", price: 155000, cost: 84000, minStock: 8, outletStock: 20, gudangStock: 0 },
  { sku: "ID-BB-BERAS-PANDAN", name: "Beras Pandan Wangi", description: "Beras premium untuk nasi timbel", category: "Bahan Baku Dapur", unit: "Kilogram", price: 0, cost: 14500, minStock: 80, outletStock: 70, gudangStock: 350 },
  { sku: "ID-BB-GURAME-SEGAR", name: "Ikan Gurame Segar", description: "Bahan baku utama gurame bakar", category: "Bahan Baku Dapur", unit: "Kilogram", price: 0, cost: 42000, minStock: 35, outletStock: 30, gudangStock: 90 },
  { sku: "ID-BB-CUMI-SEGAR", name: "Cumi Segar", description: "Bahan baku utama cumi goreng", category: "Bahan Baku Dapur", unit: "Kilogram", price: 0, cost: 78000, minStock: 25, outletStock: 20, gudangStock: 70 },
  { sku: "ID-BB-KANGKUNG", name: "Kangkung Ikat", description: "Sayur kangkung untuk menu cah kangkung", category: "Bahan Baku Dapur", unit: "Ikat", price: 0, cost: 9000, minStock: 30, outletStock: 25, gudangStock: 80 },
  { sku: "ID-BB-TEH-MELATI", name: "Teh Melati Curah", description: "Bahan baku minuman teh restoran", category: "Bumbu & Rempah", unit: "Pack", price: 0, cost: 48000, minStock: 20, outletStock: 18, gudangStock: 60 },
  { sku: "ID-BB-JERUK-PERAS", name: "Jeruk Peras", description: "Bahan baku es jeruk", category: "Bahan Baku Dapur", unit: "Kilogram", price: 0, cost: 18000, minStock: 25, outletStock: 22, gudangStock: 75 },
  { sku: "ID-BB-GULA-PASIR", name: "Gula Pasir", description: "Bahan baku pemanis minuman", category: "Bahan Baku Dapur", unit: "Kilogram", price: 0, cost: 17000, minStock: 40, outletStock: 35, gudangStock: 120 },
  { sku: "ID-BB-CABE-RAWIT", name: "Cabe Rawit Merah", description: "Cabe rawit untuk sambal dan bumbu", category: "Bumbu & Rempah", unit: "Kilogram", price: 0, cost: 65000, minStock: 15, outletStock: 18, gudangStock: 55 },
  { sku: "ID-BB-BAWANG-MERAH", name: "Bawang Merah Brebes", description: "Bawang merah untuk bumbu dasar", category: "Bumbu & Rempah", unit: "Kilogram", price: 0, cost: 42000, minStock: 20, outletStock: 20, gudangStock: 80 },
  { sku: "ID-BB-MINYAK-GORENG", name: "Minyak Goreng 18L", description: "Minyak goreng jeriken untuk produksi harian", category: "Bahan Baku Dapur", unit: "Liter", price: 0, cost: 17000, minStock: 90, outletStock: 120, gudangStock: 260 },
  { sku: "ID-PACK-BOX-NASI", name: "Box Nasi Takeaway", description: "Kemasan nasi paper box food grade", category: "Kemasan Takeaway", unit: "Pack", price: 0, cost: 55000, minStock: 20, outletStock: 24, gudangStock: 80 },
  { sku: "ID-PACK-CUP-16OZ", name: "Cup Minuman 16oz + Lid", description: "Cup plastik untuk es teh dan es jeruk", category: "Kemasan Takeaway", unit: "Pack", price: 0, cost: 38000, minStock: 15, outletStock: 30, gudangStock: 70 },
];

export const RESTAURANT_ID_PACKAGE_BOMS: RestaurantPackageBomSeed[] = [
  {
    bomNumber: "ID-BOM-PKG-HEMAT-TIMBEL",
    productSku: "ID-PKG-HEMAT-TIMBEL",
    name: "BOM Paket Hemat Timbel + Es Teh",
    quantity: 1,
    components: [
      { sku: "ID-MENU-NASI-TIMBEL", quantity: 1 },
      { sku: "ID-MENU-ES-TEH", quantity: 1 },
    ],
  },
  {
    bomNumber: "ID-BOM-PKG-SEAFOOD-BERDUA",
    productSku: "ID-PKG-SEAFOOD-BERDUA",
    name: "BOM Paket Seafood Berdua",
    quantity: 1,
    components: [
      { sku: "ID-MENU-GURAME-BAKAR", quantity: 1 },
      { sku: "ID-MENU-CUMI-GORENG", quantity: 1 },
      { sku: "ID-MENU-ES-TEH", quantity: 2 },
    ],
  },
  {
    bomNumber: "ID-BOM-PKG-SUNDA-KELUARGA",
    productSku: "ID-PKG-SUNDA-KELUARGA",
    name: "BOM Paket Sunda Keluarga",
    quantity: 1,
    components: [
      { sku: "ID-MENU-NASI-TIMBEL", quantity: 2 },
      { sku: "ID-MENU-GURAME-BAKAR", quantity: 1 },
      { sku: "ID-MENU-KANGKUNG-CAH", quantity: 1 },
      { sku: "ID-MENU-ES-TEH", quantity: 3 },
    ],
  },
];

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
    ["Kilogram", "kg"],
    ["Gram", "g"],
    ["Liter", "L"],
    ["Botol", "btl"],
    ["Pack", "pack"],
    ["Ikat", "ikat"],
    ["Butir", "btr"],
  ] as const;
  const unitByName: Record<string, Awaited<ReturnType<typeof upsertUnit>>> = {};
  for (const [name, symbol] of units) unitByName[name] = await upsertUnit(name, symbol);

  const categories = [
    ["Menu Makanan Indonesia", "Menu siap jual: nasi, ayam, ikan, dan paket resto"],
    ["Menu Minuman", "Minuman dingin/panas khas Indonesia"],
    ["Bahan Baku Dapur", "Stok bahan utama untuk produksi menu"],
    ["Bumbu & Rempah", "Bumbu basah, kering, sambal, dan rempah"],
    ["Kemasan Takeaway", "Box nasi, paper bag, cup, sedotan, dan packaging online"],
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
  console.log("🚀 Start Indonesian restaurant seeding for NATS...");
  const start = Date.now();
  try {
    await seedCompany();
    await seedAccounting();
    await seedUsers();
    await seedCompanyIndonesia();
    await seedCashAccountsIndonesia();
    await seedReportTemplatesIndonesia();
    const contacts = await seedContactsIndonesia();
    const inventoryContext = await seedInventoryIndonesia();
    await seedPackageBomsIndonesia(inventoryContext);
    await seedRestaurantTransactionsIndonesia(inventoryContext, contacts);
    console.log(`✅ Indonesian restaurant seeding completed in ${(Date.now() - start) / 1000}s`);
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
