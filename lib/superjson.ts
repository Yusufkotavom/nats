import { Decimal } from "decimal.js";
import SuperJSON from "superjson";

SuperJSON.registerCustom<Decimal, string>(
  {
    isApplicable: (v): v is Decimal => Decimal.isDecimal(v),
    serialize: (v) => v.toJSON(),
    deserialize: (v) => new Decimal(v),
  },
  "decimal.js",
);

export { SuperJSON };
export const serialize = SuperJSON.serialize;
export const deserialize = SuperJSON.deserialize;
export const stringify = SuperJSON.stringify;
export const parse = SuperJSON.parse;
