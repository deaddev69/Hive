import React from "react";
import { SITE_URL } from "@/lib/seo";

export function LocalBusinessSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "Hive Fashion Delivery",
    image: `${SITE_URL}/logo.png`,
    "@id": SITE_URL,
    url: SITE_URL,
    telephone: "+91-0000000000",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Ernakulam",
      addressRegion: "Kerala",
      addressCountry: "IN",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 9.9816, // Ernakulam approx
      longitude: 76.2999,
    },
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      opens: "09:00",
      closes: "22:00",
    },
    priceRange: "$$",
    description: "Premium fashion delivery service across Ernakulam, partnering with top local boutiques.",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
