import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "DoBetter Viber - AI Agent Workspace",
  description:
    "AI agent workspace for builders. Chat with AI, generate code, manage tasks, and preview results. Powered by GPT-4, Claude, and Grok.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="font-sans antialiased overscroll-none">
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
