import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcryptjs from "bcryptjs";
import { db, getDatabaseUrl } from "@/lib/db";
import crypto from "crypto";

// Only validate environment variables at runtime, not during build
const isBuild = process.env.NEXT_PHASE === "phase-production-build";

// Auto-detect NEXTAUTH_URL from Netlify's URL env var if not explicitly set
if (!process.env.NEXTAUTH_URL && process.env.URL) {
  process.env.NEXTAUTH_URL = process.env.URL;
}

// Provide development fallback for NEXTAUTH_SECRET if not set
// In production on Netlify, generate a deterministic secret from available stable values
function getNextAuthSecret(): string | undefined {
  if (process.env.NEXTAUTH_SECRET) {
    return process.env.NEXTAUTH_SECRET;
  }

  if (process.env.NODE_ENV === "development") {
    return "development-secret-change-in-production-min-32-chars-long";
  }

  // In production, generate a deterministic secret from stable Netlify env vars
  // This ensures the secret is consistent across function invocations
  const siteId = process.env.NETLIFY_SITE_ID || process.env.SITE_ID;
  const dbUrl = getDatabaseUrl();
  if (siteId || dbUrl) {
    const seed = `nextauth-secret-${siteId || ""}-${dbUrl || ""}`;
    return crypto.createHash("sha256").update(seed).digest("base64");
  }

  return undefined;
}

const nextAuthSecret = getNextAuthSecret();

if (!isBuild && !process.env.NEXTAUTH_SECRET) {
  if (process.env.NODE_ENV === "production") {
    console.error("❌ ERROR: NEXTAUTH_SECRET environment variable is not set!");
    console.error("Authentication will NOT work without it.");
    console.error("Generate one with: openssl rand -base64 32");
    console.error("Add it to your Netlify environment variables!");
  } else {
    console.warn("⚠️ WARNING: NEXTAUTH_SECRET not set, using development fallback.");
    console.warn("Generate a proper secret with: openssl rand -base64 32");
  }
}

// Warn if NEXTAUTH_URL is missing in production but don't throw
if (!isBuild && process.env.NODE_ENV === "production" && !process.env.NEXTAUTH_URL) {
  console.warn("⚠️ WARNING: NEXTAUTH_URL environment variable is not set!");
  console.warn("OAuth redirects may not work correctly.");
  console.warn("Set it to your Netlify site URL (e.g., https://dobetteragent2.netlify.app)");
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
          if (error instanceof Error) {
            // Check for database connection errors and provide a clear message
            if (error.message.includes("Can't reach database") ||
                error.message.includes("connection") ||
                error.message.includes("ECONNREFUSED") ||
                error.message.includes("connect ETIMEDOUT")) {
              throw new Error("Unable to connect to the database. Please try again later.");
            }
            throw error;
          }
          throw new Error("Authentication failed. Please check your database configuration.");
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
