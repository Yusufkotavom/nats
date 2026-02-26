import { PrismaClient as ManagementClient } from "../prisma/generated/management-client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
config();
const adapter = new PrismaPg({ connectionString: process.env.MANAGEMENT_DATABASE_URL || process.env.DATABASE_URL });
const managementPrisma = new ManagementClient({ adapter });

async function main() {
    try {
        await managementPrisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerified" TIMESTAMP(3);`);
        console.log("Added emailVerified");

        await managementPrisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "VerificationToken" (
                "id" TEXT NOT NULL,
                "identifier" TEXT NOT NULL,
                "token" TEXT NOT NULL,
                "expires" TIMESTAMP(3) NOT NULL,
                CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("id")
            );
        `);
        console.log("Created VerificationToken");

        await managementPrisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_token_key" ON "VerificationToken"("token");`);
        await managementPrisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");`);
        console.log("Created Indexes");
    } catch (e) {
        console.error(e)
    } finally {
        await managementPrisma.$disconnect();
    }
}
main();
