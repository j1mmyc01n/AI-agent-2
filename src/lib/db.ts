import { PrismaClient } from "@prisma/client";

// Only validate DATABASE_URL at runtime, not during build
const isBuild = process.env.NEXT_PHASE === "phase-production-build";

// For build time, use a dummy URL if not provided
const databaseUrl = process.env.DATABASE_URL ||
  (isBuild ? "postgresql://user:password@localhost:5432/db?schema=public" : undefined);

if (!isBuild && !databaseUrl) {
  console.warn("⚠️ WARNING: DATABASE_URL environment variable is not set!");
  console.warn("The app will not function properly without a database.");
  console.warn("Please set DATABASE_URL in Netlify UI or .env.local");
  console.warn("Example: postgresql://user:password@host:5432/database?schema=public");
}

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
