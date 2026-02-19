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

// This is sample data.
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "NATS Accounting",
      logo: GalleryVerticalEnd,
      plan: "Community Version",
    },
  ],
};

export function AppSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: {
    name: string;
    email: string;
    avatar: string;
    role: string;
  };
}) {
  const navigation = getNavigationBySection();
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
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
