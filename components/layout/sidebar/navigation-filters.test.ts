import { describe, expect, it } from "vitest";
import { filterAdministrationNavigation } from "./navigation-filters";

describe("filterAdministrationNavigation", () => {
  const items = [
    { title: "Company.settings", url: "/admin/settings" },
    { title: "Company.departments", url: "/general/departments" },
    { title: "Company.projects", url: "/general/projects" },
    { title: "Admin.companies", url: "/admin/companies" },
  ];

  it("hides departments/projects when dimensions are disabled", () => {
    const filtered = filterAdministrationNavigation(items, {
      isPlatformSuperAdmin: true,
      enableDepartmentDimension: false,
      enableProjectDimension: false,
    });

    expect(filtered.map((item) => item.url)).toEqual([
      "/admin/settings",
      "/admin/companies",
    ]);
  });

  it("hides admin companies when user is not platform super admin", () => {
    const filtered = filterAdministrationNavigation(items, {
      isPlatformSuperAdmin: false,
      enableDepartmentDimension: true,
      enableProjectDimension: true,
    });

    expect(filtered.map((item) => item.url)).toEqual([
      "/admin/settings",
      "/general/departments",
      "/general/projects",
    ]);
  });
});
