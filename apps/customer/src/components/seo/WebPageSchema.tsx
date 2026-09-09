import React from "react";
import { SITE_URL } from "@/lib/seo";

export function WebPageSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${SITE_URL}/#webpage`,
    url: SITE_URL,
    name: "Shop Fashion in Kochi & Ernakulam | Delivered in 90 Minutes | Hive",
    description:
      "Discover fashion from brands, designers and fashion stores across Kochi & Ernakulam. Shop kurtis, dresses, shirts, jeans, footwear, accessories and more, delivered in 90 minutes.",
    isPartOf: {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "Hive",
    },
    about: {
      "@type": "Organization",
      name: "Hive",
      url: SITE_URL,
    },
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: [".sr-only", "title"],
    },
    inLanguage: "en-IN",
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: SITE_URL,
        },
      ],
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
