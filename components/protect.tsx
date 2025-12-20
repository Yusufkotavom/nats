"use client";

import { usePermission } from "@/lib/hooks/use-permission";
import { Permission } from "@/lib/permissions";

interface ProtectProps {
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function Protect({
  permission,
  children,
  fallback = null,
}: ProtectProps) {
  const hasAccess = usePermission(permission);

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
