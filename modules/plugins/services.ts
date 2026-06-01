import type { ModulePlugin } from "./types";

export const servicesPlugin: ModulePlugin = {
  id: "services",
  navigation: [],
  permissions: [
    {
      name: "pos.access",
      description: "Allows access to services module",
      module: "services",
    },
  ],
};
