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

  // Purchasing
  {
    name: "purchase.view",
    description: "Allows viewing purchase module",
    module: "purchase",
  },
  {
    name: "purchase.create",
    description: "Allows creating purchase records",
    module: "purchase",
  },
  {
    name: "purchase.payments",
    description: "Allows managing purchase payments",
    module: "purchase",
  },
  {
    name: "purchase.edit",
    description: "Allows editing purchase records",
    module: "purchase",
  },
  {
    name: "purchase.delete",
    description: "Allows deleting purchase records",
    module: "purchase",
  },

  // Sales
  {
    name: "sales.view",
    description: "Allows viewing sales module",
    module: "sales",
  },
  {
    name: "sales.create",
    description: "Allows creating sales records",
    module: "sales",
  },
  {
    name: "sales.payments",
    description: "Allows managing sales payments",
    module: "sales",
  },
  {
    name: "sales.edit",
    description: "Allows editing sales records",
    module: "sales",
  },
  {
    name: "sales.delete",
    description: "Allows deleting sales records",
    module: "sales",
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

  // Inventory
  {
    name: "inventory.view",
    description: "Allows viewing inventory levels and movements",
    module: "inventory",
  },
  {
    name: "inventory_movements.create",
    description:
      "Allows creating inventory movements (IN, OUT, TRANSFER, ADJUSTMENT)",
    module: "inventory",
  },

  // Accounts
  {
    name: "accounts.view",
    description: "Allows viewing chart of accounts",
    module: "accounts",
  },
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
    module: "accounting",
  },
  {
    name: "journal_entries.create",
    description: "Allows creating journal entries",
    module: "accounting",
  },

  // Assets
  {
    name: "assets.view",
    description: "Allows viewing assets",
    module: "assets",
  },
  {
    name: "assets.create",
    description: "Allows creating assets",
    module: "assets",
  },
  {
    name: "assets.edit",
    description: "Allows editing assets",
    module: "assets",
  },
  {
    name: "assets.delete",
    description: "Allows deleting assets",
    module: "assets",
  },

  // Cash & Bank
  {
    name: "cash_bank.view",
    description: "Allows viewing cash and bank transactions",
    module: "cash_bank",
  },
  {
    name: "cash_bank.create",
    description: "Allows creating cash and bank transactions",
    module: "cash_bank",
  },
  {
    name: "cash_bank.edit",
    description: "Allows editing cash and bank transactions",
    module: "cash_bank",
  },
  {
    name: "cash_bank.delete",
    description: "Allows deleting cash and bank transactions",
    module: "cash_bank",
  },

  // Reports
  {
    name: "reports.view",
    description: "Allows viewing financial reports",
    module: "reports",
  },

  // Files
  {
    name: "files.upload",
    description: "Allows uploading files",
    module: "files",
  },
  {
    name: "files.delete",
    description: "Allows deleting files",
    module: "files",
  },
];
