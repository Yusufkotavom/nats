import { WrenchIcon } from "lucide-react";
import type { ModulePlugin } from "./types";

export const servicesPlugin: ModulePlugin = {
  id: "services",
  navigation: [
    {
      section: "Operations",
      items: [
        {
          title: "Navigation.services",
          url: "#",
          icon: WrenchIcon,
          items: [
            { title: "Services.orders", url: "/services/orders" },
            { title: "Services.invoices", url: "/services/invoices" },
            { title: "Services.payments", url: "/services/payments" },
            { title: "Services.returns_warranty", url: "/services/returns-warranty" },
          ],
        },
      ],
    },
  ],
  permissions: [
    {
      name: "pos.access",
      description: "Allows access to services module",
      module: "services",
    },
  ],
};
