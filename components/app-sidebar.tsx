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
  Settings2,
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
      name: "Pasak",
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
          title: "Journal Entries",
          url: "/accounting/journal-entries",
        },
        {
          title: "Chart of Accounts",
          url: "/accounting/accounts",
        },
        {
          title: "Trial Balance",
          url: "#",
        },
        {
          title: "Ledger Detail",
          url: "/accounting/ledger",
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
  ],
  projects: [
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
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
