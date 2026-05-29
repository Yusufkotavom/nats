import { getSession } from "@/lib/auth/auth";
import { hasPermission, Permission } from "@/lib/permissions/utils";
import { prisma } from "@/lib/prisma";
import { getCompanyAccessState } from "@/lib/subscription/access";

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

    const role = await prisma.role.findUnique({
      where: { id: session.roleId },
      select: { isActive: true },
    });

    if (!role || !role.isActive) {
      return { success: false, error: "Forbidden: Role is deactivated" };
    }

    if (!hasPermission(session.permissions, permission)) {
      return { success: false, error: "Forbidden: Insufficient permissions" };
    }

    if (process.env.NODE_ENV === "test") {
      return action(...args);
    }

    const isWriteAction = !permission.endsWith(".view");
    if (isWriteAction && session.activeCompanyId && !session.isPlatformSuperAdmin) {
      const access = await getCompanyAccessState(session.activeCompanyId);
      if (access.isReadOnly) {
        return {
          success: false,
          error:
            "Company is in read-only mode because trial/subscription is inactive. Activate a plan to continue.",
        };
      }
    }

    return action(...args);
  };
}
