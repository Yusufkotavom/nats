"use client";

import * as React from "react";
import {
  AudioWaveform,
  BookOpen,
  Bot,
  Command,
  Frame,
  GalleryVerticalEnd,
  Map,
  PieChart,
  ShieldCheck,
  Settings2,
  Users,
  SquareTerminal,
} from "lucide-react";

import { NavMain } from "./nav-main";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { TeamSwitcher } from "./team-switcher";
import { NavProjects } from "./nav-projects";
import { NavUser } from "./nav-user";

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
      plan: "Free Version",
    },
  ],
  navMain: [
    {
      title: "Accounting",
      url: "#",
      icon: SquareTerminal,
      isActive: true,
      items: [
        {
          title: "Chart of Accounts",
          url: "/accounting/accounts",
        },
        {
          title: "Journal Entries",
          url: "/accounting/journal-entries",
        },
        {
          title: "Ledger",
          url: "/accounting/ledger",
        },
        {
          title: "Trial Balance",
          url: "/accounting/trial-balance",
        },
        {
          title: "Reporting",
          url: "#",
        },
      ],
    },
    {
      title: "Sales",
      url: "#",
      icon: BookOpen,
      items: [
        {
          title: "POS",
          url: "#",
        },
        {
          title: "Return",
          url: "#",
        },
      ],
    },
    {
      title: "Purchase",
      url: "#",
      icon: Bot,
      items: [
        {
          title: "Order",
          url: "#",
        },
        {
          title: "Return",
          url: "#",
        },
      ],
    },
    {
      title: "Inventory",
      url: "#",
      icon: Bot,
      items: [
        {
          title: "Inventories",
          url: "#",
        },
        {
          title: "Stock Opname",
          url: "#",
        },
      ],
    },
    {
      title: "Assets",
      url: "#",
      icon: Settings2,
      items: [
        {
          title: "General",
          url: "#",
        },
        {
          title: "Team",
          url: "#",
        },
        {
          title: "Billing",
          url: "#",
        },
        {
          title: "Limits",
          url: "#",
        },
      ],
    },
    {
      title: "Administration",
      url: "#",
      icon: Users,
      items: [
        {
          title: "User Management",
          url: "/admin/users",
        },
        {
          title: "Role Definitions",
          url: "/admin/roles",
        },
      ],
    },
  ],
  settings: [
    {
      name: "Design Engineering",
      url: "#",
      icon: Frame,
    },
    {
      name: "Sales & Marketing",
      url: "#",
      icon: PieChart,
    },
    {
      name: "Travel",
      url: "#",
      icon: Map,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
