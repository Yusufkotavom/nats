import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ServicePipelineBridge } from "../_lib/pipeline-bridge";

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

export function ServicePipelineTopbar({
  data,
  active = "order",
}: {
  data: ServicePipelineBridge;
  active?: "order" | "invoice" | "payment";
}) {
  const paymentStatus =
    data.paymentId && data.paymentPosted !== null
      ? data.paymentPosted
        ? "POSTED"
        : "DRAFT"
      : null;

  return (
    <div className="mb-4 rounded-lg border bg-card p-3">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Service Pipeline
      </div>
      <div className="grid gap-2 md:grid-cols-3">
        <Step
          label="Service Order"
          href={`/services/pipeline/${data.orderId}`}
          active={active === "order"}
          status={data.orderStatus}
        />
        <Step
          label="Invoice"
          href={data.invoiceId ? `/sales/invoices/${data.invoiceId}` : null}
          active={active === "invoice"}
          status={data.invoiceStatus}
        />
        <Step
          label="Payment"
          href={data.paymentId ? `/sales/payments/${data.paymentId}` : null}
          active={active === "payment"}
          status={paymentStatus}
        />
      </div>
    </div>
  );
}
