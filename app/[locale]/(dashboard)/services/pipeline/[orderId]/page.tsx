import { ServicePipelineWorkspace } from "../_components/service-pipeline-workspace";

export const dynamic = "force-dynamic";

export default async function ServicePipelinePage(props: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await props.params;
  return <ServicePipelineWorkspace orderId={orderId} />;
}
