import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { PrismaClient } from "./generated/client";

type GlobalPgCache = typeof globalThis & {
  ratatouillePgPool?: Pool;
  ratatouillePrisma?: PrismaClient;
};

const cache = globalThis as GlobalPgCache;

/** Makes libpq-compat SSL warning explicit (`pg` ≥9): `prefer`/`require`/`verify-ca` were aliases for `verify-full`. */
function postgresUrlPreferVerifyFullSsl(connectionString: string): string {
  try {
    const modesRemappedBeforePg9 = new Set(["prefer", "require", "verify-ca"]);
    const parsed = new URL(connectionString);
    const sslmode = parsed.searchParams.get("sslmode");
    if (sslmode != null && modesRemappedBeforePg9.has(sslmode)) {
      parsed.searchParams.set("sslmode", "verify-full");
    }
    return parsed.toString();
  } catch {
    return connectionString;
  }
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  const poolUrl = postgresUrlPreferVerifyFullSsl(connectionString);
  const pool = cache.ratatouillePgPool ?? new Pool({ connectionString: poolUrl });
  if (process.env.NODE_ENV !== "production") {
    cache.ratatouillePgPool = pool;
  }
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

/** Prisma Client (v7 `@prisma/adapter-pg` + pooled `DATABASE_URL`; one Pool per Node process in dev). */
export const prisma = cache.ratatouillePrisma ?? createPrismaClient();
if (process.env.NODE_ENV !== "production") {
  cache.ratatouillePrisma = prisma;
}

/** Re-export for SQL tagged templates etc. (`import type { Prisma } from "@prisma/client"` migration). */
export { Prisma } from "./generated/client";
