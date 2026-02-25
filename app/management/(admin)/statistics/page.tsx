import { getAllTenantsStatistics } from "@/app/management/(admin)/tenants/actions";
import { StatisticsView } from "./_components/statistics-view";


export const metadata = {
    title: "Statistik Database Tenant - Management",
};

export default async function StatisticsPage() {
    const statsRes = await getAllTenantsStatistics();
    const stats = statsRes.success ? statsRes.data || [] : [];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Statistik Database</h1>
                <p className="text-muted-foreground">
                    Ringkasan data transaksi untuk semua database tenant yang aktif.
                </p>
            </div>

            <StatisticsView data={stats} />
        </div>
    );
}
