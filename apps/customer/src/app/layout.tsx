// Trigger Vercel deployment for @hive/customer (Aug 18, 2026 - Checkout Session Auth & Price Sync)
import type { Metadata } from "next";

import { Inter, Outfit, Cormorant_Garamond } from "next/font/google";
import { ConvexClientProvider } from "@/providers/convex-client-provider";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-satoshi", // Reusing the variable or just letting tailwind use sans
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://www.hivenow.in"),
  title: {
    template: "%s | Hive",
    default: "Instant Clothes Delivery in Kochi (1-2 Hours) | Hive",
  },
  description: "Need instant clothes delivery in Kochi? Shop local stores online and get clothes, dresses, and outfits delivered to your door in 1-2 hours across Ernakulam.",
  publisher: "Beelyn LLP",
  icons: {
    icon: "/icon-512x512.png?v=3",
    apple: "/apple-touch-icon.png?v=3",
  },
};

import { Toaster } from "@hive/ui";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { PwaUpdateManager } from "@/components/pwa/PwaUpdateManager";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable} ${cormorant.variable}`} suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#d4af37" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="antialiased min-h-screen bg-white dark:bg-black text-slate-900 dark:text-slate-100 font-sans">
        <ConvexClientProvider>
          <Toaster />
          <CustomerLayout>
            {children}
          </CustomerLayout>
          <div id="modal-root" />
          <InstallPrompt />
          <PwaUpdateManager />
        </ConvexClientProvider>
      </body>
    </html>
  );
}


