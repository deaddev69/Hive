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
    default: "Fashion Delivered in Hours | Hive Kochi",
  },
  description: "Why wait days? Shop fashion online and get your next outfit delivered in hours across Kochi. Experience a faster, more convenient way to shop with Hive.",
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
        <link rel="preconnect" href="https://api.fontshare.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://cdn.fontshare.com" crossOrigin="anonymous" />
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


