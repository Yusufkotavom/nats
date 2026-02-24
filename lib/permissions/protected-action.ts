import { getSession } from "@/lib/auth/auth";
import { hasPermission, Permission } from "@/lib/permissions/utils";
import { managementPrisma } from "@/lib/prisma/tenant";

export type ActionResponse<T> = { success: boolean; data?: T; error?: string };

export function authorizedAction<T, A extends unknown[]>(
  permission: Permission,
  action: (...args: A) => Promise<ActionResponse<T>>
) {
  return async (...args: A): Promise<ActionResponse<T>> => {
    const session = await getSession();

    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    const role = await managementPrisma.role.findUnique({
      where: { id: session.roleId },
      select: { isActive: true },
    });

    if (!role || !role.isActive) {
      return { success: false, error: "Forbidden: Role is deactivated" };
    }

    if (!hasPermission(session.permissions, permission)) {
      return { success: false, error: "Forbidden: Insufficient permissions" };
    }

    return action(...args);
  };
}
