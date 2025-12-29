import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFormatCurrency } from "@/hooks/use-format-currency";
import { useFormatDate } from "@/hooks/use-format-date";

interface PriceHistoryProps {
  history?: {
    id: string;
    price: number;
    effectiveDate: Date;
  }[];
}

export function PriceHistory({ history }: PriceHistoryProps) {
  const formatCurrency = useFormatCurrency();
  const formatDate = useFormatDate();

  if (!history || history.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Price History</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Price</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>
                  {formatDate(entry.effectiveDate, { includeTime: true })}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(entry.price)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
