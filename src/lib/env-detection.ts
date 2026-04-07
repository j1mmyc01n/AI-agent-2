/**
 * Shared environment detection utilities.
 * These check platform-level env vars set automatically by hosting providers.
 */

/** True when running inside a Netlify environment (deploy or local dev with Netlify CLI). */
export function detectNetlifyEnv(): boolean {
  return !!(process.env.NETLIFY || process.env.NETLIFY_SITE_ID);
}

/** True when a Neon PostgreSQL URL is detected in the environment. */
export function detectNeonEnv(): boolean {
  const urls = [
    process.env.NETLIFY_DATABASE_URL,
    process.env.DATABASE_URL,
    process.env.NEON_DATABASE_URL,
  ];
  return urls.some(url => url?.includes(".neon.tech"));
}
