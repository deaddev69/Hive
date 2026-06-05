"use client";

import React from "react";
import { EmptyState } from "@hive/ui";
import { useLocation } from "@/context/LocationContext";
import { MapPinOff } from "lucide-react";

export default function NotServiceablePage() {
  const { setGateOpen } = useLocation();

  return (
    <main className="flex flex-col items-center justify-center p-8 min-h-[70vh] bg-hive-cream/20">
      <EmptyState
        title="Delivery Address Outside Serviceable Zones"
        description="Hive is currently available exclusively in Hyderabad (pincodes starting with 500). Alterations and hyperlocal dispatch guarantees are limited to these areas."
        icon={<MapPinOff className="w-6 h-6 text-hive-text-muted" />}
        action={{
          label: "Enter Different Pincode",
          onClick: () => setGateOpen(true),
          buttonProps: {
            variant: "primary",
            className: "px-6 py-2.5 rounded-xl font-bold"
          }
        }}
        className="max-w-lg shadow-sm bg-white"
      />
    </main>
  );
}
