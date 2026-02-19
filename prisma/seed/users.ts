import { prisma } from "./utils";
import { hash } from "bcryptjs";

export async function seedUsers() {
    console.log("Seeding Users and Roles...");

    // Seed Roles
    const superAdminRole = await prisma.role.upsert({
        where: { name: "superadmin" },
        update: {},
        create: {
            name: "superadmin",
            description: "Super Administrator with full access",
            permissions: ["*"],
        },
    });

    const accountantRole = await prisma.role.upsert({
        where: { name: "Accountant" },
        update: {},
        create: {
            name: "Accountant",
            description: "Accountant with financial access",
            permissions: [
                "accounting.view",
                "accounting.create",
                "reports.view",
                "budgeting.view",
                "budgeting.create"
            ],
        },
    });

    const cashierRole = await prisma.role.upsert({
        where: { name: "Cashier" },
        update: {},
        create: {
            name: "Cashier",
            description: "POS Cashier",
            permissions: [
                "pos.access",
                "sales.create",
                "sales.view",
                "sales.payments",
                "products.view",
                "customers.create",
                "customers.view",
                "inventory.view"
            ],
        },
    });

    const managerRole = await prisma.role.upsert({
        where: { name: "Manager" },
        update: {},
        create: {
            name: "Manager",
            description: "Department Manager",
            permissions: [
                "hr.view",
                "hr.create",
                "budgeting.view",
                "budgeting.approve"
            ],
        },
    });

    // Seed Users
    const password = await hash("password123", 10);

    await prisma.user.upsert({
        where: { email: "admin@example.com" },
        update: { password },
        create: {
            email: "admin@example.com",
            name: "Admin User",
            password,
            roleId: superAdminRole.id,
        },
    });

    await prisma.user.upsert({
        where: { email: "cashier@example.com" },
        update: { password },
        create: {
            email: "cashier@example.com",
            name: "Jane Cashier",
            password,
            roleId: cashierRole.id,
        },
    });

    await prisma.user.upsert({
        where: { email: "accountant@example.com" },
        update: { password },
        create: {
            email: "accountant@example.com",
            name: "John Accountant",
            password,
            roleId: accountantRole.id,
        },
    });

    await prisma.user.upsert({
        where: { email: "manager@example.com" },
        update: { password },
        create: {
            email: "manager@example.com",
            name: "Mike Manager",
            password,
            roleId: managerRole.id,
        },
    });
}
