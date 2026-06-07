"use client";

import React, { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { X, MapPin, CheckCircle2, Loader2 } from "lucide-react";
import { useLocation } from "@/context/LocationContext";

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
    city,
    stateName,
    postcode,
    latitude,
    longitude,
    updateLocationDetails,
  } = useLocation();

  // Map coordinates — seed from context lat/lng if available, else default to Kochi
  const [mapLat, setMapLat] = useState(latitude ?? 10.0261);
  const [mapLng, setMapLng] = useState(longitude ?? 76.3082);

  // Pending geocode result shown in the preview card
  const [pendingResult, setPendingResult] = useState<{
    formattedAddress: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
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
      city: string;
      state: string;
      pincode: string;
      country: string;
    }) => {
      setPendingResult({
        formattedAddress: result.formattedAddress,
        city: result.city,
        state: result.state,
        pincode: result.pincode,
        country: result.country || "India",
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
        <div className="flex justify-between items-center px-6 py-4 border-b border-hive-border/60 bg-white rounded-t-[28px] sm:rounded-t-none flex-shrink-0">
          <div>
            <h2 className="font-serif text-lg font-bold text-hive-dark">Delivery Location</h2>
            {city && (
              <p className="text-xs text-hive-text-muted mt-0.5">
                Currently:{" "}
                <span className="font-bold text-hive-dark">
                  {city}
                  {stateName ? `, ${stateName}` : ""}
                </span>
                {postcode ? ` — ${postcode}` : ""}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-hive-cream transition-colors text-hive-text-muted hover:text-hive-dark outline-none"
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
                <p className="font-extrabold text-green-800">Location selected</p>
                <p className="text-green-700 leading-relaxed">{pendingResult.formattedAddress}</p>
                <p className="text-green-600 font-semibold">
                  {pendingResult.city}
                  {pendingResult.state ? `, ${pendingResult.state}` : ""}
                  {pendingResult.pincode ? ` — ${pendingResult.pincode}` : ""}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer — confirm button */}
        <div className="flex-shrink-0 px-5 py-4 border-t border-hive-border/40 bg-white">
          <button
            type="button"
            disabled={!pendingResult || isSaving || saved}
            onClick={handleConfirmLocation}
            className="w-full h-12 bg-hive-dark text-hive-gold hover:bg-hive-dark/90 active:scale-[0.98] transition-all rounded-xl font-extrabold uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saved ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Location Saved!
              </>
            ) : isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <MapPin className="w-4 h-4" />
                Confirm This Location
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
