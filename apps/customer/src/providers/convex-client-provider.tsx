"use client";

import { ReactNode } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useAuth } from "@clerk/nextjs";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl && typeof window !== "undefined") {
  console.warn("NEXT_PUBLIC_CONVEX_URL is not configured. Convex queries will fail.");
}

import { SessionProvider } from "@/context/SessionContext";
import { LocationProvider } from "@/context/LocationContext";
import { CartProvider } from "@/context/CartContext";

const convex = new ConvexReactClient(convexUrl || "https://placeholder-url.convex.cloud");

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <SessionProvider>
        <LocationProvider>
          <CartProvider>
            {children}
          </CartProvider>
        </LocationProvider>
      </SessionProvider>
    </ConvexProviderWithClerk>
  );
}
