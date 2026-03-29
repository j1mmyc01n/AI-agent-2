#!/usr/bin/env node

/**
 * Runs `prisma db push` if a database URL is available.
 * Supports DATABASE_URL, NETLIFY_DATABASE_URL, and NETLIFY_DATABASE_URL_UNPOOLED.
 *
 * For Neon with connection pooling (PgBouncer), use DIRECT_URL (or
 * NETLIFY_DATABASE_URL_UNPOOLED) for the push so it bypasses the pool.
 * Regular queries still use the pooled DATABASE_URL at runtime.
 *
 * Used as part of the build process to keep the database schema in sync with
 * the Prisma schema.
 */

const { execSync } = require("child_process");

// Determine which URL to use for the schema push.
// Prefer unpooled / direct connection for migrations (avoids PgBouncer issues).
const directUrl =
  process.env.DIRECT_URL ||
  process.env.NETLIFY_DATABASE_URL_UNPOOLED;

const pooledUrl =
  process.env.DATABASE_URL ||
  process.env.NETLIFY_DATABASE_URL;

const dbUrl = directUrl || pooledUrl;

if (!dbUrl) {
  console.log("⚠️  No database URL found, skipping prisma db push");
  console.log(
    "   Set DATABASE_URL or NETLIFY_DATABASE_URL to enable automatic schema sync"
  );
  process.exit(0);
}

try {
  console.log("🔄 Syncing database schema with prisma db push...");
  if (directUrl) {
    console.log("   Using direct/unpooled connection for schema push");
  }
  execSync("npx prisma db push --skip-generate", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: dbUrl },
  });
  console.log("✅ Database schema synced successfully");
} catch (error) {
  console.error("❌ prisma db push failed:", error.message);
  // Exit with error so the deployment fails loudly rather than silently
  process.exit(1);
}
