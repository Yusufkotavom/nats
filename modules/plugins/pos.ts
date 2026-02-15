import { StoreIcon } from "lucide-react";
import type { ModulePlugin } from "./types";

export const posPlugin: ModulePlugin = {
  id: "pos",
  navigation: [
    {
      section: "Operations",
      items: [
        {
          title: "Point of Sale",
          url: "/pos",
          icon: StoreIcon,
          items: [
            { title: "Terminal", url: "/pos" },
            { title: "Sessions", url: "/pos/sessions" },
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

