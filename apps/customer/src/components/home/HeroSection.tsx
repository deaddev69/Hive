import React from "react";
import Link from "next/link";
import { ShoppingBag, ArrowRight, MapPin, Truck, ShieldCheck, Star } from "lucide-react";

export interface HeroStatItem {
  value: string;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
}

const defaultStats: HeroStatItem[] = [
  {
    value: "120+",
    label: "Products",
    sublabel: "Curated unique pieces",
    icon: <ShoppingBag className="w-4 h-4 text-hive-gold" />,
  },
  {
    value: "6",
    label: "Boutiques",
    sublabel: "Partnered local designers",
    icon: <Star className="w-4 h-4 text-hive-gold" />,
  },
  {
    value: "4",
    label: "Zones",
    sublabel: "Active delivery areas",
    icon: <MapPin className="w-4 h-4 text-hive-gold" />,
  },
  {
    value: "Same Day",
    label: "Delivery",
    sublabel: "Within hours of ordering",
    icon: <Truck className="w-4 h-4 text-hive-gold" />,
  },
];

export const HeroSection: React.FC = () => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#FFFDF5] via-white to-[#FFFDF5] border-b border-hive-border/60 py-16 lg:py-24 w-full">
      {/* Background Honeycomb SVG */}
      <div className="absolute inset-0 -z-10 pointer-events-none opacity-40">
        <svg className="w-full h-full stroke-hive-gold/10" aria-hidden="true">
          <defs>
            <pattern id="hero-honeycomb" patternUnits="userSpaceOnUse" width="52" height="90">
              <path fill="none" strokeWidth="1" d="m0,15 26-15 26,15v30l-26,15-26-15z M26,60v30" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hero-honeycomb)" />
        </svg>
      </div>

      {/* Floating Glowing Decorative Circles */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-hive-gold/10 rounded-full blur-3xl -z-10 animate-pulse" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-hive-comb/20 rounded-full blur-3xl -z-10" />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Text & CTAs */}
          <div className="lg:col-span-7 flex flex-col text-left items-start gap-6 lg:pr-8">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-hive-amber bg-hive-comb/40 border border-hive-border/50 uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-hive-amber animate-pulse" />
              HYPERLOCAL BOUTIQUE MARKETPLACE
            </span>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold font-serif text-hive-dark tracking-tight leading-[1.15]">
              Boutique Fashion.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-hive-amber to-hive-gold">
                Delivered Today.
              </span>
            </h1>

            <p className="text-base md:text-lg text-hive-text-muted font-sans max-w-xl leading-relaxed">
              Discover unique pieces from local designers near you. Experience the charm of curated boutique clothing delivered straight to your doorstep on the exact same day.
            </p>

            <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-4 mt-2">
              <Link
                href="/collections"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl text-sm font-bold uppercase tracking-widest text-hive-dark bg-hive-gold hover:bg-hive-amber shadow-md shadow-hive-gold/25 hover:shadow-lg hover:shadow-hive-gold/35 hover:-translate-y-0.5 transition-all duration-300 group w-full sm:w-auto"
              >
                Explore Collections
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/collections"
                className="inline-flex items-center justify-center px-7 py-3.5 rounded-2xl text-sm font-bold text-hive-text border border-hive-border/60 bg-white hover:bg-hive-cream/35 transition-all duration-300 w-full sm:w-auto"
              >
                Become a Boutique Partner
              </Link>
            </div>
          </div>

          {/* Right Column: Premium Visual Glassmorphism Panel */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end w-full">
            <div className="relative w-full max-w-md p-8 rounded-3xl backdrop-blur-md bg-white/60 border border-hive-border/50 shadow-xl shadow-hive-dark/5 hover:shadow-2xl hover:shadow-hive-gold/5 transition-all duration-500 group overflow-hidden">
              {/* Inner subtle glow */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-hive-gold/15 rounded-full blur-2xl -z-10 group-hover:bg-hive-gold/25 transition-colors duration-500" />
              
              <div className="flex flex-col gap-6 text-left">
                <div className="flex justify-between items-center pb-4 border-b border-hive-border/40">
                  <div className="flex flex-col">
                    <span className="text-xs uppercase tracking-wider text-hive-text-muted font-bold">Featured Partner</span>
                    <span className="text-lg font-serif font-bold text-hive-dark mt-0.5">Le Petit Atelier</span>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                    <ShieldCheck className="w-3.5 h-3.5" /> Verified
                  </span>
                </div>

                {/* Display an abstract visual design representation of fashion */}
                <div className="relative aspect-[4/3] rounded-2xl bg-gradient-to-br from-hive-comb/50 to-hive-cream border border-hive-border/30 overflow-hidden flex items-center justify-center p-6 shadow-inner">
                  <div className="absolute w-28 h-28 border border-hive-gold/20 rounded-full animate-spin [animation-duration:20s]" />
                  <div className="absolute w-20 h-20 border border-dashed border-hive-amber/35 rounded-full animate-spin [animation-duration:15s] [animation-direction:reverse]" />
                  
                  <div className="z-10 flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center text-hive-amber border border-hive-border/40">
                      <ShoppingBag className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold tracking-widest text-hive-amber uppercase mt-1">Curated Couture</span>
                    <span className="text-[10px] text-hive-text-muted text-center max-w-[160px]">Ready for dispatch in Delhi-NCR</span>
                  </div>
                </div>

                {/* Delivery Indicator */}
                <div className="flex items-start gap-3.5 bg-white/80 border border-hive-border/30 rounded-2xl p-4 shadow-sm">
                  <div className="p-2.5 rounded-xl bg-hive-comb/40 border border-hive-border/40 text-hive-amber">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-sm font-bold text-hive-dark">Hyperlocal Speed Delivery</span>
                    <span className="text-xs text-hive-text-muted mt-0.5">Hand-delivered to your doorstep in 3-4 hours</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Strip */}
        <div className="mt-16 lg:mt-24 pt-8 lg:pt-12 border-t border-hive-border/60">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {defaultStats.map((stat, idx) => (
              <div 
                key={idx}
                className="flex items-start gap-4 p-4 rounded-2xl border border-transparent hover:border-hive-border/40 hover:bg-white/40 hover:shadow-sm transition-all duration-300 group"
              >
                <div className="p-3 rounded-xl bg-hive-comb/20 border border-hive-border/30 group-hover:bg-hive-comb/40 group-hover:border-hive-gold/30 transition-colors duration-300">
                  {stat.icon}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-2xl md:text-3xl font-serif font-extrabold text-hive-dark group-hover:text-hive-amber transition-colors duration-300">
                    {stat.value}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-hive-text-muted mt-0.5">
                    {stat.label}
                  </span>
                  {stat.sublabel && (
                    <span className="text-[10px] text-hive-text-muted/80 font-sans mt-0.5">
                      {stat.sublabel}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
