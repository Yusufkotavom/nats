import { getTenants } from "@/app/management/(admin)/tenants/actions";
import { DatabaseConsole } from "./_components/database-console";

export const metadata = {
    title: "Database Console - Management",
};

export default async function DatabasesPage() {
    // Only fetch tenants that actually have a database provisioned
    const allTenants = await getTenants();
    const activeDbTenants = allTenants.filter(t => t.dbUrl && t.isActive);

    return (
        <div className="space-y-6 h-[calc(100vh-120px)] flex flex-col">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Database SQL Console</h1>
                <p className="text-muted-foreground">
                    Eksekusi kueri SQL langsung ke database tenant tertentu.
                </p>
            </div>

            <div className="flex-1 min-h-[500px] border rounded-md overflow-hidden bg-card">
                <DatabaseConsole tenants={activeDbTenants} />
            </div>
        </div>
    );
}
