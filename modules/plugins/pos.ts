import { StoreIcon } from "lucide-react";
import type { ModulePlugin } from "./types";

export const posPlugin: ModulePlugin = {
  id: "pos",
  navigation: [
    {
      section: "Operations",
      items: [
        {
          title: "Navigation.pos",
          url: "#",
          icon: StoreIcon,
          items: [
            { title: "POS.cashier", url: "/pos" },
            { title: "POS.sessions", url: "/pos/sessions" },
            { title: "POS.dining_spots", url: "/pos/dining-spots" },
            { title: "POS.restaurant_floor", url: "/pos/restaurant" },
            { title: "POS.restaurant_kitchen", url: "/pos/restaurant/kitchen" },
            { title: "POS.restaurant_billing", url: "/pos/restaurant/billing" },
          ],
        },
      ],
    },
  ],
  permissions: [
    {
      name: "pos.access",
      description: "Allows access to POS module",
      module: "pos",
    },
  ],
};
