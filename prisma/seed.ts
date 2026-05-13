import { prisma } from "./seed/utils";
import { seedAccounting } from "./seed/accounting";
import { seedCompany } from "./seed/company";
import { seedUsers } from "./seed/users";
import {
  DAILY_REQUIRED_DEFAULT_ACCOUNT_PURPOSES,
  verifyDefaultAccounts,
} from "./seed/default-accounts";

async function main() {
  console.log("🚀 Start default minimal seeding...");
  const start = Date.now();

  try {
    await seedCompany();
    await seedAccounting();
    await seedUsers();
    await verifyDefaultAccounts(
      DAILY_REQUIRED_DEFAULT_ACCOUNT_PURPOSES,
      "daily operations",
    );

    const end = Date.now();
    console.log(`✅ Default minimal seeding completed in ${(end - start) / 1000}s`);
  } catch (e) {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
