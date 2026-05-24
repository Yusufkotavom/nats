"use client";

import {
  BadgeCheck,
  ChevronsUpDown,
  CreditCard,
  Building2,
  LogOut,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { logout } from "@/app/[locale]/auth/actions";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import {
  getMyCompanyMemberships,
  stopCompanyImpersonation,
  switchMyActiveCompany,
} from "@/app/[locale]/(dashboard)/admin/companies/actions";
import { useSession } from "@/components/providers/session-provider";

export function NavUser({
  user,
}: {
  user: {
    name: string;
    email: string;
    avatar: string;
    role: string;
  };
}) {
  const { isMobile } = useSidebar();
  const session = useSession();
  const [memberships, setMemberships] = useState<
    Array<{ companyId: string; companyName: string; isDefault: boolean }>
  >([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const loadMemberships = async () => {
      const data = await getMyCompanyMemberships();
      setMemberships(data);
    };
    loadMemberships();
  }, []);

  const handleLogout = async () => {
    await logout();
    window.location.href = "/auth";
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg">CN</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs">{user.role}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs">{user.role}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/subscription">
                  <CreditCard />
                  Billing & History
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            {memberships.length > 0 ? (
              <>
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Active Company
                </DropdownMenuLabel>
                <DropdownMenuGroup>
                  {memberships.map((membership) => (
                    <DropdownMenuItem
                      key={membership.companyId}
                      disabled={isPending}
                      onClick={() =>
                        startTransition(async () => {
                          await switchMyActiveCompany(membership.companyId);
                          window.location.reload();
                        })
                      }
                    >
                      <Building2 />
                      {membership.companyName}
                      {session?.activeCompanyId === membership.companyId ? " • active" : ""}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
              </>
            ) : null}
            {session?.isPlatformSuperAdmin && session?.impersonatedCompanyId ? (
              <>
                <DropdownMenuItem
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      await stopCompanyImpersonation();
                      window.location.reload();
                    })
                  }
                >
                  <BadgeCheck />
                  Stop Impersonation
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            ) : null}
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
