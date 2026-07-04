import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexClientProvider } from "@/providers/convex-client-provider";
import { UserSync } from "@/components/auth/UserSync";
import { Manrope } from "next/font/google";
import { Toaster } from "@hive/ui";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
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
    <ClerkProvider afterSignOutUrl="http://localhost:3000/">
      <html lang="en">
        <body className={`${manrope.variable} antialiased min-h-screen bg-slate-50 text-slate-900 font-sans`}>
          <ConvexClientProvider>
            <UserSync />
            {children}
            <Toaster />
          </ConvexClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
