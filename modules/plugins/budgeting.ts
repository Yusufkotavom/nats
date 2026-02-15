import { PieChart } from "lucide-react";
import type { ModulePlugin } from "./types";

export const budgetingPlugin: ModulePlugin = {
  id: "budgeting",
  navigation: [
    {
      section: "Finance & Accounting",
      items: [
        {
          title: "Budgeting",
          url: "#",
          icon: PieChart,
          items: [
            { title: "Dashboard", url: "/budgeting" },
            { title: "All Budgets", url: "/budgeting/budgets" },
          ],
        },
      ],
    },
  ],
};

