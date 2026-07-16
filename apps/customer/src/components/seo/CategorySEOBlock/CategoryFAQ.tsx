import React from "react";
import { FAQ } from "@/lib/content/categoryContent";

export function CategoryFAQ({ faqs }: { faqs: FAQ[] }) {
  if (!faqs || faqs.length === 0) return null;

  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <div className="mb-12">
      <h2 className="text-2xl font-serif font-bold text-hive-dark mb-6">Frequently Asked Questions</h2>
      <div className="space-y-4">
        {faqs.map((faq, index) => (
          <details key={index} className="group bg-white border border-hive-border/40 rounded-xl overflow-hidden [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex items-center justify-between cursor-pointer p-5 text-stone-800 font-semibold text-sm transition-colors hover:bg-slate-50">
              {faq.question}
              <span className="ml-4 flex-shrink-0 transition-transform duration-300 group-open:-rotate-180">
                <svg className="w-5 h-5 text-hive-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </summary>
            <div className="px-5 pb-5 pt-1 text-sm text-hive-text-muted leading-relaxed">
              {faq.answer}
            </div>
          </details>
        ))}
      </div>
      
      {/* FAQPage JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
    </div>
  );
}
