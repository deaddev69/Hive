import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ConvexClientProvider } from "@/providers/convex-client-provider";
import { ClerkProvider } from "@clerk/nextjs";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hive by TailorBee — Boutique Fashion, Delivered Today",
  description: "Experience hyperlocal boutique fashion delivered to your doorstep in hours. Curated designs from India's finest boutiques.",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

import { Toaster } from "@hive/ui";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      localization={{
        signIn: {
          start: {
            title: "Welcome back",
            subtitle: "Secure sign in with Google or email",
          },
        },
        signUp: {
          start: {
            title: "Create Account",
            subtitle: "Secure sign up with Google or email",
          },
        },
        formButtonPrimary: "Continue",
      }}
    >
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
          </ConvexClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}


