import { getAllTenantPayments, getTenants } from "@/app/management/(admin)/tenants/actions";
import { PaymentsView } from "./_components/payments-view";


export const metadata = {
    title: "Riwayat Pembayaran Tenant - Management",
};

export default async function PaymentsPage() {
    const paymentsRes = await getAllTenantPayments();
    const payments = paymentsRes.success ? paymentsRes.data || [] : [];

    // We also need all tenants to populate the "Add Payment" dialog select input
    const tenants = await getTenants();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Riwayat Pembayaran</h1>
                <p className="text-muted-foreground">
                    Lihat seluruh transaksi pembayaran dari semua tenant.
                </p>
            </div>

            <PaymentsView payments={payments} tenants={tenants} />
        </div>
    );
}
