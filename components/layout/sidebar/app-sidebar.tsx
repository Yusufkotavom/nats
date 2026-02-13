"use client";

import * as React from "react";
import {
  GalleryVerticalEnd,
  BoxIcon,
  Scale,
  Building,
  ShoppingCart,
  Rocket,
  Settings,
  Landmark,
  StoreIcon,
  Bot,
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
  navOperations: [
    {
      title: "Purchase",
      url: "#",
      icon: ShoppingCart,
      items: [
        {
          title: "Dashboard",
          url: "/purchase/dashboard",
        },
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
        {
          title: "Purchase Payments",
          url: "/purchase/payments",
        },
      ],
    },
    {
      title: "Sales",
      url: "#",
      icon: Rocket,
      items: [
        {
          title: "Dashboard",
          url: "/sales/dashboard",
        },
        {
          title: "Sales Order",
          url: "/sales/orders",
        },
        {
          title: "Sales Invoice",
          url: "/sales/invoices",
        },
        {
          title: "Sales Return",
          url: "/sales/returns",
        },
        {
          title: "Sales Shipments",
          url: "/sales/shipments",
        },
        {
          title: "Sales Payments",
          url: "/sales/payments",
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
          title: "Products List",
          url: "/inventory/products",
        },
        {
          title: "Pricing and Discount",
          url: "/inventory/pricing",
        },
        {
          title: "Locations/Warehouses",
          url: "/inventory/warehouses",
        },
        {
          title: "Stock Movements",
          url: "/inventory/movements",
        },
        {
          title: "Product Categories",
          url: "/inventory/categories",
        },
        {
          title: "Products Units (UOM)",
          url: "/inventory/uom",
        },
      ],
    },
    {
      title: "Point of Sale",
      url: "/pos",
      icon: StoreIcon,
      items: [
        {
          title: "Terminal",
          url: "/pos",
        },
        {
          title: "Sessions",
          url: "/pos/sessions",
        }
      ],
    },
  ],
  navFinance: [
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
        {
          title: "Default Accounts",
          url: "/accounting/configuration/default-accounts",
        },
        {
          title: "Tax Rates",
          url: "/accounting/configuration/taxes",
        },
      ],
    },
    {
      title: "Cash & Bank",
      url: "/accounting/cash-bank",
      icon: Landmark,
      items: [
        {
          title: "Overview",
          url: "/cash-bank",
        },
        {
          title: "Cash In & Out",
          url: "/cash-bank/transaction",
        },
        {
          title: "Internal Transfers",
          url: "/cash-bank/transfer",
        },
      ],
    },
    {
      title: "Fixed Assets",
      url: "/assets",
      icon: Building,
      items: [
        {
          title: "Asset List",
          url: "/assets",
        },
        {
          title: "Depreciation Run",
          url: "/assets/depreciation",
        },
        {
          title: "Asset Categories",
          url: "/assets/categories",
        },
      ],
    },
  ],
  navIntelligence: [
    {
      title: "AI Assistant",
      url: "/ai/chat",
      icon: Bot,
      items: [
        {
          title: "Chat",
          url: "/ai/chat",
        },
      ],
    },
  ],
  navAdmin: [
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
          title: "Company Settings",
          url: "/admin/settings",
        },
        {
          title: "AI Configuration",
          url: "/admin/settings/ai",
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
        <NavMain label="Operations" items={data.navOperations} />
        <NavMain label="Finance & Accounting" items={data.navFinance} />
        <NavMain label="Intelligence" items={data.navIntelligence} />
        <NavMain label="Administration" items={data.navAdmin} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
