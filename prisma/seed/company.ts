import { prisma } from "./utils";

export async function seedCompany() {
    console.log("Seeding Company Profile...");

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

    const existingProfile = await prisma.companyProfile.findFirst();
    if (!existingProfile) {
        await prisma.companyProfile.create({
            data: companyProfile,
        });
    } else {
        // Optional: Update existing profile if needed, or leave as is.
        // For now, we leave it be to preserve user changes if any.
        console.log("Company profile already exists.");
    }
}
