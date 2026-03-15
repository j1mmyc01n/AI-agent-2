import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcryptjs from "bcryptjs";
import { db } from "@/lib/db";

// Only validate environment variables at runtime, not during build
const isBuild = process.env.NEXT_PHASE === "phase-production-build";

if (!isBuild) {
  // Validate NEXTAUTH_SECRET is set
  if (!process.env.NEXTAUTH_SECRET) {
    console.error("❌ ERROR: NEXTAUTH_SECRET environment variable is not set!");
    console.error("Generate one with: openssl rand -base64 32");
    console.error("Then set it in Netlify UI (Site Settings > Environment Variables)");
    throw new Error("NEXTAUTH_SECRET is required but not configured");
  }

  // Validate NEXTAUTH_URL is set in production
  if (process.env.NODE_ENV === "production" && !process.env.NEXTAUTH_URL) {
    console.error("❌ ERROR: NEXTAUTH_URL environment variable is not set!");
    console.error("Set it to your Netlify site URL (e.g., https://dobetteragent2.netlify.app)");
    throw new Error("NEXTAUTH_URL is required in production");
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as NextAuthOptions["adapter"],
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
