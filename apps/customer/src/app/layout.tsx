import type { Metadata } from "next";
import { Manrope, Inter, Playfair_Display } from "next/font/google";
import { ConvexClientProvider } from "@/providers/convex-client-provider";
import { ClerkProvider } from "@clerk/nextjs";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-manrope",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hive by TailorBee — Boutique Fashion, Delivered Today",
  description: "Experience hyperlocal boutique fashion delivered to your doorstep in hours. Curated designs from India's finest boutiques.",
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
      <html lang="en" className={`${manrope.variable} ${inter.variable} ${playfair.variable}`} suppressHydrationWarning>
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


