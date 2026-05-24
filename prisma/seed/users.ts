import { prisma } from "./utils";
import { hash } from "bcryptjs";
import { faker } from "@faker-js/faker";
import { getRandomItem } from "./bulk_utils";

export async function seedUsers() {
    console.log("Seeding Users and Roles...");
    const defaultCompany = await prisma.company.findUnique({
        where: { code: "nats-accounting" },
        select: { id: true },
    });
    if (!defaultCompany) {
        throw new Error("Default company not found. Run seedCompany first.");
    }

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

    const companyAdminRole = await prisma.role.upsert({
        where: { name: "company_admin" },
        update: {},
        create: {
            name: "company_admin",
            description: "Company admin within a tenant scope",
            permissions: [
                "dashboard.view",
                "company.settings",
                "users.create",
                "users.edit",
                "users.delete",
                "roles:create",
                "roles:update",
                "roles:delete",
                "contacts.create",
                "contacts.edit",
                "contacts.delete",
                "files.upload",
                "files.delete",
                "integrations.outbox.view",
                "integrations.outbox.retry",
                "integrations.outbox.dispatch",
                "pos.access",
                "sales.view",
                "sales.create",
                "purchase.view",
                "purchase.create",
                "inventory.view",
                "inventory.create",
                "accounting.view",
                "accounting.create",
                "budgeting.view",
                "budgeting.create",
                "reporting.view",
                "hr.view",
            ],
        },
    });

    const customerRole = await prisma.role.upsert({
        where: { name: "Customer" },
        update: {},
        create: {
            name: "Customer",
            description: "Default Customer Role",
            permissions: ["profile.view", "orders.view", "orders.create"],
        },
    });

    const merchantRole = await prisma.role.upsert({
        where: { name: "Merchant" },
        update: {},
        create: {
            name: "Merchant",
            description: "Merchant/Vendor Role",
            permissions: ["products.manage", "orders.manage", "sales.view"],
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
    const passwordHash = await hash("password123", 10);

    const adminUser = await prisma.user.upsert({
        where: { email: "admin@example.com" },
        update: { password: passwordHash, roleId: companyAdminRole.id },
        create: {
            email: "admin@example.com",
            name: "Admin User",
            password: passwordHash,
            roleId: companyAdminRole.id
        },
    });

    const merchantUser = await prisma.user.upsert({
        where: { email: "merchant@example.com" },
        update: { password: passwordHash, roleId: merchantRole.id },
        create: {
            email: "merchant@example.com",
            name: "Sample Merchant",
            password: passwordHash,
            roleId: merchantRole.id
        },
    });

    const customerUser = await prisma.user.upsert({
        where: { email: "customer@example.com" },
        update: { password: passwordHash, roleId: customerRole.id },
        create: {
            email: "customer@example.com",
            name: "Sample Customer",
            password: passwordHash,
            roleId: customerRole.id
        },
    });

    const cashierUser = await prisma.user.upsert({
        where: { email: "cashier@example.com" },
        update: { password: passwordHash, roleId: cashierRole.id },
        create: {
            email: "cashier@example.com",
            name: "Jane Cashier",
            password: passwordHash,
            roleId: cashierRole.id
        },
    });

    const accountantUser = await prisma.user.upsert({
        where: { email: "accountant@example.com" },
        update: { password: passwordHash, roleId: accountantRole.id },
        create: {
            email: "accountant@example.com",
            name: "John Accountant",
            password: passwordHash,
            roleId: accountantRole.id
        },
    });

    const managerUser = await prisma.user.upsert({
        where: { email: "manager@example.com" },
        update: { password: passwordHash, roleId: managerRole.id },
        create: {
            email: "manager@example.com",
            name: "Mike Manager",
            password: passwordHash,
            roleId: managerRole.id
        },
    });

    const memberships = [
        { userId: adminUser.id, isDefault: true },
        { userId: merchantUser.id, isDefault: false },
        { userId: customerUser.id, isDefault: false },
        { userId: cashierUser.id, isDefault: false },
        { userId: accountantUser.id, isDefault: false },
        { userId: managerUser.id, isDefault: false },
    ];

    for (const membership of memberships) {
        await prisma.companyMembership.upsert({
            where: {
                companyId_userId: {
                    companyId: defaultCompany.id,
                    userId: membership.userId,
                },
            },
            update: { isDefault: membership.isDefault },
            create: {
                companyId: defaultCompany.id,
                userId: membership.userId,
                isDefault: membership.isDefault,
            },
        });
    }

    // Keep one platform-level superadmin account for SaaS operations.
    const platformSuperAdmin = await prisma.user.upsert({
        where: { email: "platform@example.com" },
        update: { password: passwordHash, roleId: superAdminRole.id },
        create: {
            email: "platform@example.com",
            name: "Platform Superadmin",
            password: passwordHash,
            roleId: superAdminRole.id,
        },
    });

    // Optional default membership so platform superadmin can immediately enter tenant context.
    await prisma.companyMembership.upsert({
        where: {
            companyId_userId: {
                companyId: defaultCompany.id,
                userId: platformSuperAdmin.id,
            },
        },
        update: { isDefault: true },
        create: {
            companyId: defaultCompany.id,
            userId: platformSuperAdmin.id,
            isDefault: true,
        },
    });
}

export async function seedBulkUsers(count: number) {
    console.log(`Seeding ${count} Bulk Users...`);

    const roles = await prisma.role.findMany({
        where: { name: { not: "superadmin" } }
    });

    if (roles.length === 0) {
        console.warn("No roles found for bulk users. Skipping.");
        return;
    }

    const passwordHash = await hash("password123", 10);
    const users = [];

    for (let i = 0; i < count; i++) {
        const firstName = faker.person.firstName();
        const lastName = faker.person.lastName();
        const email = faker.internet.email({ firstName, lastName }).toLowerCase();
        
        users.push({
            email: `bulk_${i}_${email}`, // Ensure uniqueness
            name: `${firstName} ${lastName}`,
            password: passwordHash,
            roleId: getRandomItem(roles).id,
        });
    }

    // Using createMany for performance
    await prisma.user.createMany({
        data: users,
        skipDuplicates: true,
    });
}
