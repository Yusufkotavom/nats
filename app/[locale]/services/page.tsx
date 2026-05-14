import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { SuperJSON } from "@/lib/superjson";
import {
  getOpenPOSSession,
  getPOSServiceProducts,
  getWarehouses,
} from "../pos/actions";
import { POSSessionDialog } from "../pos/_components/pos-session-dialog";
import { LogoutButton } from "../pos/_components/logout-button";
import { ServiceWorkflowPanel } from "../pos/_components/service-workflow-panel";
import type { POSProduct } from "../pos/types";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const t = await getTranslations("POS");
  const session = await getOpenPOSSession();
  const warehouses = await getWarehouses();
  const serviceProductsRaw = await getPOSServiceProducts();
  const serviceProducts = SuperJSON.deserialize<POSProduct[]>(serviceProductsRaw);

  if (!session) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">{t("open_session")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-full bg-yellow-100 p-3 dark:bg-yellow-900/20">
                <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <p className="text-center text-muted-foreground">
                {t("need_session")}
              </p>
              <div className="flex w-full flex-col gap-2">
                <POSSessionDialog warehouses={warehouses} />
                <LogoutButton variant="outline" className="w-full" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const parsedSession = SuperJSON.deserialize<any>(session);

  return (
    <div className="h-[calc(100vh-4rem)] overflow-hidden bg-muted/20 p-4">
      <div className="mb-3">
        <h1 className="text-lg font-bold tracking-tight">{t("services")}</h1>
        <p className="text-sm text-muted-foreground">
          Workflow service order terpisah dari kasir produk untuk extend lini bisnis jasa.
        </p>
      </div>
      <ServiceWorkflowPanel
        sessionId={parsedSession.id}
        products={serviceProducts}
      />
    </div>
  );
}
