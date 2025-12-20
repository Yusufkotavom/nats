import { Role } from "@/prisma/generated/prisma/enums";

export type Permission =
  | "users.view"
  | "users.create"
  | "users.edit"
  | "users.delete"
  | "roles.view"
  | "customers.view"
  | "customers.create"
  | "customers.edit"
  | "customers.delete"
  | "vendors.view"
  | "vendors.create"
  | "vendors.edit"
  | "vendors.delete"
  | "products.view"
  | "products.create"
  | "products.edit"
  | "products.delete"
  | "categories.view"
  | "categories.create"
  | "categories.edit"
  | "categories.delete"
  | "warehouses.view"
  | "warehouses.create"
  | "warehouses.edit"
  | "warehouses.delete"
  | "inventory_movements.view"
  | "inventory_movements.create"
  | "journal_entries.view"
  | "journal_entries.create"
  | "journal_entries.edit"
  | "journal_entries.delete"
  | "journal_entries.post"
  | "ledger.view"
  | "accounts.view"
  | "accounts.create"
  | "accounts.edit"
  | "accounts.delete"
  | "reports.view"
  | "settings.manage";

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  superadmin: [
    "users.view",
    "users.create",
    "users.edit",
    "users.delete",
    "roles.view",
    "customers.view",
    "customers.create",
    "customers.edit",
    "customers.delete",
    "vendors.view",
    "vendors.create",
    "vendors.edit",
    "vendors.delete",
    "products.view",
    "products.create",
    "products.edit",
    "products.delete",
    "categories.view",
    "categories.create",
    "categories.edit",
    "categories.delete",
    "warehouses.view",
    "warehouses.create",
    "warehouses.edit",
    "warehouses.delete",
    "inventory_movements.view",
    "inventory_movements.create",
    "journal_entries.view",
    "journal_entries.create",
    "journal_entries.edit",
    "journal_entries.delete",
    "journal_entries.post",
    "ledger.view",
    "accounts.view",
    "accounts.create",
    "accounts.edit",
    "accounts.delete",
    "reports.view",
    "settings.manage",
  ],
  manager: [
    "users.view",
    "roles.view",
    "customers.view",
    "customers.create",
    "customers.edit",
    "customers.delete",
    "vendors.view",
    "vendors.create",
    "vendors.edit",
    "vendors.delete",
    "products.view",
    "products.create",
    "products.edit",
    "products.delete",
    "categories.view",
    "categories.create",
    "categories.edit",
    "categories.delete",
    "warehouses.view",
    "warehouses.create",
    "warehouses.edit",
    "warehouses.delete",
    "inventory_movements.view",
    "inventory_movements.create",
    "journal_entries.view",
    "journal_entries.create",
    "journal_entries.edit",
    "journal_entries.delete",
    "journal_entries.post",
    "ledger.view",
    "accounts.view",
    "accounts.create",
    "accounts.edit",
    "accounts.delete",
    "reports.view",
    "settings.manage",
  ],
  supervisor: [
    "users.view",
    "customers.view",
    "customers.create",
    "customers.edit",
    "vendors.view",
    "vendors.create",
    "vendors.edit",
    "products.view",
    "products.create",
    "products.edit",
    "categories.view",
    "categories.create",
    "categories.edit",
    "warehouses.view",
    "warehouses.create",
    "inventory_movements.view",
    "inventory_movements.create",
    "journal_entries.view",
    "journal_entries.create",
    "journal_entries.edit",
    "journal_entries.post",
    "accounts.view",
    "accounts.create",
    "accounts.edit",
    "reports.view",
  ],
  staff: [
    "users.view",
    "customers.view",
    "vendors.view",
    "products.view",
    "categories.view",
    "warehouses.view",
    "inventory_movements.view",
    "inventory_movements.create",
    "journal_entries.view",
    "journal_entries.create",
    "accounts.view",
  ],
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  superadmin: "Full access to all system features and settings.",
  manager:
    "Can manage all operations (Inventory, General, Accounting) but limited user management.",
  supervisor: "Can create and edit most operational data.",
  staff: "Can view data and create basic entries.",
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
