import { Rocket } from "lucide-react";
import type { ModulePlugin } from "./types";

export const salesPlugin: ModulePlugin = {
  id: "sales",
  navigation: [
    {
      section: "Operations",
      items: [
        {
          title: "Sales",
          url: "#",
          icon: Rocket,
          items: [
            { title: "Dashboard", url: "/sales/dashboard" },
            { title: "Sales Order", url: "/sales/orders" },
            { title: "Sales Invoice", url: "/sales/invoices" },
            { title: "Sales Return", url: "/sales/returns" },
            { title: "Sales Shipments", url: "/sales/shipments" },
            { title: "Sales Payments", url: "/sales/payments" },
          ],
        },
      ],
    },
  ],
  permissions: [
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
  ],
};

