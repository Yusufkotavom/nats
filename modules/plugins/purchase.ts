import { ShoppingCart } from "lucide-react";
import type { ModulePlugin } from "./types";

export const purchasePlugin: ModulePlugin = {
  id: "purchase",
  navigation: [
    {
      section: "Operations",
      items: [
        {
          title: "Purchase",
          url: "#",
          icon: ShoppingCart,
          items: [
            { title: "Dashboard", url: "/purchase/dashboard" },
            { title: "Purchase Order", url: "/purchase/orders" },
            { title: "Purchase Invoice", url: "/purchase/invoices" },
            { title: "Receive Items", url: "/purchase/receives" },
            { title: "Purchase Return", url: "/purchase/returns" },
            { title: "Purchase Payments", url: "/purchase/payments" },
          ],
        },
      ],
    },
  ],
  permissions: [
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
  ],
};

