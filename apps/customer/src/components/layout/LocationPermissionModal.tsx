"use client";

import React, { useState } from "react";
import { Modal, Button } from "@hive/ui";
import { useLocation } from "@/context/LocationContext";
import { MapPin, Navigation, Loader2, AlertCircle } from "lucide-react";

export const LocationPermissionModal: React.FC = () => {
  const { isGateOpen, setGateOpen, setDrawerOpen, detectLocation } = useLocation();
  const [loadingStep, setLoadingStep] = useState<"idle" | "detecting" | "geocoding">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleAllowLocation = async () => {
    setErrorMessage(null);
    setLoadingStep("detecting");

    const detectPromise = detectLocation();

    // Show "Finding nearby boutiques..." after a short delay
    const timer = setTimeout(() => {
      setLoadingStep("geocoding");
    }, 1200);

    const result = await detectPromise;
    clearTimeout(timer);
    setLoadingStep("idle");

    if (!result.success) {
      setErrorMessage(result.error || "Could not determine your area.");
    }
  };

  const handleChooseManually = () => {
    // Close the gate modal and open the full map drawer
    setGateOpen(false);
    setDrawerOpen(true);
  };

  return (
    <Modal
      isOpen={isGateOpen}
      onClose={() => setGateOpen(false)}
      title="Enable Location Access"
      className="max-w-md"
    >
      <div className="flex flex-col gap-5 text-center items-center py-2">
        {loadingStep === "detecting" || loadingStep === "geocoding" ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="w-12 h-12 text-hive-gold animate-spin" />
            <p className="text-sm font-medium text-hive-text">
              {loadingStep === "detecting"
                ? "Detecting your location..."
                : "Finding nearby boutiques..."}
            </p>
          </div>
        ) : (
          <>
            <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center text-hive-gold animate-pulse">
              <MapPin className="w-7 h-7" />
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                📍 Enable Location Access
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                HIVE uses your location to show boutiques that can deliver to your area.
              </p>
            </div>

            {errorMessage && (
              <div className="w-full flex items-start gap-2 text-xs text-red-600 bg-red-50 p-3 rounded-lg text-left">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold">Location access denied.</p>
                  <p className="text-[11px] mt-0.5 text-red-500">
                    Please choose your location manually on the map.
                  </p>
                </div>
              </div>
            )}

            <div className="w-full flex flex-col gap-2.5 mt-2">
              <Button
                variant="primary"
                onClick={handleAllowLocation}
                className="w-full flex items-center justify-center gap-2"
              >
                <Navigation className="w-4 h-4" />
                Allow Location Access
              </Button>

              <Button
                variant="outline"
                onClick={handleChooseManually}
                className="w-full"
              >
                Choose Location Manually
              </Button>

              <button
                onClick={() => setGateOpen(false)}
                className="text-xs text-slate-400 hover:text-slate-600 transition py-1 mt-1 font-medium"
              >
                Not Now
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
