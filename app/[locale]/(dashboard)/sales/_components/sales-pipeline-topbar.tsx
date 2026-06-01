import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { SalesPipelineBridge } from "../_lib/pipeline-bridge";

type Props = {
  data: SalesPipelineBridge;
  active: "order" | "shipment" | "invoice" | "payment";
};

function Step({
  label,
  href,
  active,
  status,
}: {
  label: string;
  href: string | null;
  active: boolean;
  status?: string | null;
}) {
  if (!href) {
    return (
      <div className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
        {label}: -
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={`rounded-md border px-3 py-2 text-sm transition-colors ${
        active ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"
      }`}
    >
      <div className="flex items-center gap-2">
        <span>{label}</span>
        {status ? <Badge variant="outline">{status}</Badge> : null}
      </div>
    </Link>
  );
}

export function SalesPipelineTopbar({ data, active }: Props) {
  return (
    <div className="mb-4 rounded-lg border bg-card p-2 md:p-3">
      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Sales Pipeline
      </div>
      <div className="overflow-x-auto">
      <div className="inline-flex min-w-max gap-2">
        <Step
          label="Order"
          href={data.orderId ? `/sales/orders/${data.orderId}/edit` : null}
          active={active === "order"}
          status={data.orderStatus}
        />
        <Step
          label="Shipment"
          href={data.shipmentId ? `/sales/shipments/${data.shipmentId}/edit` : null}
          active={active === "shipment"}
          status={data.shipmentStatus}
        />
        <Step
          label="Invoice"
          href={data.invoiceId ? `/sales/invoices/${data.invoiceId}/edit` : null}
          active={active === "invoice"}
          status={data.invoiceStatus}
        />
        <Step
          label="Payment"
          href={data.paymentId ? `/sales/payments/${data.paymentId}/edit` : null}
          active={active === "payment"}
        />
      </div>
      </div>
    </div>
  );
}
