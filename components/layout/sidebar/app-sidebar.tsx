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
  Landmark,
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
      title: "General Ledger",
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
          title: "Account History",
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
      title: "Cash & Bank",
      url: "/accounting/cash-bank",
      icon: Landmark,
      items: [
        {
          title: "Accounts",
          url: "/cash-bank",
        },
        {
          title: "Revenue & Expense",
          url: "/cash-bank/transaction",
        },
        {
          title: "Transfers",
          url: "/cash-bank/transfer",
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
          url: "/purchase/orders",
        },
        {
          title: "Purchase Invoice",
          url: "/purchase/invoices",
        },
        {
          title: "Receive Items",
          url: "/purchase/receives",
        },
        {
          title: "Purchase Return",
          url: "/purchase/returns",
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
          title: "Contacts",
          url: "/general/contacts",
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
