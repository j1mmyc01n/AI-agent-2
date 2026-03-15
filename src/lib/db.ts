import { PrismaClient } from "@prisma/client";

// Only validate DATABASE_URL at runtime, not during build
const isRuntime = typeof window === "undefined" && process.env.NODE_ENV !== "production";
const isBuild = process.env.NEXT_PHASE === "phase-production-build";

if (!isBuild) {
  // Validate DATABASE_URL is set at runtime
  if (!process.env.DATABASE_URL) {
    console.error("❌ ERROR: DATABASE_URL environment variable is not set!");
    console.error("Please set DATABASE_URL in Netlify UI (Site Settings > Environment Variables)");
    console.error("Example: postgresql://user:password@host:5432/database?schema=public");
    throw new Error("DATABASE_URL is required but not configured");
  }

  // Validate it's not the dummy build-time URL (only in production)
  if (process.env.NODE_ENV === "production" && process.env.DATABASE_URL.includes("localhost:5432")) {
    console.error("❌ ERROR: DATABASE_URL is still set to the dummy build-time value!");
    console.error("Please set the real DATABASE_URL in Netlify UI (Site Settings > Environment Variables)");
    throw new Error("DATABASE_URL must point to a real PostgreSQL database, not localhost");
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
