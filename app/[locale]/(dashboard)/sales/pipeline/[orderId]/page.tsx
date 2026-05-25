import { SalesPipelineWorkspace } from "../_components/sales-pipeline-workspace";

export const dynamic = "force-dynamic";

export default async function SalesPipelinePage(props: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await props.params;
  return <SalesPipelineWorkspace orderId={orderId} />;
}
