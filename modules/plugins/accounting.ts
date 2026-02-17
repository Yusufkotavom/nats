import { Scale } from "lucide-react";
import type { ModulePlugin } from "./types";

export const accountingPlugin: ModulePlugin = {
  id: "accounting",
  navigation: [
    {
      section: "Finance & Accounting",
      items: [
        {
          title: "General Ledger",
          url: "#",
          icon: Scale,
          items: [
            { title: "Dashboard", url: "/accounting/dashboard" },
            { title: "Chart of Accounts", url: "/accounting/accounts" },
            {
              title: "Default Accounts",
              url: "/accounting/configuration/default-accounts",
            },
            { title: "Journal Entries", url: "/accounting/journal-entries" },
            { title: "Account History", url: "/accounting/ledger" },
            { title: "Trial Balance", url: "/accounting/trial-balance" },
            { title: "Reports", url: "/accounting/reports" },
            { title: "Tax Rates", url: "/accounting/configuration/taxes" },
          ],
        },
      ],
    },
  ],
  permissions: [
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
    {
      name: "reports.view",
      description: "Allows viewing financial reports",
      module: "reports",
    },
  ],
};

