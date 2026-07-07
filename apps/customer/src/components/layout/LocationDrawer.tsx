"use client";

import React, { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { X, MapPin, CheckCircle2, Loader2 } from "lucide-react";
import { useLocation } from "@/context/LocationContext";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useSessionStore } from "@/context/SessionContext";
import { toast } from "@hive/utils";

// Load map without SSR — Leaflet needs window
const LocationMapPicker = dynamic(
  () => import("@/components/location/LocationMapPicker"),
  { ssr: false }
);

export interface LocationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LocationDrawer: React.FC<LocationDrawerProps> = ({ isOpen, onClose }) => {
  // ── ALL hooks must come before any conditional return ──────────────────────

  const [shouldRender, setShouldRender] = useState(isOpen);
  const [animate, setAnimate] = useState(false);

  const {
    locality,
    city,
    stateName,
    postcode,
    latitude,
    longitude,
    updateLocationDetails,
    isServiceable,
    serviceableBoutiqueCount,
  } = useLocation();

  const { token, isAuthenticated } = useSessionStore();
  const savedAddresses = useQuery(api.addresses.list, { token: token || undefined }) ?? [];

  // Map coordinates — seed from context lat/lng if available, else default to Kochi
  const [mapLat, setMapLat] = useState(latitude ?? 10.0261);
  const [mapLng, setMapLng] = useState(longitude ?? 76.3082);

  // Pending geocode result shown in the preview card
  const [pendingResult, setPendingResult] = useState<{
    formattedAddress: string;
    locality: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
    precisionLevel?: "area" | "exact";
    source?: "popular_area" | "search" | "map_pin" | "gps" | "saved_address";
  } | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const pendingServiceability = useQuery(
    api.serviceability.checkServiceability,
    pendingResult?.city ? { city: pendingResult.city } : "skip"
  );
  const isPendingServiceable = pendingServiceability?.isServiceable ?? true;
  const requestService = useMutation(api.serviceability.requestService);
  const primeRoadDistanceCache = useAction(api.locationActions.primeRoadDistanceCache);

  // Sync map centre when context coordinates update (e.g. previously saved location loads)
  useEffect(() => {
    if (latitude && longitude) {
      setMapLat(latitude);
      setMapLng(longitude);
    }
  }, [latitude, longitude]);

  // Drawer open/close animation + body scroll lock
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      const t = setTimeout(() => setAnimate(true), 15);
      document.body.style.overflow = "hidden";
      // Reset transient state each time drawer opens
      setSaved(false);
      setPendingResult(null);
      return () => clearTimeout(t);
    } else {
      setAnimate(false);
      const t = setTimeout(() => setShouldRender(false), 300);
      document.body.style.overflow = "";
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Called by LocationMapPicker when the user pins a location and reverse geocode resolves
  // Declared BEFORE any conditional return to satisfy Rules of Hooks
  const handleReverseGeocode = useCallback(
    (result: {
      formattedAddress: string;
      locality: string;
      city: string;
      state: string;
      pincode: string;
      country: string;
      precisionLevel?: "area" | "exact";
      source?: "popular_area" | "search" | "map_pin" | "gps" | "saved_address";
    }) => {
      setPendingResult({
        formattedAddress: result.formattedAddress,
        locality: result.locality,
        city: result.city,
        state: result.state,
        pincode: result.pincode,
        country: result.country || "India",
        precisionLevel: result.precisionLevel || "exact",
        source: result.source || "map_pin",
      });
    },
    []
  );

  // ── Early return: drawer is fully unmounted while closed ──────────────────
  if (!shouldRender) return null;

  // ── Regular (non-hook) event handlers ─────────────────────────────────────

  const handleMapChange = (lat: number, lng: number) => {
    setMapLat(lat);
    setMapLng(lng);
  };

  const handleConfirmLocation = async () => {
    if (!pendingResult) return;
    setIsSaving(true);
    
    if (!isPendingServiceable) {
      try {
        await requestService({
          city: pendingResult.city || pendingResult.locality || "Unknown",
          state: pendingResult.state || "Unknown",
          latitude: mapLat,
          longitude: mapLng,
        });
        toast.success("You're on the waitlist! We'll notify you when we launch here.");
      } catch (e) {
        console.error(e);
      }
      setIsSaving(false);
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 1500);
      return;
    }

    // FIRE-AND-FORGET BACKGROUND WORKER DISPATCH
    // Dispatched cleanly without an await block so the browser loader never stalls the UI
    primeRoadDistanceCache({ userLat: mapLat, userLng: mapLng }).catch((err) => {
      console.error("Async context routing pre-cache execution failure:", err);
    });

    await updateLocationDetails({
      latitude: mapLat,
      longitude: mapLng,
      locality: pendingResult.locality,
      city: pendingResult.city,
      state: pendingResult.state,
      country: pendingResult.country || "India",
      postcode: pendingResult.pincode,
    });
    setIsSaving(false);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 400);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-[9999] flex justify-end overflow-hidden select-none">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-hive-dark/40 backdrop-blur-sm transition-opacity duration-300 ${
          animate ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Drawer — bottom sheet on mobile, right side panel on desktop */}
      <div
        className={`fixed bg-hive-cream shadow-2xl flex flex-col transition-all duration-300 ease-out z-[9999] border-hive-border
          bottom-0 left-0 right-0 h-[90vh] w-full rounded-t-[28px] border-t
          sm:top-0 sm:bottom-0 sm:right-0 sm:left-auto sm:h-full sm:w-[460px] sm:rounded-t-none sm:border-l sm:border-t-0
          ${animate ? "translate-y-0 sm:translate-x-0" : "translate-y-full sm:translate-y-0 sm:translate-x-full"}
        `}
      >
        {/* Header */}
        <div className="flex justify-between items-start px-6 py-4 border-b border-hive-border/60 bg-white rounded-t-[28px] sm:rounded-t-none flex-shrink-0">
          <div className="min-w-0 flex-1 pr-4">
            <h2 className="font-serif text-base font-bold text-hive-dark">Delivery Location</h2>
            {city && (
              <div className="mt-1.5 space-y-1 select-none text-left">
                <div className="flex flex-col items-start leading-tight">
                  <span className="text-sm font-black text-hive-dark truncate max-w-[280px] sm:max-w-[340px]">
                    {locality || city}
                  </span>
                  {locality && (
                    <span className="text-[11px] text-hive-text-muted font-bold tracking-wide mt-0.5">
                      {city}{postcode ? ` • ${postcode}` : ""}
                    </span>
                  )}
                </div>
                {pendingResult && !isPendingServiceable ? (
                  <p className="text-[9px] font-bold tracking-widest text-slate-400 uppercase flex items-center gap-1.5 mt-1 select-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block animate-pulse" />
                    Launching Soon
                  </p>
                ) : (
                  <p className="text-[9px] font-bold tracking-widest text-slate-500 uppercase flex items-center gap-1.5 mt-1 select-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-hive-amber inline-block animate-pulse" />
                    Same-day delivery active
                  </p>
                )}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-hive-cream transition-colors text-hive-text-muted hover:text-hive-dark outline-none mt-0.5"
            aria-label="Close location drawer"
          >
            <X className="w-5 h-5 stroke-[2.2]" />
          </button>
        </div>

        {/* Full Bleed Map Body */}
        <div className="flex-1 relative overflow-hidden bg-hive-cream/30 z-0">

          {/* Map Layer with Top Overlay (Saved Address Chips) */}
          <LocationMapPicker
            lat={mapLat}
            lng={mapLng}
            onChange={handleMapChange}
            onReverseGeocode={handleReverseGeocode}
            showCurrentLocation={true}
            height="100%"
            topOverlay={
              isAuthenticated && savedAddresses.length > 0 ? (
                <div className="px-4 pointer-events-auto">
                  <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-3 pt-1 -mx-4 px-4 snap-x">
                    {savedAddresses.map((addr: any) => (
                      <button
                        key={addr._id}
                        type="button"
                        onClick={async () => {
                          setMapLat(addr.lat);
                          setMapLng(addr.lng);
                          setPendingResult({
                            formattedAddress: addr.formattedAddress || `${addr.houseNumber ? addr.houseNumber + ', ' : ''}${addr.landmark ? addr.landmark + ', ' : ''}${addr.city}`,
                            locality: addr.locality || addr.city,
                            city: addr.city,
                            state: addr.state,
                            pincode: addr.pincode,
                            country: "India",
                            precisionLevel: "exact",
                            source: "saved_address",
                          });
                        }}
                        aria-label={`Select saved address: ${addr.label}`}
                        className={`snap-start flex items-center gap-2 px-4 py-2.5 rounded-full border shadow-sm transition-all duration-200 cursor-pointer whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-hive-gold ${
                          pendingResult?.pincode === addr.pincode && Math.abs(mapLat - addr.lat) < 0.001
                            ? "border-hive-amber bg-white shadow-md scale-105"
                            : "border-hive-border/50 bg-white/95 backdrop-blur-sm hover:bg-white"
                        }`}
                      >
                        <MapPin className={`w-3.5 h-3.5 flex-shrink-0 ${pendingResult?.pincode === addr.pincode && Math.abs(mapLat - addr.lat) < 0.001 ? "text-hive-amber" : "text-hive-text-muted"}`} />
                        <span className={`text-xs font-bold ${pendingResult?.pincode === addr.pincode && Math.abs(mapLat - addr.lat) < 0.001 ? "text-hive-dark" : "text-hive-text"}`}>
                          {addr.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : undefined
            }
          />

          {/* Bottom Sheet for Confirmation */}
          <div 
            className={`absolute bottom-0 inset-x-0 z-30 bg-white rounded-t-[28px] shadow-[0_-12px_40px_rgba(0,0,0,0.12)] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col ${
              pendingResult ? "translate-y-0" : "translate-y-full"
            }`}
          >
            {pendingResult && (
              <div className="px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
                
                {/* Address Details */}
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-10 h-10 rounded-full bg-hive-gold/10 border border-hive-gold/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MapPin className="w-5 h-5 text-hive-amber" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-extrabold text-hive-dark truncate">
                      {pendingResult.locality || pendingResult.city || "Location Selected"}
                    </p>
                    <p className="text-xs text-hive-text-muted mt-1 leading-relaxed line-clamp-2 pr-4">
                      {pendingResult.formattedAddress}
                    </p>
                  </div>
                </div>

                {/* Confirm Button */}
                <button
                  type="button"
                  disabled={!pendingResult || isSaving || saved}
                  onClick={handleConfirmLocation}
                  aria-label={saved ? "Location saved" : isSaving ? "Saving location" : "Confirm location selection"}
                  className={`w-full h-14 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 rounded-xl transition-all duration-200 active:scale-[0.98] disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-hive-gold ${
                    pendingResult && !isPendingServiceable 
                      ? "bg-[#D97706] hover:bg-[#B45309] text-white" 
                      : "bg-hive-dark hover:bg-neutral-800 text-hive-gold"
                  }`}
                >
                  {saved ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      {pendingResult && !isPendingServiceable ? "Added to waitlist" : "Location saved"}
                    </>
                  ) : isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {pendingResult && !isPendingServiceable ? "Submitting..." : "Saving..."}
                    </>
                  ) : pendingResult && !isPendingServiceable ? (
                    <>
                      <MapPin className="w-4 h-4" />
                      Notify Me When Available
                    </>
                  ) : pendingResult?.precisionLevel === "area" ? (
                    <>
                      <MapPin className="w-4 h-4" />
                      Browse {pendingResult.locality || pendingResult.city || "this area"}
                    </>
                  ) : (
                    <>
                      Confirm Location
                    </>
                  )}
                </button>

              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
