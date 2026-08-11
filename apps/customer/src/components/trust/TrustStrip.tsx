"use client";

import React from "react";

const trustPillars = [
  {
    emoji: "⚡",
    title: "90-Min Delivery",
    subtitle: "Hyperlocal Kochi Dispatch",
  },
  {
    emoji: "✨",
    title: "Curated Designers",
    subtitle: "Verified Independent Labels",
  },
  {
    emoji: "💬",
    title: "Dedicated Support",
    subtitle: "Personal Order Assistance",
  },
  {
    emoji: "🔒",
    title: "100% Safe Payments",
    subtitle: "Instant UPI & Card Checkout",
  },
];

export const TrustStrip: React.FC = () => {
  return (
    <section className="w-full bg-[#FCF9F2] border-y border-[#E8890C]/25 py-5 sm:py-6 my-2 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-5 gap-x-4 sm:gap-6 md:divide-x md:divide-[#E8890C]/20">
          {trustPillars.map((item, idx) => (
            <div
              key={idx}
              className="flex flex-col items-center text-center px-2 sm:px-3 md:first:pl-0 group"
            >
              {/* Premium Emoji Badge Container */}
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-[#F5C22B]/25 to-[#E8890C]/15 border border-[#F5C22B]/40 flex items-center justify-center text-xl flex-shrink-0 shadow-xs mb-2 group-hover:scale-110 transition-transform duration-300">
                <span className="drop-shadow-xs">{item.emoji}</span>
              </div>

              {/* Title */}
              <h3 className="text-xs sm:text-[13.5px] font-extrabold text-[#1A1200] tracking-tight leading-snug group-hover:text-[#E8890C] transition-colors">
                {item.title}
              </h3>

              {/* Subtitle */}
              <p className="text-[10.5px] sm:text-[11.5px] text-[#8C7A5A] font-semibold leading-tight mt-1">
                {item.subtitle}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
