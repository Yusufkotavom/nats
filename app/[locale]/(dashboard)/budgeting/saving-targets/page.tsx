export const dynamic = "force-dynamic";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PageListLayout,
  PageListHeader,
  PageListTitle,
  PageListActions,
  PageListContent,
} from "@/components/layout/page/list-layout";
import { SuperJSON } from "@/lib/superjson";
import { formatCurrency } from "@/lib/utils";
import { getSavingTargetProgress } from "../actions";

export default async function SavingTargetsPage() {
  const response = await getSavingTargetProgress();
  const targets = response.success
    ? SuperJSON.deserialize<any[]>(response.data)
    : [];

  const activeCount = targets.filter((target) => target.status !== "ARCHIVED").length;
  const totalTarget = targets.reduce((sum, target) => sum + (target.targetAmount || 0), 0);
  const totalActual = targets.reduce((sum, target) => sum + (target.actual || 0), 0);

  return (
    <PageListLayout>
      <PageListHeader>
        <PageListTitle title="Saving Targets" />
        <PageListActions>
          <Button asChild>
            <Link href="/budgeting/saving-targets/new">
              <Plus className="mr-2 h-4 w-4" /> Create Target
            </Link>
          </Button>
        </PageListActions>
      </PageListHeader>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Targets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Target</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalTarget)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Accumulated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalActual)}</div>
          </CardContent>
        </Card>
      </div>

      <PageListContent>
        <div className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Target</TableHead>
                <TableHead className="text-right">Actual</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead className="text-right">Progress</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {targets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No saving targets found.
                  </TableCell>
                </TableRow>
              ) : (
                targets.map((target) => (
                  <TableRow key={target.id}>
                    <TableCell className="font-medium">{target.name}</TableCell>
                    <TableCell>
                      {new Date(target.startDate).toLocaleDateString("id-ID")} -{" "}
                      {new Date(target.endDate).toLocaleDateString("id-ID")}
                    </TableCell>
                    <TableCell>
                      {target.primaryAccount
                        ? `${target.primaryAccount.code} - ${target.primaryAccount.name}`
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(target.targetAmount)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(target.actual)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(target.remaining)}</TableCell>
                    <TableCell className="text-right">{target.progressPct.toFixed(1)}%</TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/budgeting/saving-targets/${target.id}/edit`}>Edit</Link>
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/budgeting/saving-targets/${target.id}`}>View</Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </PageListContent>
    </PageListLayout>
  );
}
