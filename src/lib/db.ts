import { PrismaClient } from "@prisma/client";

// Detect build phase to skip runtime validation during Next.js static analysis
const isBuild =
  process.env.NEXT_PHASE === "phase-production-build" ||
  process.env.NEXT_PHASE === "phase-export" ||
  process.env.BUILDING === "true";

// Dummy URL used only so Prisma Client can be instantiated during the build
// step when no real database is reachable. Never used for actual queries.
const BUILD_PLACEHOLDER_URL =
  "postgresql://build:placeholder@localhost:5432/db?schema=public";

/**
 * Resolve the database URL from the environment.
 *
 * Priority:
 *  1. DATABASE_URL                     – standard / explicit
 *  2. NETLIFY_DATABASE_URL             – Netlify Neon integration (pooled)
 *  3. NETLIFY_DATABASE_URL_UNPOOLED    – Netlify Neon integration (direct)
 *  4. undefined                        – no database configured
 */
function getDatabaseUrl(): string | undefined {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (process.env.NETLIFY_DATABASE_URL) return process.env.NETLIFY_DATABASE_URL;
  if (process.env.NETLIFY_DATABASE_URL_UNPOOLED)
    return process.env.NETLIFY_DATABASE_URL_UNPOOLED;
  return undefined;
}

const databaseUrl = getDatabaseUrl();

if (!isBuild && !databaseUrl) {
  console.warn("⚠️  WARNING: No database URL configured.");
  console.warn(
    "   Set DATABASE_URL (or NETLIFY_DATABASE_URL) in your environment."
  );
  console.warn(
    "   Format: postgresql://user:password@host:5432/dbname?sslmode=require"
  );
  console.warn(
    "   For Neon: copy the connection string from https://console.neon.tech"
  );
}

// Export so other modules can check before attempting DB operations
export { getDatabaseUrl };

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const resolvedUrl = databaseUrl ?? (isBuild ? BUILD_PLACEHOLDER_URL : undefined);

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasources: resolvedUrl
      ? { db: { url: resolvedUrl } }
      : undefined,
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
