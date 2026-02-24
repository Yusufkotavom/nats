import { prisma } from "./utils";
import { managementPrisma } from "../../lib/prisma/tenant";
import { hash } from "bcryptjs";

export async function seedUsers() {
    console.log("Seeding Users and Roles...");

    // Seed Roles
    const superAdminRole = await managementPrisma.role.upsert({
        where: { name: "superadmin" },
        update: {},
        create: {
            name: "superadmin",
            description: "Super Administrator with full access",
            permissions: ["*"],
        },
    });

    const accountantRole = await managementPrisma.role.upsert({
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

    const cashierRole = await managementPrisma.role.upsert({
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

    const managerRole = await managementPrisma.role.upsert({
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

    const defaultTenant = await managementPrisma.tenant.upsert({
        where: { slug: "default" },
        update: {},
        create: {
            name: "Default Tenant",
            slug: "default",
            dbUrl: process.env.DATABASE_URL || "postgresql://yesi:@localhost:5432/yesi",
        }
    });

    const adminUser = await managementPrisma.user.upsert({
        where: { email: "admin@example.com" },
        update: { password },
        create: {
            email: "admin@example.com",
            name: "Admin User",
            password,
        },
    });
    await managementPrisma.tenantMember.upsert({
        where: { tenantId_userId: { tenantId: defaultTenant.id, userId: adminUser.id } },
        update: { roleId: superAdminRole.id },
        create: { tenantId: defaultTenant.id, userId: adminUser.id, roleId: superAdminRole.id }
    });

    const cashierUser = await managementPrisma.user.upsert({
        where: { email: "cashier@example.com" },
        update: { password },
        create: {
            email: "cashier@example.com",
            name: "Jane Cashier",
            password,
        },
    });
    await managementPrisma.tenantMember.upsert({
        where: { tenantId_userId: { tenantId: defaultTenant.id, userId: cashierUser.id } },
        update: { roleId: cashierRole.id },
        create: { tenantId: defaultTenant.id, userId: cashierUser.id, roleId: cashierRole.id }
    });

    const accountantUser = await managementPrisma.user.upsert({
        where: { email: "accountant@example.com" },
        update: { password },
        create: {
            email: "accountant@example.com",
            name: "John Accountant",
            password,
        },
    });
    await managementPrisma.tenantMember.upsert({
        where: { tenantId_userId: { tenantId: defaultTenant.id, userId: accountantUser.id } },
        update: { roleId: accountantRole.id },
        create: { tenantId: defaultTenant.id, userId: accountantUser.id, roleId: accountantRole.id }
    });

    const managerUser = await managementPrisma.user.upsert({
        where: { email: "manager@example.com" },
        update: { password },
        create: {
            email: "manager@example.com",
            name: "Mike Manager",
            password,
        },
    });
    await managementPrisma.tenantMember.upsert({
        where: { tenantId_userId: { tenantId: defaultTenant.id, userId: managerUser.id } },
        update: { roleId: managerRole.id },
        create: { tenantId: defaultTenant.id, userId: managerUser.id, roleId: managerRole.id }
    });
}
