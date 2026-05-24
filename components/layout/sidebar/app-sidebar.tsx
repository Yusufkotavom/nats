"use client";

import * as React from "react";
import { GalleryVerticalEnd } from "lucide-react";

import { NavMain } from "@/components/layout/sidebar/nav-main";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { TeamSwitcher } from "@/components/layout/others/team-switcher";
import { NavUser } from "@/components/layout/sidebar/nav-user";
import { getNavigationBySection } from "@/modules/plugins";
import { useCompanyProfile } from "@/components/providers/session-provider";
import { filterAdministrationNavigation } from "@/components/layout/sidebar/navigation-filters";

// Removed static sample data since it will be passed via props

export function AppSidebar({
  user,
  companyName = "Company Name",
  descText = "Community Edition",
  isPlatformSuperAdmin = false,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: {
    name: string;
    email: string;
    avatar: string;
    role: string;
  };
  companyName?: string;
  descText?: string;
  isPlatformSuperAdmin?: boolean;
}) {
  const companyProfile = useCompanyProfile();
  const enableDepartmentDimension =
    companyProfile?.enableDepartmentDimension ?? true;
  const enableProjectDimension =
    companyProfile?.enableProjectDimension ?? true;
  const navigation = getNavigationBySection();
  const adminNavigation = navigation["Administration"].map((group) => ({
    ...group,
    items: filterAdministrationNavigation(group.items || [], {
      isPlatformSuperAdmin,
      enableDepartmentDimension,
      enableProjectDimension,
    }),
  }));
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher
          teams={[
            {
              name: companyName,
              logo: GalleryVerticalEnd,
              plan: descText,
            },
          ]}
        />
      </SidebarHeader>
      <SidebarContent>
        <NavMain
          label="Navigation.operations"
          items={navigation["Operations"]}
        />
        <NavMain
          label="Navigation.finance_accounting"
          items={navigation["Finance & Accounting"]}
        />
        <NavMain
          label="Navigation.intelligence"
          items={navigation["Intelligence"]}
        />
        <NavMain
          label="Navigation.administration"
          items={adminNavigation}
        />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
