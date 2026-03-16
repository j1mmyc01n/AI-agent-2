#!/usr/bin/env node

/**
 * Runs `prisma db push` if a database URL is available.
 * Supports DATABASE_URL, NETLIFY_DATABASE_URL, and NETLIFY_DATABASE_URL_UNPOOLED.
 * Used as part of the build process to keep the database schema in sync with
 * the Prisma schema, including newly-added columns like neonKey and netlifyToken.
 */

const { execSync } = require("child_process");

// Determine database URL - same priority as src/lib/db.ts
const dbUrl =
  process.env.DATABASE_URL ||
  process.env.NETLIFY_DATABASE_URL ||
  process.env.NETLIFY_DATABASE_URL_UNPOOLED;

if (!dbUrl) {
  console.log("⚠️  No database URL found, skipping prisma db push");
  console.log(
    "   Set DATABASE_URL or NETLIFY_DATABASE_URL to enable automatic schema sync"
  );
  process.exit(0);
}

try {
  console.log("🔄 Syncing database schema with prisma db push...");
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
