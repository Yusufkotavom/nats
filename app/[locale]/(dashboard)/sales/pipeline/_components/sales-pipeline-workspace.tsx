"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useLocale } from "next-intl";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { getSalesNextStep } from "@/lib/pipeline/workflow";
import { getSalesPipelineState, runSalesPipelineAction } from "../actions";

export function SalesPipelineWorkspace({ orderId }: { orderId: string }) {
  const { toast } = useToast();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  const stateQuery = useQuery({
    queryKey: ["sales-pipeline", orderId],
    queryFn: () => getSalesPipelineState(orderId),
  });

  const state = stateQuery.data;
  const nextStep = state
    ? getSalesNextStep({
        orderStatus: state.order.status,
        hasShipment: state.hasShipment,
        hasDraftShipment: state.hasDraftShipment,
        shipmentSkipped: state.shipmentSkipped,
        hasInvoice: !!state.invoice,
        invoiceStatus: state.invoice?.status,
        hasPayment: state.hasPayment,
      })
    : "done";

  const runStep = (action: Parameters<typeof runSalesPipelineAction>[1]) => {
    startTransition(async () => {
      try {
        await runSalesPipelineAction(orderId, action);
        await queryClient.invalidateQueries({ queryKey: ["sales-pipeline", orderId] });
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
    confirm_order: "Confirm Sales Order",
    shipment: "Create Shipment (Optional)",
    complete_shipment: "Complete Shipment",
    invoice: "Create Invoice",
    post_invoice: "Post Invoice",
    payment: "Create Payment",
    post_payment: "Post Payment",
    close_order: "Close Order",
    done: "Done",
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Sales Pipeline Workspace</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {state ? (
            <>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">Order:</span>
                <Badge>{state.order.orderNumber || "DRAFT"}</Badge>
                <Badge variant="outline">{state.order.status}</Badge>
              </div>
              <div className="grid gap-2 text-sm md:grid-cols-2">
                <div>Shipment: {state.hasShipment ? `${state.shipment?.status || "Created"}` : state.shipmentSkipped ? "Skipped" : "Pending"}</div>
                <div>Invoice: {state.invoice ? state.invoice.status : "Not created"}</div>
                <div>Payment: {state.hasPayment ? (state.payment?.journalPosted ? "Posted" : "Draft") : "Not created"}</div>
                <div>Total: {state.order.totalAmount.toLocaleString("id-ID")}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                {nextStep !== "done" ? (
                  <Button disabled={isPending} onClick={() => runStep(nextStep === "shipment" ? "create_shipment" : (nextStep as any))}>
                    {actionLabelMap[nextStep]}
                  </Button>
                ) : (
                  <Badge className="bg-green-600">Pipeline Complete</Badge>
                )}
                {nextStep === "shipment" && !state.shipmentSkipped && (
                  <Button variant="outline" disabled={isPending} onClick={() => runStep("skip_shipment")}>
                    Skip Shipment
                  </Button>
                )}
                <Button variant="outline" asChild>
                  <Link href={`/sales/orders/${orderId}`} target="_blank">
                    Open Full Document
                  </Link>
                </Button>
                {state.shipment?.id ? (
                  <Button variant="outline" asChild>
                    <Link href={`/sales/shipments/${state.shipment.id}`} target="_blank">
                      Open Shipment
                    </Link>
                  </Button>
                ) : null}
                {state.invoice?.id ? (
                  <>
                    <Button variant="outline" asChild>
                      <Link href={`/sales/invoices/${state.invoice.id}`} target="_blank">
                        Open Invoice
                      </Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link
                        href={`/${locale}/reporting/preview?code=SALES_INVOICE&invoiceId=${state.invoice.id}`}
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
                  <div>SO: {state.order.orderNumber || "DRAFT"} ({state.order.status})</div>
                  <div>Shipment: {state.shipment ? `${state.shipment.shipmentNumber} (${state.shipment.status})` : state.shipmentSkipped ? "Skipped" : "-"}</div>
                  <div>Invoice: {state.invoice ? `${state.invoice.invoiceNumber} (${state.invoice.status})` : "-"}</div>
                  <div>Payment: {state.payment ? `${state.payment.paymentNumber} (${state.payment.journalPosted ? "Posted" : "Draft"})` : "-"}</div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {stateQuery.isLoading ? "Loading pipeline..." : "No data found."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
