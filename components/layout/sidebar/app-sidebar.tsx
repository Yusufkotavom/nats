"use client";

import * as React from "react";
import {
  GalleryVerticalEnd,
} from "lucide-react";

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

// Removed static sample data since it will be passed via props

export function AppSidebar({
  user,
  companyName = "Company Name",
  subscriptionPlan = "FREE",
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: {
    name: string;
    email: string;
    avatar: string;
    role: string;
  };
  companyName?: string;
  subscriptionPlan?: string;
}) {
  const navigation = getNavigationBySection();
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher
          teams={[
            {
              name: companyName,
              logo: GalleryVerticalEnd,
              plan: subscriptionPlan + " Plan",
            }
          ]}
        />
      </SidebarHeader>
      <SidebarContent>
        <NavMain label="Navigation.operations" items={navigation["Operations"]} />
        <NavMain
          label="Navigation.finance_accounting"
          items={navigation["Finance & Accounting"]}
        />
        <NavMain label="Navigation.intelligence" items={navigation["Intelligence"]} />
        <NavMain label="Navigation.administration" items={navigation["Administration"]} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
