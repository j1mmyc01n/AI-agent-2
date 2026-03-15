import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure server components work properly in Netlify
  experimental: {
    serverActions: {
      allowedOrigins: ["*.netlify.app", "localhost:3000"],
    },
  },
};

export default nextConfig;
