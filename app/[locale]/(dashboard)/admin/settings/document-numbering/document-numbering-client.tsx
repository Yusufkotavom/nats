"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { DocumentNumbering } from "@/prisma/generated/prisma/client";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit2 } from "lucide-react";
import { formatSequence } from "@/lib/utils/format-sequence";
import { DocumentNumberingForm } from "./document-numbering-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DocumentNumberingClientProps {
    data: DocumentNumbering[];
}

export function DocumentNumberingClient({ data }: DocumentNumberingClientProps) {
    const t = useTranslations("DocumentNumbering");
    const [selectedItem, setSelectedItem] = useState<DocumentNumbering | null>(null);
    const groups: Array<{ key: string; label: string; matcher: (entityType: string) => boolean }> = [
        {
            key: "sales",
            label: "Sales",
            matcher: (entityType) => entityType.startsWith("SALES_"),
        },
        {
            key: "purchase",
            label: "Purchase",
            matcher: (entityType) => entityType.startsWith("PURCHASE_"),
        },
        {
            key: "service",
            label: "Service",
            matcher: (entityType) => entityType.startsWith("SERVICE_"),
        },
        {
            key: "pos",
            label: "POS",
            matcher: (entityType) => entityType.startsWith("POS_"),
        },
        {
            key: "inventory_cash",
            label: "Inventory & Cash",
            matcher: (entityType) =>
                entityType === "INVENTORY_MOVEMENT" ||
                entityType === "CASH_TRANSACTION" ||
                entityType === "CASH_TRANSFER" ||
                entityType === "JOURNAL_ENTRY",
        },
        {
            key: "production",
            label: "Production",
            matcher: (entityType) =>
                entityType.startsWith("PRODUCTION_") || entityType === "BILL_OF_MATERIAL",
        },
    ];

    const renderTable = (rows: DocumentNumbering[]) => (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>{t("document_type")}</TableHead>
                    <TableHead>{t("prefix")}</TableHead>
                    <TableHead>{t("includes_year")}</TableHead>
                    <TableHead>{t("includes_month")}</TableHead>
                    <TableHead>{t("digits")}</TableHead>
                    <TableHead>{t("example_preview")}</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {rows.map((item) => (
                    <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.prefix || "-"}</TableCell>
                        <TableCell>{item.includeYear ? t("yes") : t("no")}</TableCell>
                        <TableCell>{item.includeMonth ? t("yes") : t("no")}</TableCell>
                        <TableCell>{item.sequenceDigits}</TableCell>
                        <TableCell>
                            <code className="rounded bg-muted px-2 py-1">
                                {formatSequence(
                                    1,
                                    item.prefix,
                                    item.suffix,
                                    item.sequenceDigits,
                                    item.includeYear,
                                    item.yearFormat,
                                    item.includeMonth,
                                    new Date()
                                )}
                            </code>
                        </TableCell>
                        <TableCell>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setSelectedItem(item)}
                            >
                                <Edit2 className="h-4 w-4" />
                            </Button>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );

    return (
        <div className="rounded-md border bg-card">
            <Tabs defaultValue="sales" className="p-4">
                <TabsList className="mb-4 flex h-auto flex-wrap gap-2">
                    {groups.map((group) => (
                        <TabsTrigger key={group.key} value={group.key}>
                            {group.label}
                        </TabsTrigger>
                    ))}
                </TabsList>
                {groups.map((group) => (
                    <TabsContent key={group.key} value={group.key}>
                        {renderTable(data.filter((item) => group.matcher(item.entityType)))}
                    </TabsContent>
                ))}
            </Tabs>

            {selectedItem && (
                <DocumentNumberingForm
                    initialData={selectedItem}
                    open={!!selectedItem}
                    onOpenChange={(open) => !open && setSelectedItem(null)}
                />
            )}
        </div>
    );
}
