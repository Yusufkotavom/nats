import { prisma } from "./seed/utils";
import { seedAccounting } from "./seed/accounting";
import { seedCompany } from "./seed/company";
import { seedUsers } from "./seed/users";
import { seedInventory } from "./seed/inventory";
import { seedContacts } from "./seed/contacts";
import { seedHR } from "./seed/hr";
import { seedProjects } from "./seed/projects";
import { seedTransactions } from "./seed/transactions";

async function main() {
  console.log("🚀 Start seeding...");
  const start = Date.now();

  try {
    await seedCompany();
    await seedAccounting(); // Accounts, Tax Rates
    await seedUsers();      // Roles, Users
    await seedInventory();  // Warehouses, Units, Categories, Products
    await seedContacts();   // Customers, Vendors
    await seedHR();         // Departments, Employees, Salary Components
    await seedProjects();   // Projects
    await seedTransactions(); // Sales, Purchases, JEs

    const end = Date.now();
    console.log(`✅ Seeding completed in ${(end - start) / 1000}s`);
  } catch (e) {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
