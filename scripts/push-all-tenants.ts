import 'dotenv/config';
import { managementPrisma } from '../lib/prisma/tenant';
import { execSync } from 'child_process';

async function main() {
    const tenants = await managementPrisma.tenant.findMany({
        where: { dbUrl: { not: null } }
    });

    if (tenants.length === 0) {
        console.log("No tenants found with a dbUrl configured.");
        return;
    }

    for (const tenant of tenants) {
        console.log(`\n\n=== Pushing schema for tenant: ${tenant.name} (${tenant.slug}) ===`);
        console.log(`DB URL: ${tenant.dbUrl}`);
        try {
            execSync(`PRISMA_DB_URL="${tenant.dbUrl}" npx prisma db push --schema=prisma/schema --accept-data-loss`, {
                stdio: 'inherit'
            });
            console.log(`✅ Schema applied successfully for ${tenant.slug}`);
        } catch (e: any) {
            console.error(`❌ Failed to apply schema for ${tenant.slug}:`, e.message);
        }
    }
}

main().catch(console.error).finally(() => managementPrisma.$disconnect());
