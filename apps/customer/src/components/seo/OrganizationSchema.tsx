import React from "react";
import { SITE_URL } from "@/lib/seo";

export function OrganizationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Hive",
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    description: "Your city's premium fashion stores, unified in one place. Shop local, delivered in hours.",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Ernakulam",
      addressRegion: "Kerala",
      addressCountry: "IN",
    },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+91-0000000000", // Replace with actual number
      contactType: "customer service",
      email: "support@hivenow.in",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
