import { Suspense } from "react";
import { getCashAccountDetails } from "../actions";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CashAccountDetailsPage({ params }: PageProps) {
  const { id } = await params;
  const data = await getCashAccountDetails(id);

  if (!data) {
    notFound();
  }

  const { account, lines } = data;

  // Calculate current balance
  // Since it's a cash account (Asset), Debit increases, Credit decreases
  const totalDebit = lines.reduce((sum, line) => sum + Number(line.debitAmount), 0);
  const totalCredit = lines.reduce((sum, line) => sum + Number(line.creditAmount), 0);
  const currentBalance = totalDebit - totalCredit;

  return (
    <div className="space-y-6 container mx-auto py-6">
      <div className="flex items-center gap-4">
        <Link href="/accounting/cash-bank">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{account.name}</h2>
          <p className="text-muted-foreground">
            {account.bankName ? `${account.bankName} - ` : ""}
            {account.accountNumber}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <Card className="bg-primary text-primary-foreground p-4">
             <div className="text-sm opacity-80">Current Balance</div>
             <div className="text-2xl font-bold">{formatCurrency(currentBalance)}</div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>
              All transactions affecting this account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Entry #</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right">Balance Impact</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                      No transactions found.
                    </TableCell>
                  </TableRow>
                ) : (
                  lines.map((line) => {
                    const debit = Number(line.debitAmount);
                    const credit = Number(line.creditAmount);
                    const impact = debit - credit;
                    
                    return (
                      <TableRow key={line.id}>
                        <TableCell>
                          {format(line.journalEntry.transactionDate, "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell>
                           <Link 
                             href={`/accounting/journal-entries/${line.journalEntry.id}`}
                             className="text-primary hover:underline"
                           >
                             {line.journalEntry.entryNumber}
                           </Link>
                        </TableCell>
                        <TableCell>{line.description || line.journalEntry.description}</TableCell>
                        <TableCell className="text-right text-green-600">
                          {debit > 0 ? formatCurrency(debit) : "-"}
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          {credit > 0 ? formatCurrency(credit) : "-"}
                        </TableCell>
                        <TableCell className={`text-right ${impact >= 0 ? "text-green-600" : "text-red-600"}`}>
                           {formatCurrency(impact)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
