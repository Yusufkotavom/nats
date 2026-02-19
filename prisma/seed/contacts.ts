import { prisma } from "./utils";
import { ContactType } from "../generated/prisma/client";

export async function seedContacts() {
    console.log("Seeding Contacts (Customers & Vendors)...");

    // Seed Customers
    const customers = [
        {
            name: "Acme Corp",
            email: "contact@acme.com",
            phone: "555-0100",
            address: "123 Business Rd, Tech City",
            type: ContactType.CUSTOMER,
        },
        {
            name: "Global Industries",
            email: "info@globalind.com",
            phone: "555-0101",
            address: "456 Enterprise Blvd, Commerce City",
            type: ContactType.CUSTOMER,
        },
        {
            name: "Local Shop",
            email: "support@localshop.com",
            phone: "555-0102",
            address: "789 Market St, Smalltown",
            type: ContactType.CUSTOMER,
        },
    ];

    for (const customer of customers) {
        const existing = await prisma.contact.findFirst({
            where: { name: customer.name, type: ContactType.CUSTOMER },
        });

        if (existing) {
            await prisma.contact.update({
                where: { id: existing.id },
                data: customer,
            });
        } else {
            await prisma.contact.create({
                data: customer,
            });
        }
    }

    // Seed Vendors
    const vendors = [
        {
            name: "Office Supplies Co",
            email: "sales@officesupplies.com",
            phone: "555-0200",
            address: "101 Paper Ln, Print City",
            type: ContactType.VENDOR,
        },
        {
            name: "Tech Wholesalers",
            email: "orders@techwhole.com",
            phone: "555-0201",
            address: "202 Silicon Dr, Valley Town",
            type: ContactType.VENDOR,
        },
        {
            name: "Maintenance Services Inc",
            email: "service@maintserv.com",
            phone: "555-0202",
            address: "303 Fix It Ave, Repair City",
            type: ContactType.VENDOR,
        },
    ];

    for (const vendor of vendors) {
        const existing = await prisma.contact.findFirst({
            where: { name: vendor.name, type: ContactType.VENDOR },
        });

        if (existing) {
            await prisma.contact.update({
                where: { id: existing.id },
                data: vendor,
            });
        } else {
            await prisma.contact.create({
                data: vendor,
            });
        }
    }
}
