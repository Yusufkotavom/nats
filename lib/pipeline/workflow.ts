export type SalesPipelineStep =
  | "confirm_order"
  | "shipment"
  | "complete_shipment"
  | "invoice"
  | "post_invoice"
  | "payment"
  | "post_payment"
  | "close_order"
  | "done";

export type SalesWorkflowInput = {
  orderStatus: string;
  hasShipment: boolean;
  hasDraftShipment: boolean;
  shipmentSkipped: boolean;
  hasInvoice: boolean;
  invoiceStatus?: string | null;
  hasPayment: boolean;
};

export function getSalesNextStep(input: SalesWorkflowInput): SalesPipelineStep {
  if (input.orderStatus === "DRAFT") return "confirm_order";
  if (!input.hasShipment && !input.shipmentSkipped) return "shipment";
  if (input.hasDraftShipment) return "complete_shipment";
  if (!input.hasInvoice) return "invoice";
  if (input.invoiceStatus === "DRAFT") return "post_invoice";
  if (!input.hasPayment) return "payment";
  if (input.invoiceStatus !== "PAID") return "post_payment";
  if (input.orderStatus !== "CLOSED") return "close_order";
  return "done";
}

export type ServicePipelineStep =
  | "move_processing"
  | "move_ready"
  | "settle_payment"
  | "close_order"
  | "done";

export type ServiceWorkflowInput = {
  status: "NEW" | "PROCESSING" | "READY" | "DONE" | "CLOSED" | "CANCELLED";
  remainingAmount: number;
  canClose: boolean;
};

export function getServiceNextStep(input: ServiceWorkflowInput): ServicePipelineStep {
  if (input.status === "NEW") return "move_processing";
  if (input.status === "PROCESSING") return "move_ready";
  if (input.status === "READY" || input.status === "DONE") {
    if (input.remainingAmount > 0) return "settle_payment";
    if (input.canClose) return "close_order";
    return "done";
  }
  if (input.status === "CLOSED" || input.status === "CANCELLED") return "done";
  return "done";
}
