export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PageListLayout,
  PageListHeader,
  PageListTitle,
  PageListActions,
  PageListContent,
} from "@/components/layout/page/list-layout";
import { formatCurrency } from "@/lib/utils";
import { SuperJSON } from "@/lib/superjson";
import { getSavingTargetProgress } from "../../actions";

export default async function SavingTargetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const response = await getSavingTargetProgress();
  if (!response.success) return notFound();

  const targets = SuperJSON.deserialize<any[]>(response.data);
  const target = targets.find((item) => item.id === id);
  if (!target) return notFound();

  return (
    <PageListLayout>
      <PageListHeader>
        <div className="flex flex-col gap-1">
          <PageListTitle title={target.name} />
          <p className="text-sm text-muted-foreground">
            {new Date(target.startDate).toLocaleDateString("id-ID")} - {" "}
            {new Date(target.endDate).toLocaleDateString("id-ID")}
          </p>
        </div>
        <PageListActions>
          <Button variant="outline" asChild>
            <Link href={`/budgeting/saving-targets/${target.id}/edit`}>Edit Target</Link>
          </Button>
        </PageListActions>
      </PageListHeader>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Target</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(target.targetAmount)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Actual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(target.actual)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(target.remaining)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{target.progressPct.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      <PageListContent>
        <div className="p-6 space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Account:</span>{" "}
            {target.primaryAccount
              ? `${target.primaryAccount.code} - ${target.primaryAccount.name}`
              : "-"}
          </p>
          <p>
            <span className="text-muted-foreground">Status:</span> {target.status}
          </p>
          <p>
            <span className="text-muted-foreground">Description:</span>{" "}
            {target.description || "-"}
          </p>
        </div>
      </PageListContent>
    </PageListLayout>
  );
}
