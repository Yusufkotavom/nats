"use client";
export const dynamic = "force-dynamic";

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

  const formatAgeSeconds = (totalSeconds: number | null) => {
    if (totalSeconds === null) return "—";
    if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "—";
    const minutes = Math.floor(totalSeconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const mm = minutes % 60;
    const hh = hours % 24;
    if (days > 0) return `${days}d ${hh}h`;
    if (hours > 0) return `${hours}h ${mm}m`;
    return `${minutes}m`;
  };

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-4">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-xl font-bold tracking-tight">Admin Dashboard</h2>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/integrations/outbox">Open Outbox</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/integrations/outbox?status=PENDING">Pending</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/integrations/outbox?status=FAILED">Failed</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/integrations/outbox?status=DEAD">Dead</Link>
          </Button>
        </div>
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
                Oldest pending event:{" "}
                {data.oldestPendingCreatedAt ? formatDate(data.oldestPendingCreatedAt) : "—"}
                {" "}({formatAgeSeconds(data.oldestPendingAgeSeconds)})
              </div>
              <div>
                Oldest failed event:{" "}
                {data.oldestFailedCreatedAt ? formatDate(data.oldestFailedCreatedAt) : "—"}
                {" "}({formatAgeSeconds(data.oldestFailedAgeSeconds)})
              </div>
              <div>Retrying (attempts &gt; 0): {data.retrying}</div>
              <div>
                Last hour: processed {data.processedLastHour}, failed {data.failedLastHour}
              </div>
              {data.counts.dead > 0 || data.counts.stuckProcessing > 0 ? (
                <div className="text-destructive">
                  Action needed: {data.counts.dead > 0 ? "dead-letter present" : null}
                  {data.counts.dead > 0 && data.counts.stuckProcessing > 0 ? ", " : null}
                  {data.counts.stuckProcessing > 0 ? "stuck processing present" : null}
                </div>
              ) : null}
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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Outbox by Topic</CardTitle>
          {!isLoading && data?.allowed ? (
            <Badge variant="outline">{data.topics.length} topics</Badge>
          ) : null}
        </CardHeader>
        <CardContent className="text-sm">
          {!isLoading && data?.allowed ? (
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-7 gap-2 text-xs text-muted-foreground">
                <div>Topic</div>
                <div className="text-right">Pending</div>
                <div className="text-right">Failed</div>
                <div className="text-right">Processing</div>
                <div className="text-right">Dead</div>
                <div className="text-right">Stuck</div>
                <div className="text-right">Oldest pending</div>
              </div>
              {data.topics.map((t) => (
                <div key={t.topic} className="grid grid-cols-7 gap-2">
                  <div className="truncate">
                    <Link
                      href={`/admin/integrations/outbox?topic=${encodeURIComponent(t.topic)}`}
                      className="underline"
                    >
                      {t.topic}
                    </Link>
                  </div>
                  <div className="text-right">{t.pending}</div>
                  <div className="text-right">{t.failed}</div>
                  <div className="text-right">{t.processing}</div>
                  <div className="text-right">{t.dead}</div>
                  <div className="text-right">{t.stuckProcessing}</div>
                  <div className="text-right">{formatAgeSeconds(t.oldestPendingAgeSeconds)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground">
              {isLoading ? "Loading topic breakdown…" : "No access to outbox health."}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
