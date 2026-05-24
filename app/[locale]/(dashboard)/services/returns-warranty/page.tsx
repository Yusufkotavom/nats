import { ServicesDashboard } from "../_components/services-dashboard";

export const dynamic = "force-dynamic";

export default function ServiceReturnsWarrantyPage() {
  return <ServicesDashboard initialTab="returns_warranty" lockTab />;
}
