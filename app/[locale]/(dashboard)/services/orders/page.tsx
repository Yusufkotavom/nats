import { ServicesDashboard } from "../_components/services-dashboard";

export const dynamic = "force-dynamic";

export default function ServiceOrdersPage() {
  return <ServicesDashboard initialTab="orders" lockTab />;
}
