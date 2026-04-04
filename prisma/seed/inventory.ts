import { prisma } from "./utils";
import { Decimal } from "decimal.js";
import { faker } from "@faker-js/faker";
import { getRandomItem, generateUniqueSKU } from "./bulk_utils";

export async function seedInventory() {
    console.log("Seeding Inventory Module...");

    // Seed Warehouses
    const warehouses = [
        {
            name: "Main Warehouse",
            location: "New York",
        },
        {
            name: "West Coast Hub",
            location: "Los Angeles",
        },
    ];

    for (const warehouse of warehouses) {
        await prisma.warehouse.upsert({
            where: { name: warehouse.name },
            update: {},
            create: {
                name: warehouse.name,
                location: warehouse.location,
            },
        });
    }

    // Seed Units
    const units = [
        { name: "Pieces", symbol: "PCS" },
        { name: "Box", symbol: "BOX" },
        { name: "Kilogram", symbol: "KG" },
        { name: "Liter", symbol: "L" },
        { name: "Set", symbol: "SET" },
    ];

    for (const unit of units) {
        await prisma.unit.upsert({
            where: { name: unit.name },
            update: {},
            create: {
                name: unit.name,
                symbol: unit.symbol,
            },
        });
    }

    // Seed Categories
    const categories = [
        { name: "Electronics", description: "Electronic devices and accessories" },
        { name: "Furniture", description: "Office and home furniture" },
        { name: "Office Supplies", description: "Paper, pens, and other supplies" },
        { name: "Clothing", description: "Apparel and accessories" },
        { name: "Groceries", description: "Food and beverages" },
    ];

    for (const category of categories) {
        await prisma.category.upsert({
            where: { name: category.name },
            update: {},
            create: {
                name: category.name,
                description: category.description,
            },
        });
    }

    // Helper to get ID
    const getCategory = async (name: string) =>
        prisma.category.findUnique({ where: { name } });
    const getUnit = async (symbol: string) =>
        prisma.unit.findUnique({ where: { symbol } });
    const getWarehouse = async (name: string) =>
        prisma.warehouse.findUnique({ where: { name } });

    const catElectronics = await getCategory("Electronics");
    const catFurniture = await getCategory("Furniture");
    const catSupplies = await getCategory("Office Supplies");

    const unitPcs = await getUnit("PCS");
    const unitBox = await getUnit("BOX");

    const mainWarehouse = await getWarehouse("Main Warehouse");

    if (
        catElectronics &&
        catFurniture &&
        catSupplies &&
        unitPcs &&
        unitBox &&
        mainWarehouse
    ) {
        // Seed Products
        const products = [
            {
                sku: "ELEC-001",
                name: "Pro Laptop 15",
                description: "High performance laptop",
                categoryId: catElectronics.id,
                price: 1200,
                cost: 800,
                baseUnitId: unitPcs.id,
                minStock: 10,
                stock: 50,
            },
            {
                sku: "FURN-001",
                name: "Ergo Chair",
                description: "Ergonomic office chair",
                categoryId: catFurniture.id,
                price: 350,
                cost: 150,
                baseUnitId: unitPcs.id,
                minStock: 5,
                stock: 20,
            },
            {
                sku: "SUPP-001",
                name: "A4 Paper Ream",
                description: "Standard A4 paper (500 sheets)",
                categoryId: catSupplies.id,
                price: 5.5,
                cost: 2.5,
                baseUnitId: unitPcs.id,
                minStock: 100,
                stock: 500,
            },
            {
                sku: "ELEC-002",
                name: "Wireless Mouse",
                description: "Ergonomic wireless mouse",
                categoryId: catElectronics.id,
                price: 25,
                cost: 10,
                baseUnitId: unitPcs.id,
                minStock: 20,
                stock: 100,
            },
            {
                sku: "FURN-002",
                name: "Office Desk",
                description: "Standing desk",
                categoryId: catFurniture.id,
                price: 500,
                cost: 250,
                baseUnitId: unitPcs.id,
                minStock: 2,
                stock: 10,
            },
        ];

        for (const prod of products) {
            const product = await prisma.product.upsert({
                where: { sku: prod.sku },
                update: {
                    name: prod.name,
                    description: prod.description,
                    categoryId: prod.categoryId,
                    price: prod.price,
                    cost: prod.cost,
                    baseUnitId: prod.baseUnitId,
                    minStock: prod.minStock,
                },
                create: {
                    sku: prod.sku,
                    name: prod.name,
                    description: prod.description,
                    categoryId: prod.categoryId,
                    price: prod.price,
                    cost: prod.cost,
                    baseUnitId: prod.baseUnitId, // Make sure this mapping is correct as 'baseUnitId'
                    minStock: prod.minStock,
                },
            });

            // Initialize stock in main warehouse if not present
            // using Inventory model
            const inventoryItem = await prisma.inventory.findFirst({
                where: {
                    warehouseId: mainWarehouse.id,
                    productId: product.id,
                },
            });

            if (!inventoryItem) {
                await prisma.inventory.create({
                    data: {
                        warehouseId: mainWarehouse.id,
                        productId: product.id,
                        quantity: prod.stock,
                        unitCost: new Decimal(prod.cost),
                        reorderPoint: prod.minStock,
                    },
                });
            }
        }
    }
}

export async function seedBulkInventory(count: number) {
    console.log(`Seeding ${count} Bulk Products...`);

    const categories = await prisma.category.findMany();
    const units = await prisma.unit.findMany();
    const warehouses = await prisma.warehouse.findMany();

    if (categories.length === 0 || units.length === 0 || warehouses.length === 0) {
        console.warn("Missing Categories, Units, or Warehouses. Skipping bulk inventory.");
        return;
    }

    const products = [];
    for (let i = 0; i < count; i++) {
        const name = faker.commerce.productName();
        const price = parseFloat(faker.commerce.price({ min: 10, max: 2000 }));
        const cost = price * 0.6;
        const category = getRandomItem(categories);
        const unit = getRandomItem(units);
        const sku = generateUniqueSKU(category.name.substring(0, 3).toUpperCase(), i + 100);

        products.push({
            sku,
            name,
            description: faker.commerce.productDescription(),
            categoryId: category.id,
            price: new Decimal(price),
            cost: new Decimal(cost),
            baseUnitId: unit.id,
            minStock: faker.number.int({ min: 5, max: 100 }),
        });
    }

    await prisma.product.createMany({
        data: products,
        skipDuplicates: true,
    });

    // Initialize stock for bulk products in a random warehouse
    console.log("Initializing stock for bulk products...");
    const allProducts = await prisma.product.findMany({
        where: { sku: { contains: "-" } }, // Rough filter for bulk products
        take: count,
        orderBy: { createdAt: 'desc' }
    });

    const inventoryData = allProducts.map(p => ({
        warehouseId: getRandomItem(warehouses).id,
        productId: p.id,
        quantity: faker.number.int({ min: 10, max: 500 }),
        unitCost: p.cost,
        reorderPoint: p.minStock,
    }));

    await prisma.inventory.createMany({
        data: inventoryData,
        skipDuplicates: true,
    });
}
