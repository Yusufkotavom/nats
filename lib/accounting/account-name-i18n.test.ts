import { describe, expect, it } from "vitest";
import {
  formatLocalizedAccountLabel,
  getLocalizedAccountName,
  resolveAccountLocale,
} from "./account-name-i18n";

describe("account-name-i18n", () => {
  it("uses Indonesian for known account codes when locale is id", () => {
    expect(
      getLocalizedAccountName({
        code: "11200",
        name: "Accounts Receivable",
        locale: "id",
      }),
    ).toBe("Piutang Usaha");
  });

  it("uses English for non-id locales", () => {
    expect(
      getLocalizedAccountName({
        code: "11200",
        name: "Piutang Usaha",
        locale: "en",
      }),
    ).toBe("Accounts Receivable");
  });

  it("falls back to provided name for unknown account code", () => {
    expect(
      getLocalizedAccountName({
        code: "99999",
        name: "Custom Account Name",
        locale: "id",
      }),
    ).toBe("Custom Account Name");
  });

  it("formats account label with localized name", () => {
    expect(
      formatLocalizedAccountLabel(
        { code: "11120", name: "Petty Cash" },
        "id-ID",
      ),
    ).toBe("11120 - Kas Kecil");
  });

  it("defaults locale to English when missing", () => {
    expect(resolveAccountLocale(undefined)).toBe("en");
  });
});
