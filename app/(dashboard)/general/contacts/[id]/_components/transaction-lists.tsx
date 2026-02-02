"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getContactCashTransactions,
  getContactPurchaseOrders,
  getContactPurchaseInvoices,
  getContactPurchasePayments,
  getContactSalesOrders,
  getContactSalesInvoices,
  getContactSalesPayments,
  getContactJournalEntries,
} from "../../actions";
import { SuperJSON } from "@/lib/superjson";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CustomPagination } from "@/components/ui/custom-pagination";
import { useFormatCurrency } from "@/hooks/use-format-currency";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

const PAGE_SIZE = 10;

function ListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

export function CashTransactionsList({ contactId }: { contactId: string }) {
  const [page, setPage] = useState(1);
  const formatCurrency = useFormatCurrency();

  const { data, isLoading } = useQuery({
    queryKey: ["contact-cash-transactions", contactId, page],
    queryFn: () =>
      getContactCashTransactions({ contactId, page, pageSize: PAGE_SIZE }),
  });

  const transactions = data?.data ? (SuperJSON.deserialize(data.data) as any[]) : [];
  const total = data?.total || 0;

  if (isLoading) return <ListSkeleton />;

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Account</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx) => {
            const amount = tx.allocations.reduce(
              (sum: number, a: any) => sum + Number(a.amount),
              0
            );
            return (
              <TableRow key={tx.id}>
                <TableCell>
                  {format(new Date(tx.date), "dd MMM yyyy")}
                </TableCell>
                <TableCell>{tx.cashAccount.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{tx.type}</Badge>
                </TableCell>
                <TableCell>{tx.reference || "-"}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(amount)}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{tx.status}</Badge>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/accounting/cash-bank/transaction/${tx.id}`}>
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
          {transactions.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                No cash transactions found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {total > 0 && (
        <CustomPagination
          totalEntries={total}
          pageSize={PAGE_SIZE}
          currentPage={page}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}

export function PurchaseOrdersList({ contactId }: { contactId: string }) {
  const [page, setPage] = useState(1);
  const formatCurrency = useFormatCurrency();

  const { data, isLoading } = useQuery({
    queryKey: ["contact-purchase-orders", contactId, page],
    queryFn: () =>
      getContactPurchaseOrders({ contactId, page, pageSize: PAGE_SIZE }),
  });

  const orders = data?.data ? (SuperJSON.deserialize(data.data) as any[]) : [];
  const total = data?.total || 0;

  if (isLoading) return <ListSkeleton />;

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order Date</TableHead>
            <TableHead>Order #</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Total Amount</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell>
                {format(new Date(order.orderDate), "dd MMM yyyy")}
              </TableCell>
              <TableCell>{order.orderNumber}</TableCell>
              <TableCell>
                <Badge variant="outline">{order.status}</Badge>
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(order.totalAmount)}
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/purchase/orders/${order.id}`}>
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {orders.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                No purchase orders found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {total > 0 && (
        <CustomPagination
          totalEntries={total}
          pageSize={PAGE_SIZE}
          currentPage={page}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}

export function PurchaseInvoicesList({ contactId }: { contactId: string }) {
  const [page, setPage] = useState(1);
  const formatCurrency = useFormatCurrency();

  const { data, isLoading } = useQuery({
    queryKey: ["contact-purchase-invoices", contactId, page],
    queryFn: () =>
      getContactPurchaseInvoices({ contactId, page, pageSize: PAGE_SIZE }),
  });

  const invoices: any[] = data?.data ? SuperJSON.deserialize(data.data) : [];
  const total = data?.total || 0;

  if (isLoading) return <ListSkeleton />;

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice Date</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Invoice #</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Total Amount</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice: any) => (
            <TableRow key={invoice.id}>
              <TableCell>
                {format(new Date(invoice.invoiceDate), "dd MMM yyyy")}
              </TableCell>
              <TableCell>
                {format(new Date(invoice.dueDate), "dd MMM yyyy")}
              </TableCell>
              <TableCell>{invoice.invoiceNumber}</TableCell>
              <TableCell>
                <Badge variant="outline">{invoice.status}</Badge>
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(invoice.totalAmount)}
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/purchase/invoices/${invoice.id}`}>
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {invoices.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                No purchase invoices found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {total > 0 && (
        <CustomPagination
          totalEntries={total}
          pageSize={PAGE_SIZE}
          currentPage={page}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}

export function PurchasePaymentsList({ contactId }: { contactId: string }) {
  const [page, setPage] = useState(1);
  const formatCurrency = useFormatCurrency();

  const { data, isLoading } = useQuery({
    queryKey: ["contact-purchase-payments", contactId, page],
    queryFn: () =>
      getContactPurchasePayments({ contactId, page, pageSize: PAGE_SIZE }),
  });

  const payments = data?.data ? (SuperJSON.deserialize(data.data) as any[]) : [];
  const total = data?.total || 0;

  if (isLoading) return <ListSkeleton />;

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Payment Date</TableHead>
            <TableHead>Payment #</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead>Account</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((payment) => (
            <TableRow key={payment.id}>
              <TableCell>
                {format(new Date(payment.paymentDate), "dd MMM yyyy")}
              </TableCell>
              <TableCell>{payment.paymentNumber}</TableCell>
              <TableCell>{payment.reference || "-"}</TableCell>
              <TableCell>{payment.cashAccount.name}</TableCell>
              <TableCell className="text-right">
                {formatCurrency(payment.amount)}
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/purchase/payments/${payment.id}`}>
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {payments.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                No payments found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {total > 0 && (
        <CustomPagination
          totalEntries={total}
          pageSize={PAGE_SIZE}
          currentPage={page}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}

export function SalesOrdersList({ contactId }: { contactId: string }) {
  const [page, setPage] = useState(1);
  const formatCurrency = useFormatCurrency();

  const { data, isLoading } = useQuery({
    queryKey: ["contact-sales-orders", contactId, page],
    queryFn: () =>
      getContactSalesOrders({ contactId, page, pageSize: PAGE_SIZE }),
  });

  const orders = data?.data ? (SuperJSON.deserialize(data.data) as any[]) : [];
  const total = data?.total || 0;

  if (isLoading) return <ListSkeleton />;

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order Date</TableHead>
            <TableHead>Order #</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Total Amount</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell>
                {format(new Date(order.orderDate), "dd MMM yyyy")}
              </TableCell>
              <TableCell>{order.orderNumber}</TableCell>
              <TableCell>
                <Badge variant="outline">{order.status}</Badge>
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(order.totalAmount)}
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/sales/orders/${order.id}`}>
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {orders.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                No sales orders found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {total > 0 && (
        <CustomPagination
          totalEntries={total}
          pageSize={PAGE_SIZE}
          currentPage={page}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}

export function SalesInvoicesList({ contactId }: { contactId: string }) {
  const [page, setPage] = useState(1);
  const formatCurrency = useFormatCurrency();

  const { data, isLoading } = useQuery({
    queryKey: ["contact-sales-invoices", contactId, page],
    queryFn: () =>
      getContactSalesInvoices({ contactId, page, pageSize: PAGE_SIZE }),
  });

  const invoices: any[] = data?.data ? SuperJSON.deserialize(data.data) : [];
  const total = data?.total || 0;

  if (isLoading) return <ListSkeleton />;

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice Date</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Invoice #</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Total Amount</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice: any) => (
            <TableRow key={invoice.id}>
              <TableCell>
                {format(new Date(invoice.invoiceDate), "dd MMM yyyy")}
              </TableCell>
              <TableCell>
                {format(new Date(invoice.dueDate), "dd MMM yyyy")}
              </TableCell>
              <TableCell>{invoice.invoiceNumber}</TableCell>
              <TableCell>
                <Badge variant="outline">{invoice.status}</Badge>
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(invoice.totalAmount)}
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/sales/invoices/${invoice.id}`}>
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {invoices.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                No sales invoices found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {total > 0 && (
        <CustomPagination
          totalEntries={total}
          pageSize={PAGE_SIZE}
          currentPage={page}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}

export function SalesPaymentsList({ contactId }: { contactId: string }) {
  const [page, setPage] = useState(1);
  const formatCurrency = useFormatCurrency();

  const { data, isLoading } = useQuery({
    queryKey: ["contact-sales-payments", contactId, page],
    queryFn: () =>
      getContactSalesPayments({ contactId, page, pageSize: PAGE_SIZE }),
  });

  const payments = data?.data ? (SuperJSON.deserialize(data.data) as any[]) : [];
  const total = data?.total || 0;

  if (isLoading) return <ListSkeleton />;

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Payment Date</TableHead>
            <TableHead>Payment #</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead>Account</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((payment) => (
            <TableRow key={payment.id}>
              <TableCell>
                {format(new Date(payment.paymentDate), "dd MMM yyyy")}
              </TableCell>
              <TableCell>{payment.paymentNumber}</TableCell>
              <TableCell>{payment.reference || "-"}</TableCell>
              <TableCell>{payment.cashAccount.name}</TableCell>
              <TableCell className="text-right">
                {formatCurrency(payment.amount)}
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/sales/payments/${payment.id}`}>
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {payments.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                No sales payments found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {total > 0 && (
        <CustomPagination
          totalEntries={total}
          pageSize={PAGE_SIZE}
          currentPage={page}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}

export function JournalEntriesList({ contactId }: { contactId: string }) {
  const [page, setPage] = useState(1);
  const formatCurrency = useFormatCurrency();

  const { data, isLoading } = useQuery({
    queryKey: ["contact-journal-entries", contactId, page],
    queryFn: () =>
      getContactJournalEntries({ contactId, page, pageSize: PAGE_SIZE }),
  });

  const entries: any[] = data?.data ? SuperJSON.deserialize(data.data) : [];
  const total = data?.total || 0;

  if (isLoading) return <ListSkeleton />;

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Entry #</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Total Debit</TableHead>
            <TableHead className="text-right">Total Credit</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry: any) => {
            const totalDebit = entry.lines.reduce((sum: number, line: any) => sum + Number(line.debitAmount), 0);
            const totalCredit = entry.lines.reduce((sum: number, line: any) => sum + Number(line.creditAmount), 0);
            return (
              <TableRow key={entry.id}>
                <TableCell>
                  {format(new Date(entry.transactionDate), "dd MMM yyyy")}
                </TableCell>
                <TableCell>{entry.entryNumber}</TableCell>
                <TableCell>{entry.description || "-"}</TableCell>
                <TableCell>
                  <Badge variant="outline">{entry.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(totalDebit)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(totalCredit)}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" asChild>
                    {/* Assuming Journal Entry detail page path */}
                    <Link href={`/accounting/journal-entries/${entry.id}`}>
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
          {entries.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                No journal entries found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {total > 0 && (
        <CustomPagination
          totalEntries={total}
          pageSize={PAGE_SIZE}
          currentPage={page}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
