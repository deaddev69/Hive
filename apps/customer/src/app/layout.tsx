import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexClientProvider } from "@/providers/convex-client-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hive by TailorBee — Boutique Fashion, Delivered Today",
  description: "Experience hyperlocal boutique fashion delivered to your doorstep in hours. Curated designs from India's finest boutiques.",
};

import { CustomerLayout } from "@/components/layout/CustomerLayout";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
        <body className="antialiased min-h-screen bg-white dark:bg-black text-slate-900 dark:text-slate-100">
          <ConvexClientProvider>
            <CustomerLayout>
              {children}
            </CustomerLayout>
          </ConvexClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}

