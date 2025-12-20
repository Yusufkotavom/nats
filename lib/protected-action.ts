import { getSession } from "@/lib/auth";
import { hasPermission, Permission } from "@/lib/permissions";

type ActionResponse<T> = { success: boolean; data?: T; error?: string };

export function authorizedAction<T, A extends unknown[]>(
  permission: Permission,
  action: (...args: A) => Promise<ActionResponse<T>>
) {
  return async (...args: A): Promise<ActionResponse<T>> => {
    const session = await getSession();

    if (!session) {
      return { success: false, error: "Unauthorized" };
    }

    if (!hasPermission(session.permissions, permission)) {
      return { success: false, error: "Forbidden: Insufficient permissions" };
    }

    return action(...args);
  };
}
