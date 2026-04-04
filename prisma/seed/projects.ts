import { prisma } from "./utils";
import { faker } from "@faker-js/faker";
import { getRandomItem, generateUniqueSKU } from "./bulk_utils";
import { ProjectStatus } from "../generated/prisma/client";

export async function seedProjects() {
    console.log("Seeding Projects...");

    const projects = [
        {
            name: "Website Redesign",
            code: "PROJ-WEB-2026",
            description: "Overhaul of corporate website",
            startDate: new Date("2026-01-01"),
            endDate: new Date("2026-06-30"),
            status: "ACTIVE", // Using string literal as enum might need import but string works if typed correctly in prisma. 
            // Actually let's import the enum or just use string if it matches.
            // ProjectStatus enum is in schema.
        },
        {
            name: "Office Expansion",
            code: "PROJ-OFF-2026",
            description: "Expansion of HQ to 2nd floor",
            startDate: new Date("2026-03-01"),
            endDate: new Date("2026-12-31"),
            status: "ACTIVE",
        },
        {
            name: "Marketing Campaign Q1",
            code: "PROJ-MKT-Q1",
            description: "Q1 2026 Marketing Push",
            startDate: new Date("2026-01-01"),
            endDate: new Date("2026-03-31"),
            status: "COMPLETED",
        },
    ];

    for (const project of projects) {
        await prisma.project.upsert({
            where: { code: project.code },
            update: {
                name: project.name,
                description: project.description,
                startDate: project.startDate,
                endDate: project.endDate,
                // status: project.status as any, // Cast to any to avoid import issues if enum not available easily here, but usually string works. 
                // Better to import enum if possible but to keep it simple, letting prisma handle string -> enum.
            },
            create: {
                name: project.name,
                code: project.code,
                description: project.description,
                startDate: project.startDate,
                endDate: project.endDate,
                // status: project.status as any,
            },
        });
    }
}

export async function seedBulkProjects(count: number) {
    console.log(`Seeding ${count} Bulk Projects...`);

    const customers = await prisma.contact.findMany({
        where: { type: "CUSTOMER" }
    });

    if (customers.length === 0) {
        console.warn("No customers found for bulk projects. Skipping.");
        return;
    }

    const projects = [];
    for (let i = 0; i < count; i++) {
        const name = faker.company.catchPhrase();
        const code = generateUniqueSKU("PROJ", i + 100);
        const startDate = faker.date.past({ years: 2 });
        const endDate = faker.date.future({ years: 1, refDate: startDate });

        projects.push({
            name,
            code,
            description: faker.lorem.paragraph(),
            startDate,
            endDate,
            status: getRandomItem([ProjectStatus.ACTIVE, ProjectStatus.COMPLETED, ProjectStatus.ON_HOLD, ProjectStatus.CANCELLED]),
        });
    }

    await prisma.project.createMany({
        data: projects,
        skipDuplicates: true,
    });
}
