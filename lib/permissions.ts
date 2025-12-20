export type Permission = string;

export function hasPermission(
  userPermissions: string[],
  requiredPermission: Permission
): boolean {
  if (userPermissions.includes("*")) return true;
  return userPermissions.includes(requiredPermission);
}
