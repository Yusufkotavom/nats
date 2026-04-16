import { prisma } from "./seed/utils";
import { seedAccounting } from "./seed/accounting";
import { seedCompany } from "./seed/company";
import { seedUsers } from "./seed/users";

async function main() {
  console.log("🚀 Start minimal seeding...");
  const start = Date.now();

  try {
    await seedCompany();
    await seedAccounting(); // Accounts, Tax Rates
    await seedUsers(); // Roles, Users

    const end = Date.now();
    console.log(`✅ Minimal seeding completed in ${(end - start) / 1000}s`);
  } catch (e) {
    console.error("❌ Minimal seeding failed:", e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
