/* eslint-disable @typescript-eslint/no-explicit-any */

import { Prisma, PrismaClient } from "@/prisma/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter, log: ["error", "warn"] });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export function serializePrisma<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Prisma.Decimal) return obj.toNumber() as unknown as T;
  if (obj instanceof Date) return obj.toISOString() as unknown as T;

  if (Array.isArray(obj)) return obj.map(serializePrisma) as unknown as T;

  if (typeof obj === "object") {
    const result: Record<string, any> = {};
    for (const key in obj) {
      if (Object.hasOwn(obj, key)) {
        result[key] = serializePrisma((obj as any)[key]);
      }
    }
    return result as T;
  }

  return obj;
}
