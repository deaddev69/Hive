"use client";

import React, { useEffect, useRef } from "react";
import { MapPin, Truck, Heart, ShieldCheck, RefreshCw, Award, Headphones } from "lucide-react";

const trustItems = [
  {
    number: "01",
    title: "Discover Fashion Near You",
    description: "Shop from independent designers and local labels in your city instead of waiting days for warehouse shipping.",
    icon: MapPin,
  },
  {
    number: "02",
    title: "Delivered In Hours",
    description: "Your order is picked up directly from the local partner store and delivered to your doorstep within hours.",
    icon: Truck,
  },
  {
    number: "03",
    title: "Exclusive Local Collections",
    description: "Discover unique designs and labels you won't find on national marketplaces.",
    icon: Heart,
  },
];

export const TrustStrip: React.FC = () => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const isMobile = () => window.innerWidth < 768;
    let isPaused = false;
    let pauseTimeout: NodeJS.Timeout | null = null;
    let index = 0;

    const interval = setInterval(() => {
      if (isPaused || !isMobile()) return;

      index = (index + 1) % trustItems.length;
      const children = el.children;
      if (children && children[index]) {
        const child = children[index] as HTMLElement;
        el.scrollTo({
          left: child.offsetLeft - (el.offsetWidth - child.offsetWidth) / 2,
          behavior: "smooth"
        });
      }
    }, 4000);

    const handleScroll = () => {
      if (!isMobile()) return;
      const scrollLeft = el.scrollLeft;
      const children = el.children;
      if (children && children.length > 0) {
        const viewportCenter = scrollLeft + el.offsetWidth / 2;
        let closestIndex = 0;
        let minDiff = Infinity;
        for (let i = 0; i < children.length; i++) {
          const child = children[i] as HTMLElement;
          const childCenter = child.offsetLeft + child.offsetWidth / 2;
          const diff = Math.abs(viewportCenter - childCenter);
          if (diff < minDiff) {
            minDiff = diff;
            closestIndex = i;
          }
        }
        index = closestIndex;
      }
    };

    const handleTouchStart = () => {
      isPaused = true;
      if (pauseTimeout) clearTimeout(pauseTimeout);
    };

    const handleTouchEnd = () => {
      if (pauseTimeout) clearTimeout(pauseTimeout);
      pauseTimeout = setTimeout(() => {
        isPaused = false;
      }, 5000);
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      clearInterval(interval);
      if (pauseTimeout) clearTimeout(pauseTimeout);
      if (el) {
        el.removeEventListener("scroll", handleScroll);
        el.removeEventListener("touchstart", handleTouchStart);
        el.removeEventListener("touchend", handleTouchEnd);
      }
    };
  }, []);

  return (
    <section className="relative overflow-hidden bg-[#FAF6F0] py-8 md:py-16 lg:py-20 w-full">
      {/* Local custom style to guarantee scrollbar hiding across platforms */}
      <style dangerouslySetInnerHTML={{__html: `
        .no-scrollbar::-webkit-scrollbar {
          display: none !important;
        }
        .no-scrollbar {
          -ms-overflow-style: none !important;  /* IE/Edge */
          scrollbar-width: none !important;  /* Firefox */
        }
      `}} />

      <div className="max-w-[1440px] mx-auto w-full">
        {/* Section Header */}
        <div className="flex flex-col items-center justify-center text-center max-w-xl mx-auto mb-6 md:mb-16 px-6">
          <span className="text-[9px] md:text-[10px] font-bold text-hive-gold tracking-[0.25em] uppercase">
            THE HIVE DIFFERENCE
          </span>
          <div className="w-8 h-[1px] bg-hive-gold/60 my-2 md:my-3.5 mx-auto" />
          <h2 className="text-xl sm:text-3xl md:text-4xl font-normal font-serif text-hive-dark leading-tight">
            Why Shop on Hive
          </h2>
          <p className="text-[10px] sm:text-xs md:text-sm text-stone-500 font-medium mt-1 leading-relaxed">
            Hyperlocal fashion. Real people. <span className="italic">Real fast.</span>
          </p>

          {/* Double-Barred Serif H Monogram */}
          <svg className="w-6 h-6 md:w-8 md:h-8 text-hive-gold mx-auto mt-3.5 md:mt-6" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M32 25 H44 M56 25 H68 M32 75 H44 M56 75 H68 M38 25 V75 M62 25 V75 M38 43 H62 M38 57 H62" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" />
          </svg>
        </div>

        {/* 3 Columns Swipeable Slider (Mobile) / Grid (Desktop) */}
        <div 
          ref={scrollRef}
          className="flex md:grid md:grid-cols-3 overflow-x-auto md:overflow-visible snap-x border-t border-b border-stone-200/50 bg-transparent divide-x divide-stone-200/50 px-6 md:px-0 no-scrollbar"
        >
          {trustItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="flex-shrink-0 w-[275px] sm:w-[320px] md:w-auto snap-center flex flex-col items-center text-center pt-5 pb-5 px-4 md:px-6 lg:px-10 h-full group bg-transparent">
                {/* Circle Icon Container */}
                <div className="w-9 h-9 md:w-14 md:h-14 rounded-full border border-stone-300 flex items-center justify-center text-hive-gold bg-transparent group-hover:scale-105 transition-transform duration-300">
                  <Icon className="w-4.5 h-4.5 md:w-5 md:h-5 stroke-[1.8]" />
                </div>

                {/* Number */}
                <span className="text-[9px] md:text-[10px] font-bold tracking-[0.2em] text-hive-gold mt-2.5 md:mt-5 mb-1 md:mb-1.5 select-none">
                  {item.number}
                </span>

                {/* Card Title */}
                <h3 className="text-sm md:text-xl lg:text-2xl font-normal font-serif text-hive-dark mt-0.5 md:mt-1 mb-1 md:mb-2.5">
                  {item.title}
                </h3>

                {/* Card Divider */}
                <div className="w-4 h-[1px] md:w-5 md:h-[1.5px] bg-hive-gold/70 mx-auto mb-2.5 md:mb-4" />

                {/* Description */}
                <p className="text-[10.5px] md:text-xs lg:text-[13px] text-stone-600 dark:text-neutral-400 leading-relaxed font-medium max-w-xs mx-auto">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Understated Trust Footer Strip */}
        <div className="mt-10 md:mt-16 border-t border-b border-stone-200/50 bg-[#FAF8F5]/20 py-6 md:py-8 px-6 w-full">
          <div className="max-w-6xl mx-auto flex flex-row items-stretch justify-between md:grid md:grid-cols-3 gap-x-2 md:gap-x-0">
            {[
              {
                title: "Secure Payments",
                subtitle: "100% secure checkout",
                icon: ShieldCheck,
              },
              {
                title: "Verified Designers",
                subtitle: "Curated with care",
                icon: Award,
              },
              {
                title: "Local Support",
                subtitle: "We're here to help",
                icon: Headphones,
              },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div 
                  key={idx} 
                  className="flex flex-col items-center justify-start text-center flex-1 md:flex-row md:items-center md:justify-start md:text-left gap-1 md:gap-3.5 pl-0 md:pl-8 border-l-0 md:border-l border-stone-200/50 first:border-l-0 first:pl-0"
                >
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-hive-gold bg-hive-gold/5 flex-shrink-0 mb-1 md:mb-0">
                    <Icon className="w-4.5 h-4.5 md:w-5 md:h-5 stroke-[1.5]" />
                  </div>
                  <div className="flex flex-col items-center md:items-start">
                    <span className="text-[9.5px] sm:text-[10.5px] md:text-xs font-bold text-hive-dark leading-tight">
                      {item.title}
                    </span>
                    <span className="text-[8px] md:text-[10px] text-stone-500 font-medium mt-0.5 leading-none">
                      {item.subtitle}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
