import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcryptjs from "bcryptjs";
import { db } from "@/lib/db";

// Only validate environment variables at runtime, not during build
const isBuild = process.env.NEXT_PHASE === "phase-production-build";

// Warn if NEXTAUTH_SECRET is missing but don't throw
if (!isBuild && !process.env.NEXTAUTH_SECRET) {
  console.warn("⚠️ WARNING: NEXTAUTH_SECRET environment variable is not set!");
  console.warn("Authentication will not work properly without it.");
  console.warn("Generate one with: openssl rand -base64 32");
}

// Warn if NEXTAUTH_URL is missing in production but don't throw
if (!isBuild && process.env.NODE_ENV === "production" && !process.env.NEXTAUTH_URL) {
  console.warn("⚠️ WARNING: NEXTAUTH_URL environment variable is not set!");
  console.warn("OAuth redirects may not work correctly.");
  console.warn("Set it to your Netlify site URL (e.g., https://dobetteragent2.netlify.app)");
}

export const authOptions: NextAuthOptions = {
  // Only use PrismaAdapter if DATABASE_URL is configured
  adapter: process.env.DATABASE_URL ? (PrismaAdapter(db) as NextAuthOptions["adapter"]) : undefined,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
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

        // Test admin fallback for development when database is not configured
        if (!process.env.DATABASE_URL) {
          const testAdminEmail = "admin@test.com";
          const testAdminPassword = "admin123456";

          if (credentials.email === testAdminEmail && credentials.password === testAdminPassword) {
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
          const user = await db.user.findUnique({
            where: { email: credentials.email },
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
