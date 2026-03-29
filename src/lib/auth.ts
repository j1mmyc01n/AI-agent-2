import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { createHash } from "crypto";
import bcryptjs from "bcryptjs";
import { db, getDatabaseUrl } from "@/lib/db";

// Only validate environment variables at runtime, not during build
const isBuild = process.env.NEXT_PHASE === "phase-production-build";

/**
 * Derive a stable NEXTAUTH_SECRET from available Netlify environment variables.
 * This ensures auth works even when NEXTAUTH_SECRET is not explicitly set,
 * by generating a deterministic secret from the site's unique identifiers.
 */
function getNextAuthSecret(): string | undefined {
  if (process.env.NEXTAUTH_SECRET) {
    return process.env.NEXTAUTH_SECRET;
  }

  if (process.env.NODE_ENV === "development" || (!isBuild && !process.env.NODE_ENV)) {
    return "development-secret-change-in-production-min-32-chars-long";
  }

  // Derive a stable secret from Netlify environment variables
  const siteId = process.env.SITE_ID;
  const dbUrl = getDatabaseUrl();
  if (siteId) {
    const seed = `nextauth-secret-${siteId}-${dbUrl || "no-db"}`;
    return createHash("sha256").update(seed).digest("hex");
  }

  return undefined;
}

const nextAuthSecret = getNextAuthSecret();

if (!isBuild && !nextAuthSecret) {
  console.warn("⚠️ WARNING: NEXTAUTH_SECRET could not be determined.");
  console.warn("Set NEXTAUTH_SECRET in your Netlify environment variables.");
  console.warn("Generate one with: openssl rand -base64 32");
}

/**
 * Auto-detect the site URL from Netlify environment variables.
 * Priority: NEXTAUTH_URL > URL > DEPLOY_PRIME_URL > DEPLOY_URL
 */
function getNextAuthUrl(): string | undefined {
  return (
    process.env.NEXTAUTH_URL ||
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL ||
    process.env.DEPLOY_URL
  );
}

const nextAuthUrl = getNextAuthUrl();

// Set NEXTAUTH_URL in the environment so NextAuth can pick it up
if (nextAuthUrl && !process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = nextAuthUrl;
}

export const authOptions: NextAuthOptions = {
  // Only use PrismaAdapter if database URL is configured (including Netlify variables)
  adapter: getDatabaseUrl() ? (PrismaAdapter(db) as NextAuthOptions["adapter"]) : undefined,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  secret: nextAuthSecret,
  providers: [
    // Only include GitHub provider if credentials are configured
    ...(process.env.GITHUB_ID && process.env.GITHUB_SECRET
      ? [
          GitHubProvider({
            clientId: process.env.GITHUB_ID,
            clientSecret: process.env.GITHUB_SECRET,
          }),
        ]
      : []),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password required");
        }

        // Normalize email for consistent comparison
        const normalizedEmail = credentials.email.trim().toLowerCase();

        // Test admin fallback for development when database is not configured
        if (!getDatabaseUrl()) {
          const testAdminEmail = "admin@test.com";
          const testAdminPassword = "admin123456";

          if (normalizedEmail === testAdminEmail && credentials.password === testAdminPassword) {
            console.log("✅ Test admin login successful (no database required)");
            return {
              id: "test-admin-id",
              email: testAdminEmail,
              name: "Test Admin",
              image: null,
            };
          }

          throw new Error("Database is not configured. Use test admin credentials: admin@test.com / admin123456");
        }

        try {
          // Use normalized email for lookup
          const user = await db.user.findUnique({
            where: { email: normalizedEmail },
          });

          if (!user || !user.password) {
            throw new Error("No user found with this email");
          }

          const isPasswordValid = await bcryptjs.compare(
            credentials.password,
            user.password
          );

          if (!isPasswordValid) {
            throw new Error("Invalid password");
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          };
        } catch (error) {
          console.error("Auth error:", error);

          // Re-throw known, user-safe errors directly
          if (error instanceof Error) {
            const msg = error.message;
            if (
              msg === "No user found with this email" ||
              msg === "Invalid password" ||
              msg === "Email and password required"
            ) {
              throw error;
            }
            // Translate DB / connection errors into a safe message
            if (
              msg.includes("Can't reach database") ||
              msg.includes("ECONNREFUSED") ||
              msg.includes("connect ETIMEDOUT") ||
              msg.includes("P1001") || // Prisma: cannot reach server
              msg.includes("P1008") || // Prisma: operations timed out
              msg.includes("environment variable not found") ||
              msg.includes("datasource") ||
              msg.includes("prisma")
            ) {
              throw new Error(
                "Unable to connect to the database. Please try again or contact support."
              );
            }
          }
          throw new Error("Authentication failed. Please try again.");
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as { id?: string }).id = token.id as string;
      }
      return session;
    },
  },
};
