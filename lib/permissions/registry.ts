import { PermissionType } from "./utils";

export const register: PermissionType[] = [
  // Users
  {
    name: "users.create",
    description: "Allows creating new users",
    module: "users",
  },
  {
    name: "users.edit",
    description: "Allows editing of user profiles and related data",
    module: "users",
  },
  {
    name: "users.delete",
    description: "Allows deleting users",
    module: "users",
  },

  // Roles
  {
    name: "roles:create",
    description: "Allows creating new roles",
    module: "roles",
  },
  {
    name: "roles:update",
    description: "Allows updating roles and toggling status",
    module: "roles",
  },
  {
    name: "roles:delete",
    description: "Allows deleting roles",
    module: "roles",
  },

  // Vendors
  {
    name: "vendors.create",
    description: "Allows creating new vendors",
    module: "vendors",
  },
  {
    name: "vendors.edit",
    description: "Allows editing vendor details",
    module: "vendors",
  },
  {
    name: "vendors.delete",
    description: "Allows deleting vendors",
    module: "vendors",
  },

  // Customers
  {
    name: "customers.create",
    description: "Allows creating new customers",
    module: "customers",
  },
  {
    name: "customers.edit",
    description: "Allows editing customer details",
    module: "customers",
  },
  {
    name: "customers.delete",
    description: "Allows deleting customers",
    module: "customers",
  },

  // Warehouses
  {
    name: "warehouses.create",
    description: "Allows creating new warehouses",
    module: "warehouses",
  },
  {
    name: "warehouses.edit",
    description: "Allows editing warehouse details",
    module: "warehouses",
  },
  {
    name: "warehouses.delete",
    description: "Allows deleting warehouses",
    module: "warehouses",
  },

  // Products
  {
    name: "products.create",
    description: "Allows creating new products",
    module: "products",
  },
  {
    name: "products.view",
    description: "Allows viewing product details",
    module: "products",
  },
  {
    name: "products.edit",
    description: "Allows editing product details",
    module: "products",
  },
  {
    name: "products.delete",
    description: "Allows deleting products",
    module: "products",
  },

  // Company Settings
  {
    name: "company.settings",
    description: "Allows managing company settings",
    module: "settings",
  },

  // Categories (Inventory)
  {
    name: "categories.create",
    description: "Allows creating new product categories",
    module: "categories",
  },
  {
    name: "categories.edit",
    description: "Allows editing product categories",
    module: "categories",
  },
  {
    name: "categories.delete",
    description: "Allows deleting product categories",
    module: "categories",
  },

  // Inventory Movements
  {
    name: "inventory_movements.create",
    description:
      "Allows creating inventory movements (IN, OUT, TRANSFER, ADJUSTMENT)",
    module: "inventory",
  },

  // Accounts
  {
    name: "accounts.create",
    description: "Allows creating new chart of accounts",
    module: "accounts",
  },
  {
    name: "accounts.edit",
    description: "Allows editing chart of accounts",
    module: "accounts",
  },
  {
    name: "accounts.delete",
    description: "Allows deleting chart of accounts",
    module: "accounts",
  },

  // Journal Entries
  {
    name: "journal_entries.view",
    description: "Allows viewing journal entries",
    module: "journal_entries",
  },
  {
    name: "journal_entries.create",
    description: "Allows creating new journal entries",
    module: "journal_entries",
  },
  {
    name: "journal_entries.edit",
    description: "Allows editing draft journal entries",
    module: "journal_entries",
  },
  {
    name: "journal_entries.delete",
    description: "Allows deleting draft journal entries",
    module: "journal_entries",
  },
  {
    name: "journal_entries.post",
    description: "Allows posting journal entries",
    module: "journal_entries",
  },

  // Ledger
  {
    name: "ledger.view",
    description: "Allows viewing general ledger",
    module: "ledger",
  },

  // Reports
  {
    name: "reports.view",
    description:
      "Allows viewing financial reports (Trial Balance, P&L, Balance Sheet, etc.)",
    module: "reports",
  },
];
