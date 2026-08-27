import React from "react";
import { SITE_URL } from "@/lib/seo";

export function OrganizationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Hive",
    legalName: "BEELYN LLP",
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    description: "Your city's premium fashion stores, unified in one place. Shop local, delivered in hours across Kochi.",
    address: {
      "@type": "PostalAddress",
      streetAddress: "55/4379, Door No. 3623, Valanjambalam Junction, Kochi M.G. Road",
      addressLocality: "Ernakulam",
      addressRegion: "Kerala",
      postalCode: "682016",
      addressCountry: "IN",
    },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+917356019103",
      contactType: "customer service",
      email: "support@hivenow.in",
      areaServed: "IN",
      availableLanguage: ["en", "ml"],
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
