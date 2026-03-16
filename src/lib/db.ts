import { PrismaClient } from "@prisma/client";

// Only validate DATABASE_URL at runtime, not during build
const isBuild = process.env.NEXT_PHASE === "phase-production-build";

/**
 * Get database URL from environment variables.
 * Supports Netlify Neon integration which sets NETLIFY_DATABASE_URL.
 * Priority: DATABASE_URL > NETLIFY_DATABASE_URL > NETLIFY_DATABASE_URL_UNPOOLED
 */
function getDatabaseUrl(): string | undefined {
  // Check standard DATABASE_URL first
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  // Check Netlify Neon integration variables
  // Use pooled connection (better for serverless)
  if (process.env.NETLIFY_DATABASE_URL) {
    return process.env.NETLIFY_DATABASE_URL;
  }

  // Fall back to unpooled if pooled is not available
  if (process.env.NETLIFY_DATABASE_URL_UNPOOLED) {
    return process.env.NETLIFY_DATABASE_URL_UNPOOLED;
  }

  // For build time, use a dummy URL if not provided
  if (isBuild) {
    return "postgresql://user:password@localhost:5432/db?schema=public";
  }

  return undefined;
}

const databaseUrl = getDatabaseUrl();

// Ensure DATABASE_URL is set in process.env for Prisma internals
// (Netlify Neon integration only sets NETLIFY_DATABASE_URL)
if (databaseUrl && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = databaseUrl;
}

// Also set DIRECT_URL for Prisma migrations if unpooled URL is available
if (!process.env.DIRECT_URL && process.env.NETLIFY_DATABASE_URL_UNPOOLED) {
  process.env.DIRECT_URL = process.env.NETLIFY_DATABASE_URL_UNPOOLED;
}

if (!isBuild && !databaseUrl) {
  console.warn("⚠️ WARNING: No database URL found!");
  console.warn("The app will not function properly without a database.");
  console.warn("Please set one of these environment variables in Netlify UI or .env.local:");
  console.warn("  - DATABASE_URL (standard)");
  console.warn("  - NETLIFY_DATABASE_URL (Netlify Neon integration - pooled)");
  console.warn("  - NETLIFY_DATABASE_URL_UNPOOLED (Netlify Neon integration - unpooled)");
  console.warn("Example: postgresql://user:password@host:5432/database?schema=public");
}

// Export the function for use in other modules
export { getDatabaseUrl };

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    // Use the database URL or a dummy one for build
    datasources: databaseUrl ? {
      db: {
        url: databaseUrl
      }
    } : undefined,
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
