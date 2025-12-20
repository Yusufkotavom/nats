"use client";

import { useSession } from "@/components/session-provider";
import { hasPermission, Permission } from "@/lib/permissions";

export function usePermission(permission: Permission) {
  const session = useSession();

  if (!session) return false;

  return hasPermission(session.permissions, permission);
}
