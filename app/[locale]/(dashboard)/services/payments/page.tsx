import { ServicesDashboard } from "../_components/services-dashboard";

export const dynamic = "force-dynamic";

export default function ServicePaymentsPage() {
  return <ServicesDashboard initialTab="payments" lockTab />;
}
