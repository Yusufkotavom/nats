import type { NavSubItem } from "@/modules/plugins/types";
import { canAccessAdminPath } from "@/lib/navigation/platform-admin-access";

export function filterAdministrationNavigation(
  groups: NavSubItem[],
  options: {
    isPlatformSuperAdmin: boolean;
    enableDepartmentDimension: boolean;
    enableProjectDimension: boolean;
  },
): NavSubItem[] {
  const {
    isPlatformSuperAdmin,
    enableDepartmentDimension,
    enableProjectDimension,
  } = options;

  return groups.filter((item) => {
    if (!canAccessAdminPath(item.url, isPlatformSuperAdmin)) return false;
    if (!enableDepartmentDimension && item.url === "/general/departments") return false;
    if (!enableProjectDimension && item.url === "/general/projects") return false;
    return true;
  });
}
