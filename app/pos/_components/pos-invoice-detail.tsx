'use client';

import { useState } from 'react';
import { SuperJSONResult } from 'superjson';
import { SuperJSON } from '@/lib/superjson';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Printer, Calendar, User, FileText, CreditCard } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useFormatCurrency } from '@/hooks/use-format-currency';
import { format } from 'date-fns';
import { ReportPreviewDialog } from "@/app/(dashboard)/reporting/_components/report-preview-dialog";
import { Badge } from '@/components/ui/badge';

interface POSInvoiceDetailProps {
  invoice: SuperJSONResult;
}

export function POSInvoiceDetail({ invoice: serializedInvoice }: POSInvoiceDetailProps) {
  const invoice = SuperJSON.deserialize<any>(serializedInvoice);
  const router = useRouter();
  const formatCurrency = useFormatCurrency();
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  return (
    <div className="flex h-screen flex-col bg-muted/20">
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b bg-background px-4 shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/pos')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to POS
          </Button>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">Transaction Details</h1>
            <Badge variant="outline">{invoice.invoiceNumber}</Badge>
            <Badge className={invoice.status === 'PAID' ? 'bg-green-600' : 'bg-yellow-600'}>
              {invoice.status}
            </Badge>
          </div>
        </div>
        <Button onClick={() => setIsReceiptOpen(true)}>
          <Printer className="mr-2 h-4 w-4" />
          Print Receipt
        </Button>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* Info Cards */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Customer Info</CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{invoice.contact?.name || 'Walk-in'}</div>
                {invoice.contact?.phone && (
                  <p className="text-xs text-muted-foreground">{invoice.contact.phone}</p>
                )}
                {invoice.contact?.email && (
                  <p className="text-xs text-muted-foreground">{invoice.contact.email}</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Transaction Info</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {format(new Date(invoice.createdAt), 'dd MMM yyyy')}
                </div>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(invoice.createdAt), 'HH:mm:ss')}
                </p>
                {invoice.posSession?.cashier?.name && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Cashier: {invoice.posSession.cashier.name}
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Order Reference</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {invoice.salesOrder?.orderNumber || '-'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Session: {invoice.posSession?.sessionNumber || '-'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Items Table */}
          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Discount</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium">{item.product.name}</div>
                        <div className="text-xs text-muted-foreground">{item.product.sku}</div>
                      </TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                      <TableCell className="text-right text-red-500">
                        {item.discount > 0 ? `-${formatCurrency(item.discount)}` : '-'}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(item.totalPrice)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-6 flex flex-col items-end gap-2">
                <div className="flex w-[250px] justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(invoice.subtotal)}</span>
                </div>
                <div className="flex w-[250px] justify-between text-sm text-red-500">
                  <span className="text-muted-foreground">Global Discount</span>
                  <span>-{formatCurrency(invoice.globalDiscount || 0)}</span>
                </div>
                <div className="flex w-[250px] justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatCurrency(invoice.totalTax || 0)}</span>
                </div>
                <Separator className="my-2 w-[250px]" />
                <div className="flex w-[250px] justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(invoice.totalAmount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payments */}
          <Card>
            <CardHeader>
              <CardTitle>Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.payments.map((payment: any) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{payment.paymentNumber}</TableCell>
                      <TableCell>{format(new Date(payment.paymentDate), 'dd MMM yyyy HH:mm')}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          {payment.method}
                        </div>
                      </TableCell>
                      <TableCell>{payment.cashAccount?.name}</TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>

      <ReportPreviewDialog
        isOpen={isReceiptOpen}
        onOpenChange={setIsReceiptOpen}
        code="POS_RECEIPT"
        input={{ invoiceId: invoice.id }}
        title="POS Receipt"
      />
    </div>
  );
}
