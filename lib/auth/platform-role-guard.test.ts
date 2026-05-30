import { describe, expect, it } from "vitest";
import { canManagePlatformRole, isPlatformRole } from "./platform-role-guard";

describe("platform-role-guard", () => {
  it("detects superadmin as platform role", () => {
    expect(isPlatformRole("superadmin")).toBe(true);
    expect(isPlatformRole("SUPERADMIN")).toBe(true);
    expect(isPlatformRole("company_admin")).toBe(false);
  });

  it("allows only platform superadmin to manage platform role", () => {
    expect(canManagePlatformRole(true, "superadmin")).toBe(true);
    expect(canManagePlatformRole(false, "superadmin")).toBe(false);
    expect(canManagePlatformRole(false, "company_admin")).toBe(true);
  });
});
