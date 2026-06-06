"use client";

import React, { useState, useEffect } from "react";
import { Modal, Button } from "@hive/ui";
import { useLocation } from "@/context/LocationContext";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { MapPinOff, Bell, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";


export const UnsupportedArea: React.FC = () => {
  const { isServiceable, city, stateName, latitude, longitude } = useLocation();
  const requestService = useMutation(api.serviceability.requestService);

  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // Open the modal if the user is in an unserviceable area and hasn't dismissed it yet
    if (city && !isServiceable && !isSubmitted) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [isServiceable, city, isSubmitted]);

  if (!city || isServiceable) return null;

  const handleNotifyMe = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await requestService({
        city: city,
        state: stateName || "India",
        latitude: latitude || undefined,
        longitude: longitude || undefined,
      });

      if (res.success) {
        setIsSubmitted(true);
      } else {
        // Even if it's already requested, we show success/acknowledgment to the user to feel premium
        setIsSubmitted(true);
      }
    } catch (err: any) {
      console.error("Failed to request service:", err);
      setErrorMsg("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeZones = ["Kochi", "Kakkanad", "Aluva", "Thrippunithura", "Edappally", "Hyderabad"];

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      title="Location Unavailable"
      className="max-w-md"
    >
      <div className="flex flex-col gap-6 text-center items-center py-3">
        {isSubmitted ? (
          /* Success Screen */
          <div className="flex flex-col items-center gap-4 py-4 animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 rounded-full bg-green-50 dark:bg-green-950/20 flex items-center justify-center text-green-500">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                You're on the list!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
                Thank you for your interest! We have recorded your request for{" "}
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {city}
                </span>
                . We will notify you as soon as HIVE launches delivery in your area.
              </p>
            </div>
            <Button
              variant="primary"
              className="mt-2 w-full max-w-[200px]"
              onClick={() => setIsOpen(false)}
            >
              Browse Collections
            </Button>
          </div>
        ) : (
          /* Main Notice Screen */
          <>
            <div className="w-14 h-14 rounded-full bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center text-hive-gold animate-pulse">
              <MapPinOff className="w-7 h-7" />
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                HIVE is not available here yet
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
                We currently don't deliver to{" "}
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {city}
                </span>
                . You can still browse our collections, but checkout will be disabled.
              </p>
            </div>

            {/* List of active cities */}
            <div className="w-full text-left bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/40">
              <h4 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2.5">
                Active Service Zones
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {activeZones.map((zone) => (
                  <span
                    key={zone}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 shadow-sm border border-slate-100 dark:border-slate-700/50"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    {zone}
                  </span>
                ))}
              </div>
            </div>

            {errorMsg && (
              <p className="text-xs text-red-500 font-medium">{errorMsg}</p>
            )}

            <div className="w-full flex flex-col gap-2.5 mt-2">
              <Button
                variant="primary"
                onClick={handleNotifyMe}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Recording request...
                  </>
                ) : (
                  <>
                    <Bell className="w-4 h-4" />
                    Notify Me When Available
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center justify-center gap-1.5"
              >
                Browse Collections
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
