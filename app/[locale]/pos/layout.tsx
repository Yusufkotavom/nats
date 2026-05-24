import { verifySession } from "@/lib/auth/auth";
import { SessionProvider } from "@/components/providers/session-provider";
import { POSClickSound } from "./_components/pos-click-sound";
import { getActiveCompanyContext } from "@/lib/company-context";

export default async function POSLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await verifySession();

  const companyContext = await getActiveCompanyContext();
  const companyProfile = companyContext?.profile ?? null;

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
            posEnableRestaurantFeatures:
              companyProfile.posEnableRestaurantFeatures,
          }
          : null,
      }}
    >
      <POSClickSound />
      <div className="min-h-screen bg-background">
        {children}
      </div>
    </SessionProvider>
  );
}
