import { prisma } from "./utils";

export async function seedCompany() {
    console.log("Seeding Company...");

    const companyProfile = {
        name: "NATS Accounting",
        address: "123 Business Rd, Tech City",
        phone: "555-0100",
        email: "contact@nats.com",
        website: "https://nats.com",
        taxId: "123-456-789",
        currency: "USD",
        locale: "en-US",
        timezone: "UTC",
    };

    const company = await prisma.company.upsert({
        where: { code: "nats-accounting" },
        update: { name: companyProfile.name },
        create: {
            code: "nats-accounting",
            name: companyProfile.name,
            status: "ACTIVE",
        },
    });

    await prisma.companyProfile.upsert({
        where: { companyId: company.id },
        update: companyProfile,
        create: {
            companyId: company.id,
            ...companyProfile,
        },
    });
}
