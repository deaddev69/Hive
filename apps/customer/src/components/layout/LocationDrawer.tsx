"use client";

import React, { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { X, MapPin, CheckCircle2, Loader2 } from "lucide-react";
import { useLocation } from "@/context/LocationContext";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useSessionStore } from "@/context/SessionContext";

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
    }, 900);
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
                {isServiceable ? (
                  <p className="text-[9px] font-bold tracking-widest text-slate-500 uppercase flex items-center gap-1.5 mt-1 select-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-hive-amber inline-block animate-pulse" />
                    Same-day delivery active
                  </p>
                ) : (
                  <p className="text-[9px] font-bold tracking-widest text-slate-400 uppercase flex items-center gap-1.5 mt-1 select-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block animate-pulse" />
                    Launching Soon
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

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5 min-h-0">

          {/* Instruction hint (only before a location is pinned) */}
          {!pendingResult && (
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-hive-gold/10 border border-hive-gold/20 text-xs font-medium text-hive-dark">
              <MapPin className="w-4 h-4 text-hive-amber flex-shrink-0" />
              <span>
                Tap the map or use <strong>Use Current Location</strong> to set your delivery area.
              </span>
            </div>
          )}

          {/* Saved Addresses list (Quick switch) */}
          {isAuthenticated && savedAddresses.length > 0 && (
            <div className="flex flex-col gap-2.5 w-full select-none text-left flex-shrink-0">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-hive-text-muted">
                Saved Addresses
              </span>
              <div className="flex flex-col gap-2">
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
                    className={`p-3 rounded-2xl border text-left flex items-start gap-3 transition-all duration-200 hover:bg-slate-50 cursor-pointer shadow-sm ${
                      pendingResult?.pincode === addr.pincode && 
                      Math.abs(mapLat - addr.lat) < 0.001
                        ? "border-hive-amber bg-hive-gold/5"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <MapPin className="w-4 h-4 text-hive-amber flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1 leading-tight">
                      <p className="text-xs font-extrabold text-hive-dark">{addr.label}</p>
                      <p className="text-[10px] text-hive-text-muted truncate mt-0.5">
                        {addr.formattedAddress || `${addr.houseNumber ? addr.houseNumber + ', ' : ''}${addr.landmark ? addr.landmark + ', ' : ''}${addr.city}`}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* OpenStreetMap picker */}
          <div className="flex-shrink-0">
            <LocationMapPicker
              lat={mapLat}
              lng={mapLng}
              onChange={handleMapChange}
              onReverseGeocode={handleReverseGeocode}
              showCurrentLocation={true}
              height="300px"
            />
          </div>

          {/* Confirmed address preview */}
          {pendingResult && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-2xl flex items-start gap-3 text-left">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs space-y-0.5 flex-1">
                {pendingResult.precisionLevel === "area" ? (
                  <>
                    <p className="font-extrabold text-green-800">Shopping Area Selected</p>
                    <p className="text-green-700 font-bold text-sm">
                      {pendingResult.locality || pendingResult.city || "This Area"}
                    </p>
                    <p className="text-green-600 font-medium text-[11px] mt-1">
                      We'll show products available for delivery in this area.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-extrabold text-green-800">Location selected</p>
                    <p className="text-green-700 leading-relaxed">{pendingResult.formattedAddress}</p>
                    <p className="text-green-600 font-semibold">
                      {pendingResult.locality || pendingResult.city}
                      {pendingResult.city && pendingResult.locality ? `, ${pendingResult.city}` : pendingResult.state ? `, ${pendingResult.state}` : ""}
                      {pendingResult.pincode ? ` — ${pendingResult.pincode}` : ""}
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer — confirm button */}
        <div className="flex-shrink-0 px-5 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:pb-4 border-t border-hive-border/40 bg-white">
          <button
            type="button"
            disabled={!pendingResult || isSaving || saved}
            onClick={handleConfirmLocation}
            className="w-full h-12 text-xs font-medium flex items-center justify-center gap-2 rounded-xl transition-all duration-200 bg-[#111111] text-white hover:bg-neutral-800 active:scale-[0.98] disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed shadow-md"
          >
            {saved ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Location saved
              </>
            ) : isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : pendingResult?.precisionLevel === "area" ? (
              <>
                <MapPin className="w-4 h-4" />
                Browse {pendingResult.locality || pendingResult.city || "this area"}
              </>
            ) : (
              <>
                <MapPin className="w-4 h-4" />
                Confirm Location
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
