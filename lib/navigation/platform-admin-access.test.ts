import { describe, expect, it } from "vitest";
import { canAccessAdminPath, isPlatformOnlyAdminPath } from "./platform-admin-access";

describe("platform admin access", () => {
  it("marks platform-only admin routes correctly", () => {
    expect(isPlatformOnlyAdminPath("/platform/companies")).toBe(true);
    expect(isPlatformOnlyAdminPath("/platform/integrations/outbox")).toBe(true);
    expect(isPlatformOnlyAdminPath("/platform/settings/ai")).toBe(true);
    expect(isPlatformOnlyAdminPath("/admin/settings")).toBe(false);
    expect(isPlatformOnlyAdminPath("/admin/users")).toBe(false);
  });

  it("blocks non-platform users from platform-only routes", () => {
    expect(canAccessAdminPath("/platform/companies", false)).toBe(false);
    expect(canAccessAdminPath("/platform/settings/ai", false)).toBe(false);
    expect(canAccessAdminPath("/admin/users", false)).toBe(true);
    expect(canAccessAdminPath("/admin/settings", false)).toBe(true);
  });
});
