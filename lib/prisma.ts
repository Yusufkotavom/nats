import { Prisma, PrismaClient } from "@/prisma/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const runtimeEnv = process.env.NODE_ENV ?? "development";

const resolvedConnectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING ||
  "";

function getConnectionString() {
  if (resolvedConnectionString) {
    return resolvedConnectionString;
  }

  // Keep tests import-safe: many tests mock Prisma calls and should not crash on module load.
  if (runtimeEnv === "test") {
    return "postgresql://postgres:postgres@127.0.0.1:5432/postgres";
  }

  throw new Error("Missing database connection string in environment variables");
}

const adapter = new PrismaPg({ connectionString: getConnectionString() });

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
