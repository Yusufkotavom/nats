import { BoxIcon } from "lucide-react";
import type { ModulePlugin } from "./types";

export const inventoryPlugin: ModulePlugin = {
  id: "inventory",
  navigation: [
    {
      section: "Operations",
      items: [
        {
          title: "Inventory",
          url: "#",
          icon: BoxIcon,
          items: [
            { title: "Overview", url: "/inventory" },
            { title: "Products List", url: "/inventory/products" },
            { title: "Pricing and Discount", url: "/inventory/pricing" },
            { title: "Locations/Warehouses", url: "/inventory/warehouses" },
            { title: "Stock Movements", url: "/inventory/movements" },
            { title: "Product Categories", url: "/inventory/categories" },
            { title: "Products Units (UOM)", url: "/inventory/uom" },
          ],
        },
      ],
    },
  ],
  permissions: [
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
    {
      name: "products.view",
      description: "Allows viewing product details",
      module: "products",
    },
    {
      name: "products.create",
      description: "Allows creating new products",
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
  ],
};

