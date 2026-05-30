const PLATFORM_ONLY_ADMIN_PATH_PREFIXES = [
  "/platform/companies",
  "/platform/dashboard",
  "/platform/integrations",
  "/platform/settings/ai",
  "/platform/settings/data-reset",
] as const;

export function isPlatformOnlyAdminPath(path: string) {
  return PLATFORM_ONLY_ADMIN_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export function canAccessAdminPath(path: string, isPlatformSuperAdmin: boolean) {
  if (isPlatformOnlyAdminPath(path) && !isPlatformSuperAdmin) {
    return false;
  }
  return true;
}
