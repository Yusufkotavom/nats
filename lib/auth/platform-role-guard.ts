const PLATFORM_SUPERADMIN_ROLE = "superadmin";

export function isPlatformRole(roleName: string | null | undefined) {
  return (roleName || "").toLowerCase() === PLATFORM_SUPERADMIN_ROLE;
}

export function canManagePlatformRole(isPlatformSuperAdmin: boolean, roleName: string | null | undefined) {
  if (!isPlatformRole(roleName)) return true;
  return isPlatformSuperAdmin;
}
