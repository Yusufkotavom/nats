import { getAllTenantBillings, getTenants } from "@/app/management/(admin)/tenants/actions";
import { BillingView } from "./_components/billing-view";

export const metadata = {
    title: "Penagihan Tenant - Management",
};

export default async function BillingPage() {
    const billingsRes = await getAllTenantBillings();
    const billings = billingsRes.success ? billingsRes.data || [] : [];

    // All tenants for "Create Billing" dialog
    const tenants = await getTenants();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Penagihan & Pembayaran</h1>
                <p className="text-muted-foreground">
                    Kelola penagihan (billing) tenant dan konfirmasi pembayaran untuk memperpanjang langganan.
                </p>
            </div>

            <BillingView billings={billings} tenants={tenants} />
        </div>
    );
}
