import { ServicesDashboard } from "../../_components/services-dashboard";

export default async function ServiceOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <ServicesDashboard
      initialTab="orders"
      lockTab
      initialEditOrderId={id}
    />
  );
}

