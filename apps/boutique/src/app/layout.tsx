import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexClientProvider } from "@/providers/convex-client-provider";
import { UserSync } from "@/components/auth/UserSync";
import { Inter, Outfit } from "next/font/google";
import { Toaster } from "@hive/ui";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-satoshi",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hive Marketplace Admin Dashboard",
  description: "HIVE Central Marketplace Source of Truth Admin Panel",
  icons: {
    icon: "/logo.png?v=2",
    apple: "/apple-touch-icon.png?v=2",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider afterSignOutUrl="/sign-in">
      <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
        <head>
          <meta name="theme-color" content="#F5C22B" />
          <meta name="apple-mobile-web-app-status-bar-style" content="default" />
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
