import { Users, UserRound, Mail, Phone, Calendar } from "lucide-react";
import type { ModulePlugin } from "./types";

export const crmPlugin: ModulePlugin = {
  id: "crm",
  navigation: [
    {
      section: "Operations",
      items: [
        {
          title: "Navigation.crm",
          url: "#",
          icon: Users,
          items: [
            { title: "CRM.dashboard", url: "/crm" },
            { title: "CRM.leads", url: "/crm/leads" },
            { title: "CRM.contacts", url: "/crm/contacts" },
            { title: "CRM.activities", url: "/crm/activities" },
            { title: "CRM.opportunities", url: "/crm/opportunities" },
            { title: "CRM.campaigns", url: "/crm/campaigns" },
          ],
        },
      ],
    },
  ],
  permissions: [
    {
      name: "crm.view",
      description: "Allows viewing CRM module",
      module: "crm",
    },
    {
      name: "crm.create",
      description: "Allows creating CRM records",
      module: "crm",
    },
    {
      name: "crm.edit",
      description: "Allows editing CRM records",
      module: "crm",
    },
    {
      name: "crm.delete",
      description: "Allows deleting CRM records",
      module: "crm",
    },
    {
      name: "crm.communicate",
      description: "Allows sending communications to contacts",
      module: "crm",
    },
  ],
};