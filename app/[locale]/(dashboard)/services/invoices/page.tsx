import { ServicesDashboard } from "../_components/services-dashboard";

export const dynamic = "force-dynamic";

export default function ServiceInvoicesPage() {
  return <ServicesDashboard initialTab="invoices" lockTab />;
}
