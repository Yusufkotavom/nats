import { Building } from "lucide-react";
import type { ModulePlugin } from "./types";

export const assetsPlugin: ModulePlugin = {
  id: "assets",
  navigation: [
    {
      section: "Finance & Accounting",
      items: [
        {
          title: "Fixed Assets",
          url: "/assets",
          icon: Building,
          items: [
            { title: "Asset List", url: "/assets" },
            { title: "Depreciation Run", url: "/assets/depreciation" },
            { title: "Asset Categories", url: "/assets/categories" },
          ],
        },
      ],
    },
  ],
  permissions: [
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
  ],
};

