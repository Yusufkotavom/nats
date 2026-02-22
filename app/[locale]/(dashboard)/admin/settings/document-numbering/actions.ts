"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { authorizedAction } from "@/lib/permissions/protected-action";
import { SuperJSON } from "@/lib/superjson";

const DEFAULT_ENTITIES = [
    { entityType: "SALES_ORDER", name: "Sales Order", prefix: "SO-" },
    { entityType: "SALES_INVOICE", name: "Sales Invoice", prefix: "INV-" },
    { entityType: "SALES_PAYMENT", name: "Sales Payment", prefix: "PAY-" },
    { entityType: "SALES_SHIPMENT", name: "Sales Shipment", prefix: "SHP-" },
    { entityType: "SALES_RETURN", name: "Sales Return", prefix: "SR-" },
    { entityType: "PURCHASE_ORDER", name: "Purchase Order", prefix: "PO-" },
    { entityType: "PURCHASE_INVOICE", name: "Purchase Invoice", prefix: "PI-" },
    { entityType: "PURCHASE_PAYMENT", name: "Purchase Payment", prefix: "PPAY-" },
    { entityType: "PURCHASE_RECEIVE", name: "Purchase Receive", prefix: "RCV-" },
    { entityType: "PURCHASE_RETURN", name: "Purchase Return", prefix: "PR-" },
    { entityType: "JOURNAL_ENTRY", name: "Journal Entry", prefix: "JE-" },
    { entityType: "INVENTORY_MOVEMENT", name: "Inventory Movement", prefix: "INV-MV-" },
    { entityType: "CASH_TRANSACTION", name: "Cash Transaction", prefix: "CSH-" },
    { entityType: "CASH_TRANSFER", name: "Cash Transfer", prefix: "TRF-" },
];

export const getDocumentNumberingSettings = authorizedAction(
    "company.settings",
    async () => {
        // Ensure all default entities exist
        for (const def of DEFAULT_ENTITIES) {
            await prisma.documentNumbering.upsert({
                where: { entityType: def.entityType },
                update: {},
                create: {
                    entityType: def.entityType,
                    name: def.name,
                    prefix: def.prefix,
                },
            });
        }

        const settings = await prisma.documentNumbering.findMany({
            orderBy: { name: "asc" },
        });

        return { success: true, data: SuperJSON.serialize(settings) };
    }
);

export const updateDocumentNumberingSetting = authorizedAction(
    "company.settings",
    async (
        id: string,
        data: {
            prefix: string;
            suffix: string;
            sequenceDigits: number;
            includeYear: boolean;
            yearFormat: string;
            includeMonth: boolean;
            resetYearly: boolean;
            resetMonthly: boolean;
        }
    ) => {
        try {
            const result = await prisma.documentNumbering.update({
                where: { id },
                data: {
                    prefix: data.prefix,
                    suffix: data.suffix,
                    sequenceDigits: data.sequenceDigits,
                    includeYear: data.includeYear,
                    yearFormat: data.yearFormat,
                    includeMonth: data.includeMonth,
                    resetYearly: data.resetYearly,
                    resetMonthly: data.resetMonthly,
                },
            });

            revalidatePath("/admin/settings/document-numbering");
            return { success: true, data: SuperJSON.serialize(result) };
        } catch (error: any) {
            console.error("Failed to update numbering setting:", error);
            return { success: false, error: "Failed to update configuration" };
        }
    }
);
