import { Landmark } from "lucide-react";
import type { ModulePlugin } from "./types";

export const cashBankPlugin: ModulePlugin = {
  id: "cash-bank",
  navigation: [
    {
      section: "Finance & Accounting",
      items: [
        {
          title: "Cash & Bank",
          url: "/cash-bank",
          icon: Landmark,
          items: [
            { title: "Overview", url: "/cash-bank" },
            { title: "Cash In & Out", url: "/cash-bank/transaction" },
            { title: "Internal Transfers", url: "/cash-bank/transfer" },
          ],
        },
      ],
    },
  ],
  permissions: [
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
  ],
};

