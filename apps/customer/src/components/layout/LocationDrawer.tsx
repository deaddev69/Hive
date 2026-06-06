"use client";

import React, { useEffect, useState } from "react";
import { X, MapPin, Navigation, RefreshCw, Search, Loader2, AlertCircle } from "lucide-react";
import { useLocation } from "@/context/LocationContext";
import { Button } from "@hive/ui";

export interface LocationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LocationDrawer: React.FC<LocationDrawerProps> = ({ isOpen, onClose }) => {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [animate, setAnimate] = useState(false);
  const { city, stateName, postcode, detectLocation, updateLocationDetails } = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Manual search states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  console.log('[LocationDrawer] Rendering. isOpen:', isOpen, 'shouldRender:', shouldRender, 'animate:', animate);

  useEffect(() => {
    console.log('[LocationDrawer] useEffect fired. isOpen:', isOpen);
    if (isOpen) {
      setShouldRender(true);
      const timer = setTimeout(() => {
        console.log('[LocationDrawer] Setting animate to true');
        setAnimate(true);
      }, 15);
      document.body.style.overflow = "hidden";
      return () => clearTimeout(timer);
    } else {
      setAnimate(false);
      const timer = setTimeout(() => {
        console.log('[LocationDrawer] Setting shouldRender to false');
        setShouldRender(false);
      }, 300);
      document.body.style.overflow = "";
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!shouldRender) {
    console.log('[LocationDrawer] Returning null because shouldRender is false');
    return null;
  }

  console.log('[LocationDrawer] Rendering JSX body with values:', { city, stateName, postcode });

  const handleUseCurrentLocationAgain = async () => {
    setLoading(true);
    setError(null);
    const result = await detectLocation();
    setLoading(false);
    if (result.success) {
      onClose();
    } else {
      setError(result.error || "Could not refresh location.");
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearchError(null);
    setIsSearching(true);
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
        setSearchError("No places found. Try a different city or pincode.");
      }
    } catch (err) {
      console.error(err);
      setSearchError("Could not search for locations. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectLocation = async (item: any) => {
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    const address = item.address || {};
    
    const itemCity = address.city || address.town || address.village || address.suburb || address.county || "Kochi";
    const itemState = address.state || "Kerala";
    const itemCountry = address.country || "India";
    const itemPostcode = address.postcode || "";

    setLoading(true);
    await updateLocationDetails({
      latitude: lat,
      longitude: lon,
      city: itemCity,
      state: itemState,
      country: itemCountry,
      postcode: itemPostcode,
    });
    setLoading(false);
    setSearchQuery("");
    setSearchResults([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex justify-end overflow-hidden select-none">
      {/* Backdrop overlay */}
      <div
        className={`absolute inset-0 bg-hive-dark/40 backdrop-blur-sm transition-opacity duration-300 ${
          animate ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Drawer Surface */}
      <div
        className={`fixed bg-hive-cream shadow-2xl flex flex-col transition-all duration-300 ease-out z-[9999] border-hive-border
          bottom-0 left-0 right-0 h-[65vh] w-full rounded-t-[30px] border-t
          sm:top-0 sm:bottom-0 sm:right-0 sm:left-auto sm:h-full sm:w-[420px] sm:rounded-t-none sm:border-l sm:border-t-0
          ${
            animate
              ? "translate-y-0 sm:translate-x-0"
              : "translate-y-full sm:translate-y-0 sm:translate-x-full"
          }
        `}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-hive-border/60 bg-white rounded-t-[30px] sm:rounded-t-none">
          <div className="flex items-center gap-2">
            <h2 className="font-serif text-lg font-bold text-hive-dark">Delivery Location</h2>
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

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-6">
          {/* Section: Current Location */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 flex flex-col gap-3.5">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
              Current Location
            </h3>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center text-hive-gold flex-shrink-0 mt-0.5">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm text-slate-800">
                  {city ? `${city}, ${stateName}` : "No Location Set"}
                </span>
                <span className="text-xs text-slate-400 font-medium mt-0.5">
                  {postcode ? `Pincode: ${postcode}` : "Configure location for local deliveries"}
                </span>
              </div>
            </div>
          </div>

          {/* Section: Change Location Manually */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
              Search Pincode or City
            </h3>
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="flex-grow">
                <input
                  type="text"
                  placeholder="Enter city, pincode, or area"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 placeholder-slate-400 outline-none focus:border-hive-gold focus:ring-1 focus:ring-hive-gold"
                />
              </div>
              <Button type="submit" variant="primary" className="px-4 h-10">
                <Search className="w-4 h-4" />
              </Button>
            </form>

            {searchError && (
              <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{searchError}</span>
              </div>
            )}

            {isSearching && (
              <div className="flex items-center justify-center py-4 gap-2">
                <Loader2 className="w-4 h-4 text-hive-gold animate-spin" />
                <span className="text-xs text-slate-400">Searching places...</span>
              </div>
            )}

            <div className="flex flex-col max-h-40 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-lg bg-white">
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
          </div>

          {/* Section: Actions */}
          <div className="flex flex-col gap-3 mt-1">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
              Re-Detect
            </h3>

            {error && <p className="text-xs text-red-500 font-medium px-1">{error}</p>}

            <Button
              variant="outline"
              disabled={loading}
              onClick={handleUseCurrentLocationAgain}
              className="w-full justify-start text-xs font-semibold py-3 px-4 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 transition flex items-center gap-2.5"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              ) : (
                <Navigation className="w-4 h-4 text-slate-400" />
              )}
              Use Current Location Again
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
