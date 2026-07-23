import React from "react";

export function FaqSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Can I get clothes delivered in 1-2 hours in Kochi?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, Hive provides instant clothes delivery in 1-2 hours in Kochi. You can shop from your favorite local boutiques in Ernakulam and get outfits delivered to your doorstep express."
        }
      },
      {
        "@type": "Question",
        "name": "Which is the fastest clothes delivery app in Kochi?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Hive is the fastest clothes delivery app in Kochi, offering delivery of outfits, dresses, and clothes in just 1-2 hours across Ernakulam and Kakkanad."
        }
      }
    ]
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
