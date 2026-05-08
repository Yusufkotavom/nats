import { Decimal } from "decimal.js";
import { ContactType, EmploymentStatus } from "./generated/prisma/client";
import { seedAccounting } from "./seed/accounting";
import { seedCompany } from "./seed/company";
import { seedUsers } from "./seed/users";
import { prisma } from "./seed/utils";

const m = (value: number) => new Decimal(value);

async function main() {
  console.log("🚀 Start restaurant minimal seeding (no transactions)...");
  const start = Date.now();

  try {
    // Extend from minimal seed baseline
    await seedCompany();
    await seedAccounting();
    await seedUsers();

    const units = [
      { name: "Porsi", symbol: "PRS" },
      { name: "Gram", symbol: "GR" },
      { name: "Kilogram", symbol: "KG" },
      { name: "Mililiter", symbol: "ML" },
      { name: "Liter", symbol: "L" },
      { name: "Pieces", symbol: "PCS" },
      { name: "Bottle", symbol: "BTL" },
      { name: "Lusin", symbol: "DZN" },
    ];

    for (const unit of units) {
      await prisma.unit.upsert({
        where: { symbol: unit.symbol },
        update: { name: unit.name },
        create: unit,
      });
    }

    const categoryMakanan = await prisma.category.upsert({
      where: { name: "Menu Makanan" },
      update: { description: "Menu makanan siap jual" },
      create: { name: "Menu Makanan", description: "Menu makanan siap jual" },
    });

    const categoryMinuman = await prisma.category.upsert({
      where: { name: "Menu Minuman" },
      update: { description: "Menu minuman siap jual" },
      create: { name: "Menu Minuman", description: "Menu minuman siap jual" },
    });

    const categoryBahan = await prisma.category.upsert({
      where: { name: "Bahan Baku Restoran" },
      update: { description: "Bahan baku dapur restoran" },
      create: { name: "Bahan Baku Restoran", description: "Bahan baku dapur restoran" },
    });

    const warehouse = await prisma.warehouse.upsert({
      where: { name: "Gudang Dapur Utama" },
      update: { location: "Area Dapur" },
      create: { name: "Gudang Dapur Utama", location: "Area Dapur" },
    });

    const getUnit = async (symbol: string) => prisma.unit.findUniqueOrThrow({ where: { symbol } });
    const unitPrs = await getUnit("PRS");
    const unitGr = await getUnit("GR");
    const unitPcs = await getUnit("PCS");
    const unitBtl = await getUnit("BTL");

    const products = [
      // Raw materials
      {
        sku: "BBK-BERAS-001",
        name: "Beras Putih",
        categoryId: categoryBahan.id,
        // Base unit GR => price/cost must be per gram (not per kg).
        price: m(17),
        cost: m(15),
        averageCost: m(15),
        minStock: 1000,
        baseUnitId: unitGr.id,
      },
      {
        sku: "BBK-GURAMI-001",
        name: "Ikan Gurami Segar",
        categoryId: categoryBahan.id,
        price: m(38000),
        cost: m(32000),
        averageCost: m(32000),
        minStock: 30,
        baseUnitId: unitPcs.id,
      },
      {
        sku: "BBK-TEH-001",
        name: "Teh Celup",
        categoryId: categoryBahan.id,
        price: m(800),
        cost: m(500),
        averageCost: m(500),
        minStock: 100,
        baseUnitId: unitPcs.id,
      },
      {
        sku: "BBK-GULA-001",
        name: "Gula Pasir",
        categoryId: categoryBahan.id,
        // Base unit GR => price/cost must be per gram (not per kg).
        price: m(18),
        cost: m(16),
        averageCost: m(16),
        minStock: 1000,
        baseUnitId: unitGr.id,
      },
      {
        sku: "BBK-MINYAK-001",
        name: "Minyak Goreng",
        categoryId: categoryBahan.id,
        // Base unit GR => price/cost must be per gram (approximation for v1 integer model).
        price: m(22),
        cost: m(20),
        averageCost: m(20),
        minStock: 500,
        baseUnitId: unitGr.id,
      },
      // Sellable menu / drinks
      {
        sku: "MENU-NASGOR-001",
        name: "Nasi Goreng",
        categoryId: categoryMakanan.id,
        price: m(28000),
        cost: m(14000),
        averageCost: m(14000),
        minStock: 10,
        baseUnitId: unitPrs.id,
      },
      {
        sku: "MENU-GURAMI-001",
        name: "Gurami Bakar",
        categoryId: categoryMakanan.id,
        price: m(42000),
        cost: m(24000),
        averageCost: m(24000),
        minStock: 10,
        baseUnitId: unitPrs.id,
      },
      {
        sku: "MENU-ESTEH-001",
        name: "Es Teh",
        categoryId: categoryMinuman.id,
        price: m(8000),
        cost: m(3000),
        averageCost: m(3000),
        minStock: 20,
        baseUnitId: unitPrs.id,
      },
      {
        sku: "MENU-AQUA-001",
        name: "Air Mineral Aqua",
        categoryId: categoryMinuman.id,
        price: m(6000),
        cost: m(4000),
        averageCost: m(4000),
        minStock: 24,
        baseUnitId: unitBtl.id,
      },
    ] as const;

    for (const p of products) {
      await prisma.product.upsert({
        where: { sku: p.sku },
        update: {
          name: p.name,
          categoryId: p.categoryId,
          price: p.price,
          cost: p.cost,
          averageCost: p.averageCost,
          minStock: p.minStock,
          baseUnitId: p.baseUnitId,
          purchaseUnitId: p.baseUnitId,
          salesUnitId: p.baseUnitId,
          isActive: true,
        },
        create: {
          sku: p.sku,
          name: p.name,
          categoryId: p.categoryId,
          price: p.price,
          cost: p.cost,
          averageCost: p.averageCost,
          minStock: p.minStock,
          baseUnitId: p.baseUnitId,
          purchaseUnitId: p.baseUnitId,
          salesUnitId: p.baseUnitId,
          isActive: true,
        },
      });
    }

    // Restaurant baseline starts with zero stock; inventory should be created by real transactions.
    const seededSkus = [
      "BBK-BERAS-001",
      "BBK-GURAMI-001",
      "BBK-TEH-001",
      "BBK-GULA-001",
      "BBK-MINYAK-001",
      "MENU-NASGOR-001",
      "MENU-GURAMI-001",
      "MENU-ESTEH-001",
      "MENU-AQUA-001",
    ] as const;

    for (const sku of seededSkus) {
      const product = await prisma.product.findUniqueOrThrow({ where: { sku } });
      const existingInventory = await prisma.inventory.findFirst({
        where: { warehouseId: warehouse.id, productId: product.id, batchNumber: null },
      });

      if (!existingInventory) {
        await prisma.inventory.create({
          data: {
            warehouseId: warehouse.id,
            productId: product.id,
            quantity: 0,
            unitCost: product.cost,
            reorderPoint: product.minStock,
          },
        });
      } else {
        await prisma.inventory.update({
          where: { id: existingInventory.id },
          data: {
            quantity: 0,
            unitCost: product.cost,
            reorderPoint: product.minStock,
          },
        });
      }
    }

    const menuNasgor = await prisma.product.findUniqueOrThrow({ where: { sku: "MENU-NASGOR-001" } });
    const menuGurami = await prisma.product.findUniqueOrThrow({ where: { sku: "MENU-GURAMI-001" } });
    const menuEsTeh = await prisma.product.findUniqueOrThrow({ where: { sku: "MENU-ESTEH-001" } });

    const bahanBeras = await prisma.product.findUniqueOrThrow({ where: { sku: "BBK-BERAS-001" } });
    const bahanGurami = await prisma.product.findUniqueOrThrow({ where: { sku: "BBK-GURAMI-001" } });
    const bahanTeh = await prisma.product.findUniqueOrThrow({ where: { sku: "BBK-TEH-001" } });
    const bahanGula = await prisma.product.findUniqueOrThrow({ where: { sku: "BBK-GULA-001" } });
    const bahanMinyak = await prisma.product.findUniqueOrThrow({ where: { sku: "BBK-MINYAK-001" } });

    const upsertBom = async (
      bomNumber: string,
      productId: string,
      name: string,
      items: Array<{ productId: string; quantity: number; unitCost: Decimal }>
    ) => {
      const existing = await prisma.billOfMaterial.findUnique({ where: { bomNumber }, include: { items: true } });

      if (existing) {
        await prisma.billOfMaterial.update({
          where: { id: existing.id },
          data: {
            name,
            productId,
            quantity: 1,
            isActive: true,
          },
        });

        await prisma.billOfMaterialItem.deleteMany({ where: { billOfMaterialId: existing.id } });
        await prisma.billOfMaterialItem.createMany({
          data: items.map((item) => ({
            billOfMaterialId: existing.id,
            productId: item.productId,
            quantity: m(item.quantity),
            unitCost: item.unitCost,
          })),
        });
        return;
      }

      const created = await prisma.billOfMaterial.create({
        data: {
          bomNumber,
          name,
          productId,
          quantity: 1,
          isActive: true,
        },
      });

      await prisma.billOfMaterialItem.createMany({
        data: items.map((item) => ({
          billOfMaterialId: created.id,
          productId: item.productId,
          quantity: m(item.quantity),
          unitCost: item.unitCost,
        })),
      });
    };

    await upsertBom("BOM-MENU-NASGOR-001", menuNasgor.id, "BOM Nasi Goreng", [
      { productId: bahanBeras.id, quantity: 200, unitCost: bahanBeras.cost },
      { productId: bahanMinyak.id, quantity: 15, unitCost: bahanMinyak.cost },
    ]);

    await upsertBom("BOM-MENU-GURAMI-001", menuGurami.id, "BOM Gurami Bakar", [
      { productId: bahanGurami.id, quantity: 1, unitCost: bahanGurami.cost },
      { productId: bahanMinyak.id, quantity: 20, unitCost: bahanMinyak.cost },
    ]);

    await upsertBom("BOM-MENU-ESTEH-001", menuEsTeh.id, "BOM Es Teh", [
      { productId: bahanTeh.id, quantity: 1, unitCost: bahanTeh.cost },
      { productId: bahanGula.id, quantity: 10, unitCost: bahanGula.cost },
    ]);

    // Minimal employee data for restaurant operations setup (no payroll transactions).
    const employees = [
      {
        email: "andi.kasir@resto.local",
        name: "Andi Kasir",
        phone: "081200000001",
        address: "Jakarta",
        jobTitle: "Kasir",
        department: "Operasional",
      },
      {
        email: "siti.kitchen@resto.local",
        name: "Siti Kitchen",
        phone: "081200000002",
        address: "Jakarta",
        jobTitle: "Cook",
        department: "Dapur",
      },
      {
        email: "budi.supervisor@resto.local",
        name: "Budi Supervisor",
        phone: "081200000003",
        address: "Jakarta",
        jobTitle: "Supervisor Outlet",
        department: "Operasional",
      },
    ] as const;

    for (const employee of employees) {
      const existingContact = await prisma.contact.findFirst({
        where: { email: employee.email },
      });

      const contact = existingContact
        ? await prisma.contact.update({
            where: { id: existingContact.id },
            data: {
              type: ContactType.EMPLOYEE,
              name: employee.name,
              phone: employee.phone,
              address: employee.address,
              isActive: true,
            },
          })
        : await prisma.contact.create({
            data: {
              type: ContactType.EMPLOYEE,
              email: employee.email,
              name: employee.name,
              phone: employee.phone,
              address: employee.address,
              isActive: true,
            },
          });

      await prisma.employeeDetail.upsert({
        where: { contactId: contact.id },
        update: {
          employmentStatus: EmploymentStatus.FULL_TIME,
          jobTitle: employee.jobTitle,
          department: employee.department,
        },
        create: {
          contactId: contact.id,
          joinDate: new Date("2026-01-01T00:00:00.000Z"),
          employmentStatus: EmploymentStatus.FULL_TIME,
          jobTitle: employee.jobTitle,
          department: employee.department,
        },
      });
    }

    const end = Date.now();
    console.log(`✅ Restaurant minimal seeding completed in ${(end - start) / 1000}s`);
  } catch (e) {
    console.error("❌ Restaurant minimal seeding failed:", e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
