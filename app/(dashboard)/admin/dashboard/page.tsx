"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getOutboxHealth } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFormatDate } from "@/hooks";
import { Activity, AlertTriangle, Inbox, Skull } from "lucide-react";

export default function AdminDashboardPage() {
  const formatDate = useFormatDate();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard", "outbox-health"],
    queryFn: async () => getOutboxHealth(),
    staleTime: 0,
    refetchOnMount: true,
  });

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-4">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-xl font-bold tracking-tight">Admin Dashboard</h2>
        <Button asChild variant="outline">
          <Link href="/admin/integrations/outbox">Open Outbox</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outbox Pending</CardTitle>
            <Inbox className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "…" : data?.allowed ? data.counts.pending : "—"}
            </div>
            <p className="text-xs text-muted-foreground">Ready to be processed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outbox Failed</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "…" : data?.allowed ? data.counts.failed : "—"}
            </div>
            <p className="text-xs text-muted-foreground">Retryable failures</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">
                {isLoading ? "…" : data?.allowed ? data.counts.processing : "—"}
              </div>
              {!isLoading && data?.allowed && data.counts.stuckProcessing > 0 ? (
                <Badge variant="destructive">
                  Stuck: {data.counts.stuckProcessing}
                </Badge>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">In progress (locked)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dead-letter</CardTitle>
            <Skull className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "…" : data?.allowed ? data.counts.dead : "—"}
            </div>
            <p className="text-xs text-muted-foreground">Needs manual recovery</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Outbox Health</CardTitle>
          {!isLoading && data?.allowed ? (
            <Badge variant={data.counts.failed > 0 || data.counts.dead > 0 ? "destructive" : "default"}>
              {data.counts.failed > 0 || data.counts.dead > 0 ? "Attention" : "OK"}
            </Badge>
          ) : null}
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {!isLoading && data?.allowed ? (
            <div className="flex flex-col gap-1">
              <div>
                Oldest retryable event:{" "}
                {data.oldestRetryableCreatedAt ? formatDate(data.oldestRetryableCreatedAt) : "—"}
              </div>
              <div>
                Tip: Use “Unlock” for stuck PROCESSING, and “Mark DEAD” for poison messages.
              </div>
            </div>
          ) : (
            <div>
              {isLoading ? "Loading outbox health…" : "No access to outbox health."}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

