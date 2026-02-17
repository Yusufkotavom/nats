"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, BookOpen } from "lucide-react";
import { seedChartOfAccounts } from "../actions";
import { useToast } from "@/hooks/use-toast";
import { STANDARD_CHART_OF_ACCOUNTS } from "@/lib/setup/chart-of-accounts-template";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
    asset: "Asset",
    liability: "Liability",
    equity: "Equity",
    revenue: "Revenue",
    expense: "Expense",
};

interface StepChartOfAccountsProps {
    onComplete: () => void;
    existingAccountCount: number;
}

export function StepChartOfAccounts({
    onComplete,
    existingAccountCount,
}: StepChartOfAccountsProps) {
    const [isPending, startTransition] = useTransition();
    const [isSeeded, setIsSeeded] = useState(existingAccountCount > 0);
    const { toast } = useToast();

    // Only show top-level (level 0) and level 1 accounts for preview
    const previewAccounts = STANDARD_CHART_OF_ACCOUNTS.filter(
        (a) => a.level <= 1
    );

    const handleSeed = () => {
        startTransition(async () => {
            const result = await seedChartOfAccounts();
            if (result.success) {
                setIsSeeded(true);
                toast({
                    title: "Chart of Accounts created",
                    description: `${result.data?.createdCount ?? 0} accounts were created.`,
                });
            } else {
                toast({
                    title: "Error",
                    description: result.error || "Failed to create chart of accounts",
                    variant: "destructive",
                });
            }
        });
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold">Chart of Accounts</h2>
                <p className="text-muted-foreground mt-1">
                    The chart of accounts is the backbone of your accounting system. We&apos;ll set up a
                    standard chart with common accounts for assets, liabilities, equity, revenue, and expenses.
                </p>
            </div>

            {isSeeded ? (
                <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <div>
                        <p className="font-medium text-green-700 dark:text-green-300">
                            Chart of Accounts is ready
                        </p>
                        <p className="text-sm text-green-600 dark:text-green-400">
                            {existingAccountCount > 0
                                ? `${existingAccountCount} accounts already exist in your system.`
                                : "Standard accounts have been created successfully."}
                        </p>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="rounded-lg border p-4">
                        <div className="mb-3 flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Preview: Standard Chart of Accounts</span>
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-24">Code</TableHead>
                                        <TableHead>Account Name</TableHead>
                                        <TableHead className="w-24">Type</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {previewAccounts.map((account) => (
                                        <TableRow key={account.code}>
                                            <TableCell className="font-mono text-sm">
                                                {account.code}
                                            </TableCell>
                                            <TableCell
                                                className={account.level === 0 ? "font-semibold" : "pl-8"}
                                            >
                                                {account.name}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm">
                                                {ACCOUNT_TYPE_LABELS[account.type]}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                            + {STANDARD_CHART_OF_ACCOUNTS.length - previewAccounts.length} more posting accounts
                        </p>
                    </div>

                    <Button onClick={handleSeed} disabled={isPending} className="w-full">
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Standard Chart of Accounts
                    </Button>
                </div>
            )}

            <div className="flex justify-end">
                <Button onClick={onComplete} disabled={!isSeeded && !existingAccountCount}>
                    Continue
                </Button>
            </div>
        </div>
    );
}
