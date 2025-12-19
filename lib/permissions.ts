
import { Role } from "@prisma/client";

export type Permission =
  | "users.manage"
  | "roles.view"
  | "journal_entries.view"
  | "journal_entries.create"
  | "journal_entries.edit"
  | "journal_entries.delete"
  | "journal_entries.post"
  | "reports.view"
  | "settings.manage";

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  superadmin: [
    "users.manage",
    "roles.view",
    "journal_entries.view",
    "journal_entries.create",
    "journal_entries.edit",
    "journal_entries.delete",
    "journal_entries.post",
    "reports.view",
    "settings.manage",
  ],
  manager: [
    "roles.view",
    "journal_entries.view",
    "journal_entries.create",
    "journal_entries.edit",
    "journal_entries.post",
    "reports.view",
    "settings.manage",
  ],
  supervisor: [
    "journal_entries.view",
    "journal_entries.create",
    "journal_entries.edit",
    "journal_entries.post",
    "reports.view",
  ],
  staff: [
    "journal_entries.view",
    "journal_entries.create",
  ],
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  superadmin: "Full access to all system features and settings.",
  manager: "Can manage accounting operations and view reports, but cannot manage users.",
  supervisor: "Can create, edit, and post journal entries.",
  staff: "Can view and create draft journal entries.",
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
