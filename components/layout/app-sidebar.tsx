"use client";

import * as React from "react";
import {
  GalleryVerticalEnd,
  BoxIcon,
  Scale,
  Building,
  ShoppingCart,
  Rocket,
  UsersIcon,
  Settings,
} from "lucide-react";

import { NavMain } from "@/components/layout/nav-main";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { TeamSwitcher } from "@/components/layout/team-switcher";
import { NavUser } from "@/components/layout/nav-user";

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
  navMain: [
    {
      title: "Accounting",
      url: "#",
      icon: Scale,
      items: [
        {
          title: "Dashboard",
          url: "/accounting/dashboard",
        },
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
          title: "Reports",
          url: "/accounting/reports",
        },
      ],
    },
    {
      title: "Inventory",
      url: "#",
      icon: BoxIcon,
      items: [
        {
          title: "Overview",
          url: "/inventory",
        },
        {
          title: "Products",
          url: "/inventory/products",
        },
        {
          title: "Pricing",
          url: "/inventory/pricing",
        },
        {
          title: "Warehouses",
          url: "/inventory/warehouses",
        },
        {
          title: "Movements",
          url: "/inventory/movements",
        },
        {
          title: "Categories",
          url: "/inventory/categories",
        },
        {
          title: "Units (UOM)",
          url: "/inventory/uom",
        },
      ],
    },
    {
      title: "Purchase",
      url: "#",
      icon: ShoppingCart,
      items: [
        {
          title: "Purchase Order",
          url: "#",
        },
        {
          title: "Purchase Invoice",
          url: "#",
        },
        {
          title: "Receive Items",
          url: "#",
        },
        {
          title: "Purchase Return",
          url: "#",
        },
      ],
    },
    {
      title: "Sales",
      url: "#",
      icon: Rocket,
      items: [
        {
          title: "Sales Order",
          url: "#",
        },
        {
          title: "Sales Invoice",
          url: "#",
        },
        {
          title: "Point of Sale (POS)",
          url: "#",
        },
        {
          title: "Sales Return",
          url: "#",
        },
      ],
    },
    {
      title: "Assets",
      url: "#",
      icon: Building,
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
      title: "Stakeholders",
      url: "#",
      icon: UsersIcon,
      items: [
        {
          title: "Customers",
          url: "/general/customers",
        },
        {
          title: "Vendors",
          url: "/general/vendors",
        },
      ],
    },
    {
      title: "General",
      url: "#",
      icon: Settings,
      items: [
        {
          title: "User Management",
          url: "/admin/users",
        },
        {
          title: "Role Definitions",
          url: "/admin/roles",
        },
        {
          title: "File Manager",
          url: "/general/files",
        },
        {
          title: "Settings",
          url: "/admin/settings",
        },
      ],
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
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
