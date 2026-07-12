import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexClientProvider } from "@/providers/convex-client-provider";
import { UserSync } from "@/components/auth/UserSync";
import { Inter } from "next/font/google";
import { Toaster } from "@hive/ui";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Hive Marketplace Admin Dashboard",
  description: "HIVE Central Marketplace Source of Truth Admin Panel",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider afterSignOutUrl="/sign-in">
      <html lang="en" className={`${inter.variable}`}>
        <head>
          <link href="https://api.fontshare.com/v2/css?f[]=satoshi@900,700,500,300,400&display=swap" rel="stylesheet" />
        </head>
        <body className="antialiased min-h-screen bg-slate-50 text-slate-900 font-sans">
          <ConvexClientProvider>
            <UserSync />
            {children}
            <Toaster />
            <InstallPrompt />
          </ConvexClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
