import { getTenants } from "@/app/management/(admin)/tenants/actions";
import { SubscriptionsView } from "./_components/subscriptions-view";

export const metadata = {
    title: "Langganan Tenant - Management",
};

export default async function SubscriptionsPage() {
    const tenants = await getTenants();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Langganan Tenant</h1>
                <p className="text-muted-foreground">
                    Kelola paket langganan dan masa aktif untuk semua tenant.
                </p>
            </div>

            <SubscriptionsView tenants={tenants} />
        </div>
    );
}
