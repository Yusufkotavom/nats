"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useFormatCurrency } from "@/hooks/use-format-currency";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

type OverdueInvoicesProps = {
    data: {
        id: string;
        invoiceNumber: string;
        customerName: string;
        dueDate: Date;
        balanceDue: number;
        totalAmount: number;
    }[];
};

export function OverdueInvoices({ data }: OverdueInvoicesProps) {
    const formatCurrency = useFormatCurrency();

    if (data.length === 0) {
        return (
            <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                No overdue invoices
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead className="text-right">Balance Due</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((invoice) => {
                        const daysOverdue = Math.floor(
                            (new Date().getTime() - new Date(invoice.dueDate).getTime()) /
                            (1000 * 60 * 60 * 24)
                        );

                        return (
                            <TableRow key={invoice.id}>
                                <TableCell className="font-medium">
                                    {invoice.invoiceNumber}
                                </TableCell>
                                <TableCell>{invoice.customerName}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <span>{format(new Date(invoice.dueDate), "dd MMM yyyy")}</span>
                                        <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">
                                            {daysOverdue}d over
                                        </Badge>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right font-medium text-destructive">
                                    {formatCurrency(invoice.balanceDue)}
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
