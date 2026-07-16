import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ConvexClientProvider } from "@/providers/convex-client-provider";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://hivenow.in"),
  title: {
    template: "%s | Hive",
    default: "Hive | Premium Fashion Delivery in Ernakulam",
  },
  description: "Your city's premium fashion stores, unified in one place. Shop local, delivered in hours.",
  icons: {
    icon: "/logo.png",
    apple: "/apple-touch-icon.png?v=2",
  },
};

import { Toaster } from "@hive/ui";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable}`} suppressHydrationWarning>
      <head>
        <link href="https://api.fontshare.com/v2/css?f[]=satoshi@900,700,500,300,400&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased min-h-screen bg-white dark:bg-black text-slate-900 dark:text-slate-100 font-sans">
        <ConvexClientProvider>
          <Toaster />
          <CustomerLayout>
            {children}
          </CustomerLayout>
          <div id="modal-root" />
          <InstallPrompt />
        </ConvexClientProvider>
      </body>
    </html>
  );
}


