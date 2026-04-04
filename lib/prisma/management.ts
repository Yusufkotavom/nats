import { PrismaClient as ManagementClient } from "@/prisma/generated/management-client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
    connectionString: process.env.MANAGEMENT_DATABASE_URL || process.env.DATABASE_URL,
});

// Global instance for management client in development
const globalForManagement = global as unknown as { managementPrisma: ManagementClient };

export const managementPrisma =
    globalForManagement.managementPrisma || new ManagementClient({ adapter, log: ["error", "warn"] });

if (process.env.NODE_ENV !== "production") globalForManagement.managementPrisma = managementPrisma;
