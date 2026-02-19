import { Building2Icon, CogIcon, LayoutDashboard, Shield } from "lucide-react";
import type { ModulePlugin } from "./types";

export const adminPlugin: ModulePlugin = {
  id: "admin",
  navigation: [
    {
      section: "Administration",
      items: [
        {
          title: "Company",
          url: "#",
          icon: Building2Icon,
          items: [
            { title: "Company Settings", url: "/admin/settings" },
            { title: "Contacts", url: "/general/contacts" },
            { title: "Departments", url: "/general/departments" },
            { title: "Projects", url: "/general/projects" },
            { title: "User Management", url: "/admin/users" },
            { title: "Role Definitions", url: "/admin/roles" }],
        },
        {
          title: "Navigation.admin",
          url: "#",
          icon: Shield,
          items: [
            { title: "Admin.users", url: "/admin/users" },
            { title: "Admin.roles", url: "/admin/roles" },
            { title: "Admin.settings", url: "/admin/settings" },
          ],
        },
        {
          title: "System",
          url: "#",
          icon: CogIcon,
          items: [
            { title: "File Manager", url: "/general/files" },
            { title: "AI Configuration", url: "/admin/settings/ai" },
            { title: "Events Dashboard", url: "/admin/dashboard" },
            { title: "Integration Outbox", url: "/admin/integrations/outbox" },
          ],
        },
      ],
    },
  ],
  permissions: [
    {
      name: "users.create",
      description: "Allows creating new users",
      module: "users",
    },
    {
      name: "users.edit",
      description: "Allows editing of user profiles and related data",
      module: "users",
    },
    {
      name: "users.delete",
      description: "Allows deleting users",
      module: "users",
    },
    {
      name: "roles:create",
      description: "Allows creating new roles",
      module: "roles",
    },
    {
      name: "roles:update",
      description: "Allows updating roles and toggling status",
      module: "roles",
    },
    {
      name: "roles:delete",
      description: "Allows deleting roles",
      module: "roles",
    },
    {
      name: "vendors.create",
      description: "Allows creating new vendors",
      module: "vendors",
    },
    {
      name: "vendors.edit",
      description: "Allows editing vendor details",
      module: "vendors",
    },
    {
      name: "vendors.delete",
      description: "Allows deleting vendors",
      module: "vendors",
    },
    {
      name: "customers.create",
      description: "Allows creating new customers",
      module: "customers",
    },
    {
      name: "customers.edit",
      description: "Allows editing customer details",
      module: "customers",
    },
    {
      name: "customers.delete",
      description: "Allows deleting customers",
      module: "customers",
    },
    {
      name: "company.settings",
      description: "Allows managing company settings",
      module: "settings",
    },
    {
      name: "integrations.outbox.view",
      description: "Allows viewing integration outbox events",
      module: "integrations",
    },
    {
      name: "integrations.outbox.retry",
      description: "Allows requeueing integration outbox events",
      module: "integrations",
    },
    {
      name: "integrations.outbox.dispatch",
      description: "Allows dispatching integration outbox events",
      module: "integrations",
    },
    {
      name: "files.upload",
      description: "Allows uploading files",
      module: "files",
    },
    {
      name: "files.delete",
      description: "Allows deleting files",
      module: "files",
    },
  ],
};
