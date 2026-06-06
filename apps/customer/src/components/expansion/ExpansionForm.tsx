"use client";

import React, { useState } from "react";
import { cn } from "@hive/ui";
import { CheckCircle2, AlertCircle, ArrowRight, Loader2 } from "lucide-react";

type FormState = "idle" | "loading" | "success" | "error";

interface FieldError {
  email?: string;
  city?: string;
}

export const ExpansionForm: React.FC = () => {
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [formState, setFormState] = useState<FormState>("idle");
  const [errors, setErrors] = useState<FieldError>({});

  const validateEmail = (value: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  };

  const validate = (): boolean => {
    const newErrors: FieldError = {};
    if (!email.trim()) {
      newErrors.email = "Email address is required.";
    } else if (!validateEmail(email)) {
      newErrors.email = "Please enter a valid email address.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setFormState("loading");

    // Simulate async with client-side delay — no API calls
    setTimeout(() => {
      setFormState("success");
    }, 1100);
  };

  const handleReset = () => {
    setEmail("");
    setCity("");
    setErrors({});
    setFormState("idle");
  };

  /* ── Success State ── */
  if (formState === "success") {
    return (
      <div className="flex flex-col items-center text-center gap-5 py-6 px-2">
        {/* Checkmark ring */}
        <div className="relative flex items-center justify-center">
          <div className="absolute w-20 h-20 rounded-full bg-hive-gold/15 animate-ping [animation-duration:2s]" />
          <div className="w-16 h-16 rounded-full bg-hive-gold/20 border-2 border-hive-gold/40 flex items-center justify-center z-10">
            <CheckCircle2 className="w-8 h-8 text-hive-gold" strokeWidth={1.8} />
          </div>
        </div>

        <div className="flex flex-col gap-2 max-w-xs">
          <h3 className="text-xl font-serif font-extrabold text-hive-dark">
            You&apos;re on the list.
          </h3>
          <p className="text-sm text-hive-text-muted leading-relaxed">
            We&apos;ll notify you when Hive launches in your region. Keep an eye on your inbox.
          </p>
        </div>

        <button
          onClick={handleReset}
          className="text-xs font-bold uppercase tracking-widest text-hive-amber hover:text-hive-gold transition-colors duration-200 underline underline-offset-4"
        >
          Register another email
        </button>
      </div>
    );
  }

  /* ── Form ── */
  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5 w-full">
      {/* Email Field */}
      <div className="flex flex-col gap-2">
        <label
          htmlFor="expansion-email"
          className="text-[11px] font-bold text-hive-dark/80 uppercase tracking-widest"
        >
          Email Address <span className="text-hive-amber">*</span>
        </label>
        <div className="relative">
          <input
            id="expansion-email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
            }}
            placeholder="you@example.com"
            autoComplete="email"
            disabled={formState === "loading"}
            className={cn(
              "w-full px-4 py-3 rounded-2xl text-sm font-medium text-hive-dark bg-white/80 border outline-none",
              "placeholder:text-hive-text-muted/50 transition-all duration-200",
              "focus:ring-2 focus:ring-hive-gold/40 focus:border-hive-gold/60",
              "disabled:opacity-60 disabled:cursor-not-allowed",
              errors.email
                ? "border-red-400/70 focus:ring-red-300/40"
                : "border-hive-border/70 hover:border-hive-gold/40"
            )}
          />
          {errors.email && (
            <AlertCircle className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500 pointer-events-none" />
          )}
        </div>
        {errors.email && (
          <span className="text-xs text-red-500 font-medium flex items-center gap-1">
            <AlertCircle className="w-3 h-3 flex-shrink-0" />
            {errors.email}
          </span>
        )}
      </div>

      {/* City Field (Optional) */}
      <div className="flex flex-col gap-2">
        <label
          htmlFor="expansion-city"
          className="text-[11px] font-bold text-hive-dark/80 uppercase tracking-widest flex items-center gap-2"
        >
          Your City
          <span className="normal-case font-normal text-hive-text-muted/60 tracking-normal text-[10px]">
            Optional
          </span>
        </label>
        <input
          id="expansion-city"
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="e.g. Thrissur, Kozhikode..."
          autoComplete="address-level2"
          disabled={formState === "loading"}
          className={cn(
            "w-full px-4 py-3 rounded-2xl text-sm font-medium text-hive-dark bg-white/80 border outline-none",
            "placeholder:text-hive-text-muted/50 border-hive-border/70 hover:border-hive-gold/40",
            "focus:ring-2 focus:ring-hive-gold/40 focus:border-hive-gold/60",
            "transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
          )}
        />
      </div>

      {/* Error Alert */}
      {formState === "error" && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4 text-sm">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <span className="text-red-700 font-medium leading-snug">
            Something went wrong. Please try again in a moment.
          </span>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={formState === "loading"}
        className={cn(
          "w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl",
          "text-sm font-bold uppercase tracking-widest text-hive-dark",
          "bg-gradient-to-r from-hive-gold to-hive-amber",
          "shadow-md shadow-hive-gold/25 hover:shadow-lg hover:shadow-hive-gold/35",
          "hover:-translate-y-0.5 active:translate-y-0",
          "transition-all duration-300",
          "disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-md"
        )}
      >
        {formState === "loading" ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Adding you...
          </>
        ) : (
          <>
            Notify Me
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </>
        )}
      </button>

      <p className="text-[10px] text-hive-text-muted/70 text-center leading-relaxed">
        No spam. We&apos;ll only reach out when Hive is live in your area.
      </p>
    </form>
  );
};
