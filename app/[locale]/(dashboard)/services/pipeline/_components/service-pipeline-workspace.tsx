"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useLocale } from "next-intl";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { getServiceNextStep } from "@/lib/pipeline/workflow";
import { getServicePipelineState, runServicePipelineAction } from "../actions";
import { ServicePipelineBridge } from "../../_lib/pipeline-bridge";
import { ServicePipelineTopbar } from "../../_components/service-pipeline-topbar";

export function ServicePipelineWorkspace({
  orderId,
  bridge,
}: {
  orderId: string;
  bridge: ServicePipelineBridge;
}) {
  const { toast } = useToast();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  const stateQuery = useQuery({
    queryKey: ["service-pipeline", orderId],
    queryFn: () => getServicePipelineState(orderId),
  });
  const state = stateQuery.data;

  const nextStep = state
    ? getServiceNextStep({
        status: state.order.status,
        remainingAmount: state.order.remainingAmount,
        canClose: state.invoice?.status === "PAID",
      })
    : "done";

  const runStep = (action: Parameters<typeof runServicePipelineAction>[1]) => {
    startTransition(async () => {
      try {
        await runServicePipelineAction(orderId, action);
        await queryClient.invalidateQueries({ queryKey: ["service-pipeline", orderId] });
        toast({ title: "Pipeline updated", description: "Step completed successfully." });
      } catch (error) {
        toast({
          title: "Action failed",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      }
    });
  };

  const actionLabelMap: Record<string, string> = {
    move_processing: "Move to Processing",
    move_ready: "Move to Ready",
    move_done: "Complete Work",
    settle_payment: "Settle Payment",
    close_order: "Close Service Order",
    done: "Done",
  };

  return (
    <div className="space-y-4">
      <ServicePipelineTopbar data={bridge} active="order" />
      <Card>
        <CardHeader>
          <CardTitle>Service Pipeline Workspace</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {stateQuery.isError ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <div className="font-medium">Failed to load service pipeline</div>
              <div className="mt-1">
                {stateQuery.error instanceof Error
                  ? stateQuery.error.message
                  : "Unknown error"}
              </div>
              <div className="mt-1 text-xs">Order ID: {orderId}</div>
            </div>
          ) : null}
          {state ? (
            <>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">Order:</span>
                <Badge>{state.order.orderNumber}</Badge>
                <Badge variant="outline">{state.order.status}</Badge>
              </div>
              <div className="grid gap-2 text-sm md:grid-cols-2">
                <div>Customer: {state.order.customerName}</div>
                <div>Invoice: {state.invoice?.status || "Not linked"}</div>
                <div>Total: {state.order.totalAmount.toLocaleString("id-ID")}</div>
                <div>Remaining: {state.order.remainingAmount.toLocaleString("id-ID")}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                {nextStep !== "done" ? (
                  <Button disabled={isPending} onClick={() => runStep(nextStep as any)}>
                    {actionLabelMap[nextStep]}
                  </Button>
                ) : (
                  <Badge className="bg-green-600">Pipeline Complete</Badge>
                )}
                <Button variant="outline" asChild>
                  <Link href="/services/orders" target="_blank">
                    Open Full Document
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href={`/sales/orders/${state.order.salesOrderId}`} target="_blank">
                    Open Sales Order
                  </Link>
                </Button>
                {state.invoice?.id ? (
                  <>
                    <Button variant="outline" asChild>
                      <Link href={`/sales/invoices/${state.invoice.id}`} target="_blank">
                        Open Invoice
                      </Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link
                        href={`/${locale}/reporting/preview?code=SERVICE_INVOICE&invoiceId=${state.invoice.id}`}
                        target="_blank"
                      >
                        Print Invoice
                      </Link>
                    </Button>
                  </>
                ) : null}
                {state.payment?.id ? (
                  <Button variant="outline" asChild>
                    <Link href={`/sales/payments/${state.payment.id}`} target="_blank">
                      Open Payment
                    </Link>
                  </Button>
                ) : null}
              </div>
              <div className="rounded-md border p-3 text-sm">
                <div className="font-medium mb-2">Tracking Cepat</div>
                <div className="grid gap-1">
                  <div>Service Order: {state.order.orderNumber} ({state.order.status})</div>
                  <div>Sales Order: {state.order.salesOrderId}</div>
                  <div>Invoice: {state.invoice ? `${state.invoice.invoiceNumber} (${state.invoice.status})` : "-"}</div>
                  <div>Payment: {state.payment ? `${state.payment.paymentNumber} (${state.payment.journalPosted ? "Posted" : "Draft"})` : "-"}</div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {stateQuery.isLoading ? "Loading pipeline..." : "No data found for this order."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
