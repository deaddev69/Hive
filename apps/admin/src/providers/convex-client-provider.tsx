"use client";

import { ReactNode } from "react";
import { useAuth } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl && typeof window !== "undefined") {
  console.warn("NEXT_PUBLIC_CONVEX_URL is not configured.");
}

const isValidAbsoluteUrl = (url?: string): boolean => {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const finalConvexUrl = isValidAbsoluteUrl(convexUrl)
  ? convexUrl!
  : "https://placeholder-url.convex.cloud";

const convex = new ConvexReactClient(finalConvexUrl);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}
