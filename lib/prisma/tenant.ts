import { PrismaClient } from "@/prisma/generated/prisma/client";
// Since management is generated separately
import { PrismaClient as ManagementClient } from "@/prisma/generated/management-client";

// Global instance for management client in development
const globalForManagement = global as unknown as { managementPrisma: ManagementClient };

export const managementPrisma =
    globalForManagement.managementPrisma || new ManagementClient();

if (process.env.NODE_ENV !== "production") globalForManagement.managementPrisma = managementPrisma;

// Caches for dynamic tenant clients
const tenantClients: Record<string, PrismaClient> = {};

/**
 * Gets a dynamically connected PrismaClient for a specific tenant database.
 * If the connection URL does not exist, it throws an error.
 */
export async function getTenantPrismaClient(tenantId: string): Promise<PrismaClient> {
    // If we already instantiated a client for this tenant, reuse it
    if (tenantClients[tenantId]) {
        return tenantClients[tenantId];
    }

    // 1. Fetch connection string from Management DB
    const tenant = await managementPrisma.tenant.findUnique({
        where: { id: tenantId },
        select: { dbUrl: true, isActive: true },
    });

    if (!tenant) {
        throw new Error(`Tenant with ID ${tenantId} not found.`);
    }

    if (!tenant.isActive) {
        throw new Error(`Tenant with ID ${tenantId} is inactive.`);
    }

    if (!tenant.dbUrl) {
        throw new Error(`Tenant ${tenantId} does not have a configured database URL.`);
    }

    // 2. Instantiate new PrismaClient connecting uniquely to that database schema
    const adapter = new (require("@prisma/adapter-pg").PrismaPg)({
        connectionString: tenant.dbUrl,
    });
    const client = new PrismaClient({ adapter });

    // Optional: Verify connection or add Prisma extensions here

    tenantClients[tenantId] = client;
    return client;
}
