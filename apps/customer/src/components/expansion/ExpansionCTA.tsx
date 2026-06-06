import React from "react";
import { MapPin } from "lucide-react";
import { ExpansionForm } from "./ExpansionForm";

/* ── Launch Zones ── */
const currentZones = ["Kakkanad", "Cherthala", "Aluva", "Edappally"];

/* ── Roadmap steps ── */
const roadmapSteps = [
  { label: "Current", detail: "Active zones", isCurrent: true },
  { label: "Ernakulam", detail: "Full district", isCurrent: false },
  { label: "Kochi Metro", detail: "Entire metro", isCurrent: false },
  { label: "Kerala Expansion", detail: "All major cities", isCurrent: false },
];

export const ExpansionCTA: React.FC = () => {
  return (
    <section className="relative w-full overflow-hidden py-20 lg:py-28">
      {/* ── Layered Background ── */}
      {/* Gold-to-cream gradient base */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#F5A623]/12 via-[#FFFDF5] to-[#FFF3CC]/40 -z-20" />

      {/* Honeycomb SVG tile — subtle, restrained */}
      <div className="absolute inset-0 -z-10 pointer-events-none opacity-[0.08]">
        <svg className="w-full h-full" aria-hidden="true">
          <defs>
            <pattern
              id="expansion-honeycomb"
              patternUnits="userSpaceOnUse"
              width="60"
              height="104"
            >
              <path
                fill="none"
                stroke="#F5A623"
                strokeWidth="1.5"
                d="m0,17.3 30-17.3 30,17.3v34.6l-30,17.3-30-17.3z M30,69.3v34.6"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#expansion-honeycomb)" />
        </svg>
      </div>

      {/* Ambient glow blobs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-hive-gold/8 blur-[100px] -z-10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-hive-comb/30 blur-[80px] -z-10 pointer-events-none" />

      {/* ── Content ── */}
      <div className="max-w-[1440px] mx-auto px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">

          {/* ── Left Column: Copy + Zones + Roadmap ── */}
          <div className="lg:col-span-6 xl:col-span-7 flex flex-col gap-10 text-left">

            {/* Eyebrow */}
            <div className="flex flex-col gap-5">
              <span className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full text-[10px] font-extrabold text-hive-amber bg-hive-gold/10 border border-hive-gold/25 uppercase tracking-[0.2em]">
                <span className="w-1.5 h-1.5 rounded-full bg-hive-gold animate-pulse" />
                EXPANDING ACROSS KERALA
              </span>

              {/* Headline */}
              <div className="flex flex-col gap-3">
                <h2 className="text-4xl md:text-5xl lg:text-[52px] font-serif font-extrabold text-hive-dark tracking-tight leading-[1.1]">
                  We&apos;re Not{" "}
                  <span className="relative inline-block">
                    Everywhere Yet.
                    {/* Underline accent */}
                    <span className="absolute -bottom-1 left-0 right-0 h-[3px] bg-gradient-to-r from-hive-gold to-hive-amber/60 rounded-full" />
                  </span>
                </h2>
                <p className="text-base md:text-lg text-hive-text-muted leading-relaxed max-w-lg font-sans">
                  Hive is expanding city by city. Join the waitlist and we&apos;ll let you
                  know when boutique fashion delivery arrives in your area.
                </p>
              </div>
            </div>

            {/* ── Current Service Areas ── */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-hive-amber flex-shrink-0" />
                <span className="text-xs font-extrabold text-hive-dark/70 uppercase tracking-widest">
                  Currently Live In
                </span>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {currentZones.map((zone) => (
                  <span
                    key={zone}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full
                               text-xs font-bold text-hive-amber
                               bg-hive-gold/10 border border-hive-gold/30
                               hover:bg-hive-gold/20 hover:border-hive-gold/50
                               transition-all duration-200 select-none cursor-default"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-hive-gold" />
                    {zone}
                  </span>
                ))}
              </div>
            </div>

            {/* ── Roadmap Timeline ── */}
            <div className="flex flex-col gap-1">
              <span className="text-xs font-extrabold text-hive-dark/70 uppercase tracking-widest mb-3">
                Growth Roadmap
              </span>
              <div className="flex flex-col gap-0">
                {roadmapSteps.map((step, idx) => {
                  const isLast = idx === roadmapSteps.length - 1;
                  return (
                    <div key={step.label} className="flex items-stretch gap-4">
                      {/* Track */}
                      <div className="flex flex-col items-center flex-shrink-0 w-5">
                        {/* Node dot */}
                        <div
                          className={cn(
                            "w-3 h-3 rounded-full mt-1 flex-shrink-0 z-10",
                            step.isCurrent
                              ? "bg-hive-gold border-2 border-hive-amber shadow-md shadow-hive-gold/30"
                              : "bg-hive-border border-2 border-hive-border/80"
                          )}
                        />
                        {/* Connector line */}
                        {!isLast && (
                          <div
                            className={cn(
                              "w-px flex-1 mt-1 mb-0 min-h-[28px]",
                              step.isCurrent ? "bg-gradient-to-b from-hive-gold to-hive-border" : "bg-hive-border/70"
                            )}
                          />
                        )}
                      </div>

                      {/* Step content */}
                      <div
                        className={cn(
                          "flex flex-col pb-6",
                          isLast && "pb-0"
                        )}
                      >
                        <span
                          className={cn(
                            "text-sm font-bold leading-tight",
                            step.isCurrent ? "text-hive-amber" : "text-hive-dark/70"
                          )}
                        >
                          {step.label}
                          {step.isCurrent && (
                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-hive-gold/20 text-hive-amber uppercase tracking-wider">
                              Live
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-hive-text-muted mt-0.5">{step.detail}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Right Column: Waitlist Card ── */}
          <div className="lg:col-span-6 xl:col-span-5 flex justify-center lg:justify-end w-full">
            <div className="relative w-full max-w-[440px]">
              {/* Outer glow ring */}
              <div className="absolute -inset-[1px] rounded-[36px] bg-gradient-to-br from-hive-gold/30 via-hive-amber/10 to-hive-comb/50 blur-sm -z-10" />

              {/* Card surface */}
              <div className="relative bg-white/90 backdrop-blur-xl rounded-[34px] border border-hive-border/60 shadow-2xl shadow-hive-dark/8 overflow-hidden p-8 flex flex-col gap-7">
                {/* Card inner glow */}
                <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-hive-gold/8 blur-2xl pointer-events-none" />

                {/* Card header */}
                <div className="flex flex-col gap-2 text-left relative z-10">
                  <div className="flex items-center gap-2 mb-1">
                    {/* Geometric honeycomb icon */}
                    <svg
                      viewBox="0 0 32 32"
                      className="w-7 h-7 text-hive-gold"
                      aria-hidden="true"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path d="M16 3 L27 9 L27 21 L16 27 L5 21 L5 9 Z" />
                      <path d="M16 9 L22 12.5 L22 19.5 L16 23 L10 19.5 L10 12.5 Z" strokeWidth="1" />
                    </svg>
                    <span className="text-[10px] font-extrabold text-hive-amber uppercase tracking-[0.2em]">
                      Hive Waitlist
                    </span>
                  </div>
                  <h3 className="text-xl font-serif font-extrabold text-hive-dark leading-snug">
                    Get Early Access.
                  </h3>
                  <p className="text-xs text-hive-text-muted leading-relaxed">
                    Be the first to know when hyperlocal boutique delivery reaches your city.
                  </p>
                </div>

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-hive-border to-transparent" />

                {/* Form */}
                <div className="relative z-10">
                  <ExpansionForm />
                </div>

                {/* Social proof footnote */}
                <div className="flex items-center gap-2 pt-1 border-t border-hive-border/40">
                  <div className="flex -space-x-2">
                    {["MA", "TL", "SF"].map((initials) => (
                      <div
                        key={initials}
                        className="w-6 h-6 rounded-full bg-hive-comb border-2 border-white flex items-center justify-center text-[8px] font-extrabold text-hive-amber"
                      >
                        {initials}
                      </div>
                    ))}
                  </div>
                  <span className="text-[10px] text-hive-text-muted leading-tight">
                    <strong className="text-hive-dark font-bold">340+ people</strong> already on the list
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

/* tiny inline cn helper (avoids importing @hive/ui at top level if tree-shaking differs) */
function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
