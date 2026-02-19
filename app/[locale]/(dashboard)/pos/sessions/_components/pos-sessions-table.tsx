"use client";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { SuperJSONResult } from "superjson";
import { SuperJSON } from "@/lib/superjson";
import { useFormatCurrency } from "@/hooks/use-format-currency";

interface POSSessionsTableProps {
  sessions: SuperJSONResult;
}

export function POSSessionsTable({ sessions: serializedSessions }: POSSessionsTableProps) {
  const sessions = SuperJSON.deserialize<any[]>(serializedSessions);
  const formatCurrency = useFormatCurrency();

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Session ID</TableHead>
            <TableHead>Cashier</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Start Time</TableHead>
            <TableHead>End Time</TableHead>
            <TableHead className="text-right">Opening Cash</TableHead>
            <TableHead className="text-right">Closing Cash</TableHead>
            <TableHead className="text-right">Difference</TableHead>
            <TableHead className="text-center">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="h-24 text-center">
                No sessions found.
              </TableCell>
            </TableRow>
          ) : (
            sessions.map((session) => (
              <TableRow key={session.id}>
                <TableCell className="font-medium">
                  {session.sessionNumber}
                </TableCell>
                <TableCell>{session.cashier.name}</TableCell>
                <TableCell>{session.warehouse?.name || "-"}</TableCell>
                <TableCell>
                  {format(new Date(session.startTime), "PP p")}
                </TableCell>
                <TableCell>
                  {session.endTime
                    ? format(new Date(session.endTime), "PP p")
                    : "-"}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(session.openingCash)}
                </TableCell>
                <TableCell className="text-right">
                  {session.closingCash
                    ? formatCurrency(session.closingCash)
                    : "-"}
                </TableCell>
                <TableCell className={`text-right ${session.difference?.isNegative() ? "text-red-500" : "text-green-500"}`}>
                   {session.difference
                    ? formatCurrency(session.difference)
                    : "-"}
                </TableCell>
                <TableCell className="text-center">
                  <Badge
                    variant={
                      session.status === "OPEN" ? "default" : "secondary"
                    }
                  >
                    {session.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
