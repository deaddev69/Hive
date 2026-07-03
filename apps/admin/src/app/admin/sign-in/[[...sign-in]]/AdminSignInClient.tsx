"use client";

import React, { useState, useEffect } from "react";
import { SignIn } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import Image from "next/image";

export default function AdminSignInClient() {
  const [currentPath, setCurrentPath] = useState<string>("/admin/sign-in");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentPath(window.location.pathname);
      setMounted(true);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#23201D] flex flex-col md:flex-row relative overflow-hidden font-sans">
      {/* Glow Effects on the right side */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#C59A5B]/5 rounded-full blur-[150px] pointer-events-none animate-pulse duration-[8000ms]" />
      <div className="absolute bottom-[-10%] right-[10%] w-[400px] h-[400px] bg-[#C59A5B]/3 rounded-full blur-[150px] pointer-events-none" />

      {/* Left side: Premium Dark Cover & Branding (No image) */}
      <div className="hidden md:flex md:w-1/2 relative bg-[#1B1917] overflow-hidden border-r border-[#3E3833]/40">
        {/* Soft, rich espresso gradient background */}
        <div className="absolute inset-0 bg-gradient-to-tr from-[#1B1917] via-[#23201D] to-[#2B2622]" />
        
        {/* Additional decorative soft gold ambient glow on the left */}
        <div className="absolute top-[20%] left-[-10%] w-[450px] h-[450px] bg-[#C59A5B]/4 rounded-full blur-[120px] pointer-events-none" />

        {/* Editorial overlay content */}
        <div className="relative z-10 flex flex-col justify-between p-16 w-full h-full text-left">
          {/* Top Branding Logo */}
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Hive Logo"
              width={140}
              height={55}
              priority
              className="h-10 w-auto object-contain"
            />
            <span className="text-[9px] font-extrabold uppercase tracking-[0.3em] text-[#C59A5B] bg-[#C59A5B]/10 px-3 py-1 rounded-full border border-[#C59A5B]/20 backdrop-blur-md">
              OPERATIONS
            </span>
          </div>

          {/* Bottom Editorial Copy */}
          <div className="space-y-5 max-w-lg">
            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#C59A5B]/80 block">
              SECURE ACCESS GATEWAY
            </span>
            <h1 className="text-4xl lg:text-5xl font-serif text-white font-black leading-tight tracking-tight">
              The Source of Truth <br />
              <span className="text-[#C59A5B] italic font-normal">for Luxury Retail</span> Operations.
            </h1>
            <p className="text-sm text-[#8E867C] font-semibold leading-relaxed max-w-md">
              Internal Operations Console. Access is restricted to authorized personnel. Session activities, transactions, and system logs are monitored and audited continuously.
            </p>
            
            {/* Compliance & Security Checklist */}
            <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 pt-3.5 max-w-md text-left font-sans select-none border-t border-[#3E3833]/40">
              <div className="flex items-center gap-2">
                <span className="text-[#C59A5B] text-xs font-bold">✓</span>
                <span className="text-xs text-[#8E867C] font-bold">Encrypted Session</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#C59A5B] text-xs font-bold">✓</span>
                <span className="text-xs text-[#8E867C] font-bold">Full Audit Logging</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#C59A5B] text-xs font-bold">✓</span>
                <span className="text-xs text-[#8E867C] font-bold">IP Restrictions</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#C59A5B] text-xs font-bold">✓</span>
                <span className="text-xs text-[#8E867C] font-bold">MFA Required</span>
              </div>
            </div>
            
            <div className="h-0.5 w-16 bg-[#C59A5B]/40 mt-1" />
          </div>

          {/* Footer of Left Side */}
          <div className="text-[10px] text-[#7E766C] tracking-wider uppercase font-semibold">
            &copy; {new Date().getFullYear()} Hive Fashion Marketplace. All rights reserved.
          </div>
        </div>
      </div>

      {/* Right side: Clerk Card Container */}
      <div className="w-full md:w-1/2 flex flex-col justify-center items-center py-12 px-6 sm:px-12 lg:px-20 z-10 min-h-screen md:min-h-0">
        <div className="w-full max-w-[420px] space-y-6 flex flex-col items-center">
          
          {/* Mobile Only Header Logo */}
          <div className="flex md:hidden flex-col items-center gap-3 text-center mb-6">
            <Image
              src="/logo.png"
              alt="Hive Logo"
              width={150}
              height={60}
              priority
              className="h-12 w-auto object-contain"
            />
            <span className="text-[9px] font-extrabold uppercase tracking-[0.3em] text-[#C59A5B] bg-[#C59A5B]/10 px-4 py-1.5 rounded-full border border-[#C59A5B]/20 backdrop-blur-md">
              OPERATIONS CONSOLE
            </span>
          </div>

          {mounted ? (
            <div className="w-full flex flex-col items-center animate-fade-in">
              {/* KOCHI BETA Badge */}
              <div className="flex flex-col items-center gap-1 mb-4 text-center select-none">
                <div className="h-[1px] w-20 bg-gradient-to-r from-transparent via-[#C59A5B]/35 to-transparent" />
                <span className="text-[8px] font-extrabold tracking-[0.35em] text-[#C59A5B] uppercase">
                  KOCHI BETA
                </span>
                <div className="h-[1px] w-20 bg-gradient-to-r from-transparent via-[#C59A5B]/35 to-transparent" />
              </div>

              <SignIn
                path={currentPath}
                signUpUrl="https://hivebytailorbee.com/apply-admin-restricted"
                appearance={{
                  variables: {
                    colorBackground: "#2B2622",
                    colorInputBackground: "#352F2A",
                    colorText: "#FFFFFF",
                    colorPrimary: "#C59A5B",
                    colorTextSecondary: "#7E766C",
                    colorInputText: "#FFFFFF",
                    colorBorder: "#3E3833",
                  },
                  elements: {
                    rootBox: "mx-auto w-full max-w-[420px]",
                    cardBox: "shadow-[0_20px_50px_rgba(0,0,0,0.4),0_0_50px_rgba(197,154,91,0.08)] border border-[#C59A5B]/15 rounded-[1.75rem] overflow-hidden bg-[#2B2622] w-full max-w-[420px]",
                    card: "bg-[#2B2622]/95 border-none rounded-[1.75rem] p-6 sm:p-7 flex flex-col gap-2.5 text-white w-full",
                    headerTitle: "font-serif text-lg font-black text-white tracking-tight normal-case text-center",
                    headerSubtitle: "text-[11px] text-[#7E766C] font-sans font-normal tracking-wide normal-case text-center mt-0.5",
                    socialButtonsBlockButton: "h-10 border border-[#C59A5B]/20 bg-[#352F2A] rounded-lg hover:bg-[#413B36] hover:border-[#C59A5B]/50 hover:shadow-sm transition-all duration-150 font-medium text-slate-200 mt-0 mb-0",
                    socialButtonsProviderIcon: "w-[21px] h-[21px]",
                    socialButtonsBlockButtonText: "font-sans text-[10px] font-bold tracking-wider uppercase text-slate-200",
                    dividerRow: "my-2 text-[#3E3833]",
                    dividerText: "text-[#7E766C]/60 text-[9px] uppercase tracking-widest font-extrabold",
                    formFieldLabel: "text-[9px] font-bold uppercase tracking-wider text-[#C59A5B]",
                    formFieldInput: "h-9.5 rounded-xl border-[#3E3833] focus:ring-[#C59A5B] focus:border-[#C59A5B] text-xs font-medium bg-[#352F2A] text-white transition-all",
                    formButtonPrimary: "bg-[#C59A5B] text-[#23201D] hover:bg-[#B88A44] border-none h-10 rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all mt-1 hover:shadow-lg hover:shadow-[#C59A5B]/15 active:scale-[0.98]",
                    footer: "bg-[#25201C] border-t border-[#3E3833]/50 py-3.5 px-8",
                    footerActionLink: "text-[#C59A5B] hover:text-[#B88A44] font-bold transition-all text-xs",
                    footerActionText: "text-[#7E766C] text-xs",
                    identityPreviewText: "text-xs font-medium text-[#C59A5B]",
                    footerLogoLink: "hidden",
                    footerLogo: "hidden",
                    internalBadge: "hidden",
                  },
                }}
              />
              <p className="text-[8px] text-[#7E766C]/50 text-center mt-3.5 tracking-[0.15em] uppercase font-bold select-none">
                Secure gateway — Access strictly monitored & audited
              </p>
            </div>
          ) : (
            <div className="h-[400px] w-full flex items-center justify-center bg-[#2B2622]/95 border border-[#3E3833] rounded-[2rem]">
              <Loader2 className="w-8 h-8 animate-spin text-[#C59A5B]" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
