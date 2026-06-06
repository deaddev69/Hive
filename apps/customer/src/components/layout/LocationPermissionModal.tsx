"use client";

import React, { useState } from "react";
import { Modal, Input, Button } from "@hive/ui";
import { useLocation } from "@/context/LocationContext";
import { MapPin, Search, Navigation, Loader2, AlertCircle } from "lucide-react";

export const LocationPermissionModal: React.FC = () => {
  const { isGateOpen, setGateOpen, detectLocation, updateLocationDetails } = useLocation();
  const [loadingStep, setLoadingStep] = useState<"idle" | "detecting" | "geocoding" | "searching">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const handleAllowLocation = async () => {
    setErrorMessage(null);
    setLoadingStep("detecting");
    
    // Simulate transitioning from detecting to geocoding
    const detectPromise = detectLocation();
    
    // Set a small timeout to show "Finding nearby boutiques..." when reverse geocoding triggers
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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setErrorMessage(null);
    setLoadingStep("searching");
    setSearchResults([]);

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          searchQuery
        )}&format=json&addressdetails=1&countrycodes=in&limit=5`
      );
      if (!res.ok) {
        throw new Error("Failed to fetch locations");
      }
      const data = await res.json();
      setSearchResults(data);
      if (data.length === 0) {
        setErrorMessage("No places found for your query. Try a different city or pincode.");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Could not search for locations. Please try again.");
    } finally {
      setLoadingStep("idle");
    }
  };

  const handleSelectLocation = async (item: any) => {
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    const address = item.address || {};
    
    const city = address.city || address.town || address.village || address.suburb || address.county || "Kochi";
    const state = address.state || "Kerala";
    const country = address.country || "India";
    const postcode = address.postcode || "";

    setLoadingStep("geocoding");
    await updateLocationDetails({
      latitude: lat,
      longitude: lon,
      city,
      state,
      country,
      postcode,
    });
    setLoadingStep("idle");
    setShowManual(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  return (
    <Modal
      isOpen={isGateOpen}
      onClose={() => setGateOpen(false)}
      title={showManual ? "Search Location" : "Enable Location Access"}
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
        ) : showManual ? (
          /* Manual Location Entry View */
          <div className="w-full flex flex-col gap-4 text-left">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="flex-grow">
                <Input
                  placeholder="Enter city, pincode, or area"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
              <Button type="submit" variant="primary" className="px-4">
                <Search className="w-4 h-4" />
              </Button>
            </form>

            {errorMessage && (
              <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {loadingStep === "searching" && (
              <div className="flex items-center justify-center py-6 gap-2">
                <Loader2 className="w-5 h-5 text-hive-gold animate-spin" />
                <span className="text-xs text-hive-text-muted">Searching places...</span>
              </div>
            )}

            <div className="flex flex-col max-h-60 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-lg">
              {searchResults.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectLocation(item)}
                  className="w-full text-left p-3 hover:bg-slate-50 transition flex items-start gap-2.5 text-xs text-slate-700"
                >
                  <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <span>{item.display_name}</span>
                </button>
              ))}
            </div>

            <div className="flex gap-2 mt-2">
              <Button
                variant="outline"
                className="w-full text-xs py-2"
                onClick={() => {
                  setShowManual(false);
                  setErrorMessage(null);
                }}
              >
                Go Back
              </Button>
            </div>
          </div>
        ) : (
          /* Default Location Request View */
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
                    Location access is required for delivery availability.
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
                onClick={() => setShowManual(true)}
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
