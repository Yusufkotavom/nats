import { prisma } from "./seed/utils";
import { seedDemoIndonesia } from "./seed/demo-indonesia";

async function main() {
  console.log("🚀 Start seeding demo dataset...");
  const start = Date.now();

  try {
    await seedDemoIndonesia();

    const end = Date.now();
    console.log(`✅ Demo seeding completed in ${(end - start) / 1000}s`);
  } catch (e) {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
