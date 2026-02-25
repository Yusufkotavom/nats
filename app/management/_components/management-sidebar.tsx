"use client";

import * as React from "react";
import {
    Building,
    LayoutDashboard,
    Settings,
    CreditCard,
    Receipt,
    Activity,
    TerminalSquare,
} from "lucide-react";

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarRail,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
} from "@/components/ui/sidebar";
import { ManagementNavUser } from "@/app/management/_components/management-nav-user";
import { NavMain } from "@/components/layout/sidebar/nav-main";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationItems = [
    {
        title: "Tenants",
        url: "/management/tenants",
        icon: Building,
        isActive: true,
    },
    {
        title: "Langganan",
        url: "/management/subscriptions",
        icon: CreditCard,
    },
    {
        title: "Penagihan",
        url: "/management/billing",
        icon: Receipt,
    },
    {
        title: "Statistik",
        url: "/management/statistics",
        icon: Activity,
    },
    {
        title: "Database Console",
        url: "/management/databases",
        icon: TerminalSquare,
    },
];

export function ManagementSidebar({
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
    const pathname = usePathname();

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                            <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                                <LayoutDashboard className="size-4" />
                            </div>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-medium">PASAK SaaS</span>
                                <span className="truncate text-xs">Management</span>
                            </div>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <SidebarMenu className="px-2 mt-2">
                    {navigationItems.map((item) => {
                        const isActive = pathname.startsWith(item.url);
                        return (
                            <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton asChild isActive={isActive} tooltip={item.title} className="cursor-pointer">
                                    <Link href={item.url}>
                                        {item.icon && <item.icon />}
                                        <span>{item.title}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        );
                    })}
                </SidebarMenu>
            </SidebarContent>
            <SidebarFooter>
                <ManagementNavUser user={user} />
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
}
