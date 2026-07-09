"use client";

import { ReactNode } from "react";
import { ConvexReactClient, ConvexProviderWithAuth } from "convex/react";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl && typeof window !== "undefined") {
  console.warn("NEXT_PUBLIC_CONVEX_URL is not configured. Convex queries will fail.");
}

import { SessionProvider } from "@/context/SessionContext";
import { LocationProvider } from "@/context/LocationContext";
import { CartProvider } from "@/context/CartContext";

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
    <ConvexProviderWithAuth client={convex} useAuth={useFirebaseAuth}>
      <SessionProvider>
        <LocationProvider>
          <CartProvider>
            {children}
          </CartProvider>
        </LocationProvider>
      </SessionProvider>
    </ConvexProviderWithAuth>
  );
}
