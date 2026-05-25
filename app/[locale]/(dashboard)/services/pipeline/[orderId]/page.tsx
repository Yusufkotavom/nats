import { ServicePipelineWorkspace } from "../_components/service-pipeline-workspace";
import { notFound } from "next/navigation";
import { getServicePipelineBridgeByOrderId } from "../../_lib/pipeline-bridge";

export const dynamic = "force-dynamic";

export default async function ServicePipelinePage(props: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await props.params;
  const bridge = await getServicePipelineBridgeByOrderId(orderId);
  if (!bridge) notFound();

  return <ServicePipelineWorkspace orderId={orderId} bridge={bridge} />;
}
