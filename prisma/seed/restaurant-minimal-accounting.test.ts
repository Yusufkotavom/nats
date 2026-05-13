import { describe, expect, it } from "vitest";
import { DefaultAccountPurpose } from "../generated/prisma/client";
import {
  RESTAURANT_MINIMAL_ACTIVE_ACCOUNT_CODES,
  RESTAURANT_MINIMAL_DEFAULT_ACCOUNT_CODE_BY_PURPOSE,
} from "./restaurant-minimal-accounting";

describe("restaurant minimal accounting", () => {
  it("maps all default account purposes", () => {
    const mappedPurposes = Object.keys(
      RESTAURANT_MINIMAL_DEFAULT_ACCOUNT_CODE_BY_PURPOSE,
    ).sort();
    const enumPurposes = Object.values(DefaultAccountPurpose).sort();

    expect(mappedPurposes).toEqual(enumPurposes);
  });

  it("keeps all mapped account codes active in minimal mode", () => {
    const activeCodes = new Set(RESTAURANT_MINIMAL_ACTIVE_ACCOUNT_CODES);
    const mappedCodes = Object.values(
      RESTAURANT_MINIMAL_DEFAULT_ACCOUNT_CODE_BY_PURPOSE,
    );

    for (const code of mappedCodes) {
      expect(activeCodes.has(code)).toBe(true);
    }
  });

  it("uses a dedicated GRNI account different from Accounts Payable", () => {
    expect(
      RESTAURANT_MINIMAL_DEFAULT_ACCOUNT_CODE_BY_PURPOSE.ACCOUNTS_PAYABLE,
    ).not.toEqual(
      RESTAURANT_MINIMAL_DEFAULT_ACCOUNT_CODE_BY_PURPOSE.GOODS_RECEIVED_NOT_INVOICED,
    );
  });
});
