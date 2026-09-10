import type { Metadata } from "next";
import { SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  // The root layout appends " | Hive"; carrying one here doubled it. The openGraph title below
  // keeps the brand, since the template does not reach it.
  title: "Terms & Conditions",
  description:
    "Review the Terms of Service, User Agreement, and Platform Conditions for Hive, operated by Beelyn LLP in Kochi, Kerala.",
  alternates: {
    canonical: `${SITE_URL}/terms`,
  },
  openGraph: {
    title: "Terms & Conditions | Hive",
    description:
      "Review the Terms of Service, User Agreement, and Platform Conditions for Hive, operated by Beelyn LLP in Kochi, Kerala.",
    url: `${SITE_URL}/terms`,
    siteName: "Hive",
    type: "website",
  },
};

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
