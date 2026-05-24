import type { NavSubItem } from "@/modules/plugins/types";

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
    if (!isPlatformSuperAdmin && item.url === "/admin/companies") return false;
    if (!enableDepartmentDimension && item.url === "/general/departments") return false;
    if (!enableProjectDimension && item.url === "/general/projects") return false;
    return true;
  });
}
