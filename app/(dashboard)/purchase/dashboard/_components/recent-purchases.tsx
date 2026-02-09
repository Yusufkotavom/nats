"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useFormatCurrency } from "@/hooks/use-format-currency";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

type RecentPurchase = {
  id: string;
  orderNumber: string;
  vendor: string;
  date: Date;
  status: string;
  amount: number;
};

type RecentPurchasesProps = {
  data: RecentPurchase[];
};

export function RecentPurchases({ data }: RecentPurchasesProps) {
  const formatCurrency = useFormatCurrency();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DRAFT":
        return "secondary";
      case "ISSUED":
      case "PARTIALLY_RECEIVED":
        return "default";
      case "CLOSED":
        return "outline"; // or something else
      case "CANCELLED":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order #</TableHead>
            <TableHead>Vendor</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                No recent purchases found.
              </TableCell>
            </TableRow>
          ) : (
            data.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">{order.orderNumber}</TableCell>
                <TableCell>{order.vendor}</TableCell>
                <TableCell>{format(new Date(order.date), "MMM d, yyyy")}</TableCell>
                <TableCell>
                  <Badge variant={getStatusColor(order.status) as any}>
                    {order.status.replace(/_/g, " ")}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(order.amount)}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" asChild>
                    <Link href={`/purchase/orders/${order.id}`}>
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
