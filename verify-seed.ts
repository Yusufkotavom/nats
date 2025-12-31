import { prisma } from "@/lib/prisma";

async function verify() {
  const pos = await prisma.purchaseOrder.count();
  const prs = await prisma.purchaseReceive.count();
  const pis = await prisma.purchaseInvoice.count();

  console.log(`Purchase Orders: ${pos}`);
  console.log(`Purchase Receives: ${prs}`);
  console.log(`Purchase Invoices: ${pis}`);

  const samplePO = await prisma.purchaseOrder.findFirst({
    include: { items: true, receives: true, invoices: true },
  });
  console.log("Sample PO:", JSON.stringify(samplePO, null, 2));
}

verify()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
