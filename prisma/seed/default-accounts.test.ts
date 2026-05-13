import { describe, expect, it } from "vitest";
import { DefaultAccountPurpose } from "../generated/prisma/client";
import {
  ALL_REQUIRED_DEFAULT_ACCOUNT_PURPOSES,
  DAILY_REQUIRED_DEFAULT_ACCOUNT_PURPOSES,
  findMissingDefaultAccountPurposes,
} from "./default-accounts";

describe("default account seed requirements", () => {
  it("daily required purposes are subset of enum values", () => {
    const allPurposes = new Set(Object.values(DefaultAccountPurpose));

    for (const purpose of DAILY_REQUIRED_DEFAULT_ACCOUNT_PURPOSES) {
      expect(allPurposes.has(purpose)).toBe(true);
    }
  });

  it("restaurant minimal requires all enum purposes", () => {
    const enumPurposes = Object.values(DefaultAccountPurpose).sort();
    const requiredPurposes = [...ALL_REQUIRED_DEFAULT_ACCOUNT_PURPOSES].sort();

    expect(requiredPurposes).toEqual(enumPurposes);
  });

  it("findMissingDefaultAccountPurposes detects missing values", () => {
    const required = [
      DefaultAccountPurpose.CASH_ON_HAND,
      DefaultAccountPurpose.BANK,
      DefaultAccountPurpose.COGS,
    ];

    const found = [
      DefaultAccountPurpose.CASH_ON_HAND,
      DefaultAccountPurpose.COGS,
    ];

    expect(findMissingDefaultAccountPurposes(required, found)).toEqual([
      DefaultAccountPurpose.BANK,
    ]);
  });
});
