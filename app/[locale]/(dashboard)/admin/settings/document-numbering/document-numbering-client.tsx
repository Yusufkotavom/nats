"use client";

import { useState } from "react";
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

interface DocumentNumberingClientProps {
    data: DocumentNumbering[];
}

export function DocumentNumberingClient({ data }: DocumentNumberingClientProps) {
    const [selectedItem, setSelectedItem] = useState<DocumentNumbering | null>(null);

    return (
        <div className="rounded-md border bg-card">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Document Type</TableHead>
                        <TableHead>Prefix</TableHead>
                        <TableHead>Includes Year</TableHead>
                        <TableHead>Includes Month</TableHead>
                        <TableHead>Digits</TableHead>
                        <TableHead>Example Preview</TableHead>
                        <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((item) => (
                        <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell>{item.prefix || "-"}</TableCell>
                            <TableCell>{item.includeYear ? "Yes" : "No"}</TableCell>
                            <TableCell>{item.includeMonth ? "Yes" : "No"}</TableCell>
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
                                        new Date() // Use today for preview
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
