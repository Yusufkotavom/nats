import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ManagementSidebar } from "@/app/management/_components/management-sidebar";
import { ManagementHeader } from "@/app/management/_components/management-header";
import { verifySession } from "@/lib/auth/auth";
import { managementPrisma } from "@/lib/prisma/tenant";
import { redirect } from "next/navigation";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await verifySession();

    // Redirect if not authenticated as management
    if (!session?.userId) {
        redirect("/management/auth");
    }

    let userData = {
        name: "Admin",
        email: "",
        avatar: "",
        role: "Super Admin",
    };

    const user = await managementPrisma.user.findUnique({
        where: { id: session.userId },
    });

    if (user) {
        userData = {
            ...userData,
            name: user.name,
            email: user.email,
        };
    }

    return (
        <SidebarProvider
            style={
                {
                    "--sidebar-width": "calc(var(--spacing) * 72)",
                    "--header-height": "calc(var(--spacing) * 12)",
                } as React.CSSProperties
            }
        >
            <ManagementSidebar user={userData} />
            <SidebarInset>
                <ManagementHeader />
                <main className="flex flex-1 flex-col gap-4 p-2 lg:gap-6 lg:p-4">
                    {children}
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}
