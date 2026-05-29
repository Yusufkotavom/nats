"use server";

import { prisma } from "@/lib/prisma";
import { revalidateLocalizedPath } from "@/lib/revalidate-localized-path";
import { authorizedAction } from "@/lib/permissions/protected-action";
import { SuperJSON } from "@/lib/superjson";

const DEFAULT_ENTITIES = [
    // Sales
    { entityType: "SALES_ORDER", name: "Sales Order", prefix: "SO-" },
    { entityType: "SALES_INVOICE", name: "Sales Invoice", prefix: "INV-" },
    { entityType: "SALES_PAYMENT", name: "Sales Payment", prefix: "PAY-" },
    { entityType: "SALES_SHIPMENT", name: "Sales Shipment", prefix: "SHP-" },
    { entityType: "SALES_RETURN", name: "Sales Return", prefix: "SR-" },
    // Purchase
    { entityType: "PURCHASE_ORDER", name: "Purchase Order", prefix: "PO-" },
    { entityType: "PURCHASE_INVOICE", name: "Purchase Invoice", prefix: "PI-" },
    { entityType: "PURCHASE_PAYMENT", name: "Purchase Payment", prefix: "PPAY-" },
    { entityType: "PURCHASE_RECEIVE", name: "Purchase Receive", prefix: "RCV-" },
    { entityType: "PURCHASE_RETURN", name: "Purchase Return", prefix: "PR-" },
    // Inventory / Cash
    { entityType: "JOURNAL_ENTRY", name: "Journal Entry", prefix: "JE-" },
    { entityType: "INVENTORY_MOVEMENT", name: "Inventory Movement", prefix: "INV-MV-" },
    { entityType: "CASH_TRANSACTION", name: "Cash Transaction", prefix: "CSH-" },
    { entityType: "CASH_TRANSFER", name: "Cash Transfer", prefix: "TRF-" },
    // Production
    { entityType: "BILL_OF_MATERIAL", name: "Bill of Material", prefix: "BOM-" },
    { entityType: "PRODUCTION_ORDER", name: "Production Order", prefix: "PRO-" },
    { entityType: "PRODUCTION_ISSUE", name: "Production Issue", prefix: "PIS-" },
    { entityType: "PRODUCTION_RECEIPT", name: "Production Receipt", prefix: "PRC-" },
    // POS
    { entityType: "POS_ORDER", name: "POS Order", prefix: "SO-POS-" },
    { entityType: "POS_PAYMENT", name: "POS Payment", prefix: "PAY-POS-" },
    // Service (standalone, no POS prefix)
    { entityType: "SERVICE_ORDER", name: "Service Order", prefix: "SVC-" },
    { entityType: "SERVICE_SALES_ORDER", name: "Service Sales Order", prefix: "SSO-" },
    { entityType: "SERVICE_INVOICE", name: "Service Invoice", prefix: "SINV-" },
    { entityType: "SERVICE_SHIPMENT", name: "Service Shipment", prefix: "SSHP-" },
    { entityType: "SERVICE_PAYMENT", name: "Service Payment", prefix: "SPAY-" },
    // Platform Billing
    { entityType: "SUBSCRIPTION_INVOICE", name: "Subscription Invoice", prefix: "SUB-INV-" },
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

            revalidateLocalizedPath("/admin/settings/document-numbering");
            return { success: true, data: SuperJSON.serialize(result) };
        } catch (error: any) {
            console.error("Failed to update numbering setting:", error);
            return { success: false, error: "Failed to update configuration" };
        }
    }
);
