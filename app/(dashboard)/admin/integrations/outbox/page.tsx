"use client";

import { useMemo, useState, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { SuperJSON } from "@/lib/superjson";
import { Protect } from "@/components/ui/protect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Ban,
  Eye,
  Loader2,
  LockOpen,
  MoreHorizontal,
  Play,
  RotateCcw,
  Send,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/hooks/use-confirm";
import { useFormatDate } from "@/hooks";
import {
  dispatchIntegrationOutboxBatch,
  forceDeadIntegrationOutboxEvent,
  getIntegrationOutboxEventDetail,
  getIntegrationOutboxEvents,
  requeueIntegrationOutboxEvent,
  runIntegrationOutboxEventNow,
  unlockIntegrationOutboxEvent,
} from "./actions";
import {
  PageListActions,
  PageListContent,
  PageListFilter,
  PageListHeader,
  PageListLayout,
  PageListTitle,
} from "@/components/layout/page/list-layout";
import { OutboxFilters } from "./_components/outbox-filters";
import { OutboxEventDialog } from "./_components/outbox-event-dialog";

type OutboxEvent = {
  id: string;
  topic: string;
  type: string;
  aggregateType: string;
  aggregateId: string;
  status: string;
  attempts: number;
  lockedAt: Date | null;
  lockedBy: string | null;
  nextAttemptAt: Date | null;
  processedAt: Date | null;
  lastError: string | null;
  deadAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  payload: unknown;
};

function statusVariant(status: string) {
  if (status === "PROCESSED") return "default";
  if (status === "FAILED") return "destructive";
  if (status === "DEAD") return "destructive";
  if (status === "PROCESSING") return "secondary";
  return "outline";
}

export default function IntegrationOutboxPage() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();
  const formatDate = useFormatDate();
  const [isPending, startTransition] = useTransition();

  const page = Number(searchParams.get("page")) || 1;
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const topic = searchParams.get("topic") || "";
  const type = searchParams.get("type") || "";

  const [dialog, setDialog] = useState<{
    open: boolean;
    title: string;
    content: unknown;
  }>({ open: false, title: "", content: null });

  const queryKey = useMemo(
    () => ["admin-outbox", page, search, status, topic, type],
    [page, search, status, topic, type]
  );

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const result = await getIntegrationOutboxEvents(page, 20, {
        search,
        status,
        topic,
        type,
      });
      return {
        events: SuperJSON.deserialize<OutboxEvent[]>(result.events),
        total: result.total,
        totalPages: result.totalPages,
      };
    },
    staleTime: 0,
    refetchOnMount: true,
  });

  const openPayload = (event: OutboxEvent) => {
    setDialog({
      open: true,
      title: `Payload: ${event.type}`,
      content: event.payload,
    });
  };

  const openError = (event: OutboxEvent) => {
    setDialog({
      open: true,
      title: `Last Error: ${event.type}`,
      content: event.lastError ?? "",
    });
  };

  const openDetails = (event: OutboxEvent) => {
    startTransition(async () => {
      const detail = await getIntegrationOutboxEventDetail(event.id);
      if (!detail) {
        toast({ title: "Failed", description: "Unable to load event details", variant: "destructive" });
        return;
      }

      setDialog({
        open: true,
        title: `Details: ${event.type}`,
        content: SuperJSON.deserialize(detail),
      });
    });
  };

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin-outbox"] });
  };

  const handleRequeue = async (id: string, options: { resetAttempts: boolean }) => {
    if (
      !(await confirm({
        title: "Requeue outbox event",
        description:
          "This will reset the event for processing and clear its error and lock state.",
      }))
    ) {
      return;
    }

    startTransition(async () => {
      const result = await requeueIntegrationOutboxEvent(id, options);
      if (result.success) {
        toast({ title: "Requeued" });
        await invalidate();
      } else {
        toast({ title: "Failed to requeue", description: result.error, variant: "destructive" });
      }
    });
  };

  const handleUnlock = async (id: string) => {
    if (
      !(await confirm({
        title: "Unlock outbox event",
        description:
          "This will clear the lock and make it retryable again (sets status to FAILED).",
      }))
    ) {
      return;
    }

    startTransition(async () => {
      const result = await unlockIntegrationOutboxEvent(id);
      if (result.success) {
        toast({ title: "Unlocked" });
        await invalidate();
      } else {
        toast({ title: "Failed to unlock", description: result.error, variant: "destructive" });
      }
    });
  };

  const handleForceDead = async (id: string) => {
    if (
      !(await confirm({
        title: "Move to dead-letter",
        description:
          "This marks the event as DEAD and prevents automatic retries until you requeue it.",
        confirmText: "Mark DEAD",
        variant: "destructive",
      }))
    ) {
      return;
    }

    startTransition(async () => {
      const result = await forceDeadIntegrationOutboxEvent(id);
      if (result.success) {
        toast({ title: "Marked DEAD" });
        await invalidate();
      } else {
        toast({ title: "Failed", description: result.error, variant: "destructive" });
      }
    });
  };

  const handleRunNow = async (id: string) => {
    startTransition(async () => {
      const result = await runIntegrationOutboxEventNow(id);
      if (result.success) {
        toast({ title: "Processed" });
        await invalidate();
      } else {
        toast({ title: "Failed", description: result.error, variant: "destructive" });
        await invalidate();
      }
    });
  };

  const handleDispatchBatch = async () => {
    startTransition(async () => {
      const result = await dispatchIntegrationOutboxBatch(50);
      if (result.success) {
        toast({
          title: "Dispatched",
          description: `Attempted ${result.result.attempted}, processed ${result.result.processed}, failed ${result.result.failed}`,
        });
        await invalidate();
      } else {
        toast({ title: "Failed to dispatch", description: result.error, variant: "destructive" });
      }
    });
  };

  const columns: Column<OutboxEvent>[] = [
    {
      header: "Status",
      cell: (item) => <Badge variant={statusVariant(item.status)}>{item.status}</Badge>,
      className: "w-[120px]",
    },
    {
      header: "Type",
      cell: (item) => (
        <div className="min-w-[240px]">
          <div className="font-medium">{item.type}</div>
          <div className="text-xs text-muted-foreground">{item.topic}</div>
        </div>
      ),
    },
    {
      header: "Aggregate",
      cell: (item) => (
        <div className="min-w-[240px]">
          <div className="font-medium">{item.aggregateType}</div>
          <div className="text-xs text-muted-foreground">{item.aggregateId}</div>
        </div>
      ),
    },
    {
      header: "Attempts",
      cell: (item) => (
        <div className="w-[120px]">
          <div className="font-medium">{item.attempts}</div>
          {item.nextAttemptAt ? (
            <div className="text-xs text-muted-foreground">
              Next: {formatDate(item.nextAttemptAt)}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      header: "Created",
      cell: (item) => (
        <div className="w-[160px] text-sm">{formatDate(item.createdAt)}</div>
      ),
    },
    {
      header: "",
      cell: (item) => (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => openDetails(item)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openPayload(item)}>
                <Eye className="mr-2 h-4 w-4" />
                View Payload
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!item.lastError}
                onClick={() => openError(item)}
              >
                <Eye className="mr-2 h-4 w-4" />
                View Error
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <Protect permission="integrations.outbox.dispatch">
                <DropdownMenuItem onClick={() => handleRunNow(item.id)}>
                  <Play className="mr-2 h-4 w-4" />
                  Run Now
                </DropdownMenuItem>
              </Protect>
              <Protect permission="integrations.outbox.retry">
                <DropdownMenuItem onClick={() => handleRequeue(item.id, { resetAttempts: true })}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Requeue (Reset)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleRequeue(item.id, { resetAttempts: false })}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Requeue (Keep)
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={item.status !== "PROCESSING"}
                  onClick={() => handleUnlock(item.id)}
                >
                  <LockOpen className="mr-2 h-4 w-4" />
                  Unlock
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleForceDead(item.id)}>
                  <Ban className="mr-2 h-4 w-4" />
                  Mark DEAD
                </DropdownMenuItem>
              </Protect>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
      className: "w-[60px]",
    },
  ];

  return (
    <PageListLayout>
      <PageListHeader>
        <PageListTitle title="Integration Outbox" />
        <PageListActions>
          <Protect permission="integrations.outbox.dispatch">
            <Button onClick={handleDispatchBatch} disabled={isPending}>
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Dispatch Pending
            </Button>
          </Protect>
        </PageListActions>
      </PageListHeader>

      <PageListFilter>
        <OutboxFilters />
      </PageListFilter>

      <PageListContent>
        <DataTable
          data={data?.events ?? []}
          columns={columns}
          isLoading={isLoading}
          pagination={{
            totalEntries: data?.total ?? 0,
            pageSize: 20,
            currentPage: page,
          }}
        />
      </PageListContent>

      <OutboxEventDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
        title={dialog.title}
        content={dialog.content}
      />
    </PageListLayout>
  );
}
