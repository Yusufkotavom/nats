import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SiteHeader } from "@/components/layout/header/site-header";
import { AppSidebar } from "@/components/layout/sidebar/app-sidebar";
import { verifySession } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";
import { SessionProvider } from "@/components/providers/session-provider";
import { redirect } from "next/navigation";
import { getActiveCompanyContext } from "@/lib/company-context";
import { getCompanyAccessState } from "@/lib/subscription/access";
import { SubscriptionReadonlyPopup } from "@/components/subscription/subscription-readonly-popup";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await verifySession();

  if (session.role === "Cashier") {
    redirect("/pos");
  }

  let userData = {
    name: "User",
    email: "",
    avatar: "",
    role: "",
  };

  if (session?.userId) {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { role: true },
    });

    if (user) {
      userData = {
        ...userData,
        name: user.name,
        email: user.email,
        role: session.role || user.role?.name || "Member",
      };
    }
  }

  const companyContext = await getActiveCompanyContext();
  const companyProfile = companyContext?.profile ?? null;
  const companyAccess =
    session.activeCompanyId
      ? await getCompanyAccessState(session.activeCompanyId)
      : { isReadOnly: false };

  return (
    <SessionProvider
      session={{
        userId: session.userId,
        userName: session.userName,
        role: session.role,
        permissions: session.permissions,
        activeCompanyId: session.activeCompanyId,
        activeCompanyName: companyContext?.companyName ?? null,
        isPlatformSuperAdmin: session.isPlatformSuperAdmin,
        impersonatedCompanyId: session.impersonatedCompanyId,
        companyProfile: companyProfile
          ? {
              name: companyProfile.name,
              address: companyProfile.address,
              phone: companyProfile.phone,
              email: companyProfile.email,
              website: companyProfile.website,
              taxId: companyProfile.taxId,
              currency: companyProfile.currency,
              currencySymbol: companyProfile.currencySymbol,
              dateFormat: companyProfile.dateFormat,
              currencyFormat: companyProfile.currencyFormat,
	              locale: companyProfile.locale,
	              timezone: companyProfile.timezone,
              enableDepartmentDimension:
                companyProfile.enableDepartmentDimension,
              enableProjectDimension: companyProfile.enableProjectDimension,
	              posEnableRestaurantFeatures:
	                companyProfile.posEnableRestaurantFeatures,
            }
          : null,
      }}
    >
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as React.CSSProperties
        }
      >
        <AppSidebar
          user={userData}
          companyName={companyContext?.companyName || "Company Name"}
          isPlatformSuperAdmin={session.isPlatformSuperAdmin}
        />
        <SidebarInset>
          <SiteHeader />
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              <div className="flex flex-col gap-4 py-2 md:gap-6 md:py-2">
                {children}
                <SubscriptionReadonlyPopup openByDefault={Boolean(companyAccess.isReadOnly)} />
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </SessionProvider>
  );
}
