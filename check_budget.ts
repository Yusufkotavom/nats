
import { prisma } from "./lib/prisma";

async function main() {
    const budget = await prisma.budget.findFirst({
        orderBy: { createdAt: "desc" },
    });
    console.log(JSON.stringify(budget, null, 2));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
