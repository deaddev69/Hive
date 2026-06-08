"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Search, MapPin, Loader2, Navigation, AlertCircle, CheckCircle2 } from "lucide-react";

interface ReverseGeocodeResult {
  formattedAddress: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

interface LocationMapPickerProps {
  lat: number;
  lng: number;
  onChange?: (lat: number, lng: number) => void;
  onReverseGeocode?: (result: ReverseGeocodeResult) => void;
  readOnly?: boolean;
  height?: string;
  showCurrentLocation?: boolean;
}

type GeoError = "permission_denied" | "timeout" | "unavailable" | "unsupported" | null;

async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
  console.log(`[ReverseGeocode] Requesting geocode for lat=${lat}, lng=${lng}`);
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
      { headers: { "Accept-Language": "en" } }
    );
    if (!res.ok) {
      console.error(`[ReverseGeocode] Fetch failed with status: ${res.status}`);
      throw new Error("Reverse geocode failed");
    }
    const data = await res.json();
    console.log("[ReverseGeocode] Response data:", data);

    const addr = data.address || {};
    const city =
      addr.city || addr.town || addr.village || addr.suburb || addr.county || addr.state_district || "";
    const state = addr.state || "";
    const pincode = addr.postcode || "";
    const country = addr.country || "";
    const formattedAddress = data.display_name || "";

    console.log(`[ReverseGeocode] Parsed result: city=${city}, state=${state}, pincode=${pincode}, country=${country}`);
    return { formattedAddress, city, state, pincode, country };
  } catch (err) {
    console.error("[ReverseGeocode] Exception caught:", err);
    throw err;
  }
}

export default function LocationMapPicker({
  lat,
  lng,
  onChange,
  onReverseGeocode,
  readOnly = false,
  height = "280px",
  showCurrentLocation = true,
}: LocationMapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<GeoError>(null);
  const [geocoding, setGeocoding] = useState(false);

  // Load Leaflet assets dynamically from CDN (SSR-safe)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ((window as any).L) {
      setLeafletLoaded(true);
      return;
    }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.onload = () => setLeafletLoaded(true);
    document.body.appendChild(script);
  }, []);

  const handleMapInteraction = useCallback(
    async (clickLat: number, clickLng: number) => {
      onChange?.(clickLat, clickLng);
      if (onReverseGeocode) {
        setGeocoding(true);
        try {
          const result = await reverseGeocode(clickLat, clickLng);
          onReverseGeocode(result);
        } catch {
          // silent fail — user can still save manually
        } finally {
          setGeocoding(false);
        }
      }
    },
    [onChange, onReverseGeocode]
  );

  // Initialize Map
  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const initialLat = lat || 10.0261; // Default: Kochi, Kerala
    const initialLng = lng || 76.3082;

    const map = L.map(mapContainerRef.current).setView([initialLat, initialLng], 13);
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Custom amber pin icon
    const amberIcon = L.divIcon({
      className: "",
      html: `<div style="
        width: 28px; height: 28px; border-radius: 50% 50% 50% 0;
        background: #F5A623; border: 2px solid #fff;
        transform: rotate(-45deg); box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      "></div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 28],
    });

    const marker = L.marker([initialLat, initialLng], {
      draggable: !readOnly,
      icon: amberIcon,
    }).addTo(map);
    markerRef.current = marker;

    if (!readOnly) {
      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        handleMapInteraction(pos.lat, pos.lng);
      });

      map.on("click", (e: any) => {
        const { lat: clickLat, lng: clickLng } = e.latlng;
        marker.setLatLng([clickLat, clickLng]);
        handleMapInteraction(clickLat, clickLng);
      });
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leafletLoaded]);

  // Update marker/view when lat/lng change externally
  useEffect(() => {
    if (mapRef.current && markerRef.current && lat && lng) {
      const currentPos = markerRef.current.getLatLng();
      if (Math.abs(currentPos.lat - lat) > 0.0001 || Math.abs(currentPos.lng - lng) > 0.0001) {
        markerRef.current.setLatLng([lat, lng]);
        mapRef.current.setView([lat, lng], 15);
      }
    }
  }, [lat, lng]);

  // "Use Current Location" — browser geolocation
  const handleUseCurrentLocation = async () => {
    console.log("[Geolocation] Requesting Use Current Location...");
    setGeoError(null);

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      console.error("[Geolocation] navigator.geolocation is not supported");
      setGeoError("unsupported");
      return;
    }

    try {
      // Log permission state if available
      if (navigator.permissions && navigator.permissions.query) {
        const perm = await navigator.permissions.query({ name: "geolocation" });
        console.log("[Geolocation] Permission state:", perm.state);
      }
    } catch (e) {
      console.log("[Geolocation] Permission query not supported or failed:", e);
    }

    setGeoLoading(true);
    
    const geoOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    };

    console.log("[Geolocation] Calling getCurrentPosition with options:", geoOptions);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        console.log("[Geolocation] getCurrentPosition success!");
        const { latitude, longitude } = position.coords;
        console.log(`[Geolocation] Coordinates retrieved: lat=${latitude}, lng=${longitude}`);
        
        // Move map and marker
        if (mapRef.current && markerRef.current) {
          markerRef.current.setLatLng([latitude, longitude]);
          mapRef.current.setView([latitude, longitude], 16);
        }
        setGeoLoading(false);
        
        try {
          console.log(`[Geolocation] Calling handleMapInteraction for lat=${latitude}, lng=${longitude}`);
          await handleMapInteraction(latitude, longitude);
        } catch (e) {
          console.error("[Geolocation] handleMapInteraction failed:", e);
        }
      },
      (err) => {
        console.error("[Geolocation] getCurrentPosition failed. Code:", err.code, "Message:", err.message);
        console.error("[Geolocation] Full Error Object:", err);
        setGeoLoading(false);
        
        if (err.code === 1) { // PERMISSION_DENIED
          console.log("[Geolocation] Error: PERMISSION_DENIED");
          setGeoError("permission_denied");
        } else if (err.code === 3) { // TIMEOUT
          console.log("[Geolocation] Error: TIMEOUT");
          setGeoError("timeout");
        } else { // 2 = POSITION_UNAVAILABLE or other
          console.log("[Geolocation] Error: POSITION_UNAVAILABLE (or other)");
          setGeoError("unavailable");
        }
      },
      geoOptions
    );
  };

  // Nominatim forward search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`,
        { headers: { "Accept-Language": "en" } }
      );
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      if (data && data.length > 0) {
        const numLat = parseFloat(data[0].lat);
        const numLng = parseFloat(data[0].lon);
        if (mapRef.current && markerRef.current) {
          markerRef.current.setLatLng([numLat, numLng]);
          mapRef.current.setView([numLat, numLng], 15);
        }
        await handleMapInteraction(numLat, numLng);
      } else {
        alert("Location not found. Try a more specific search.");
      }
    } catch {
      alert("Search failed. Please check your connection.");
    } finally {
      setSearching(false);
    }
  };

  const geoErrorMessages: Record<string, string> = {
    permission_denied: "Permission denied by browser.",
    timeout: "Location request timed out.",
    unavailable: "Location unavailable from device.",
    unsupported: "Your browser does not support geolocation.",
  };

  if (!leafletLoaded) {
    return (
      <div
        className="w-full rounded-2xl bg-hive-cream/30 border border-hive-border flex items-center justify-center gap-2"
        style={{ height }}
      >
        <Loader2 className="w-5 h-5 animate-spin text-hive-amber" />
        <span className="text-xs text-hive-text-muted font-bold">Loading map...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      {!readOnly && (
        <>
          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search area, locality, city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs border border-hive-border/60 rounded-xl focus:outline-none focus:ring-1.5 focus:ring-hive-gold bg-white"
              />
              <MapPin className="w-4 h-4 text-hive-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="h-9 px-4 rounded-xl bg-hive-dark text-hive-gold text-xs font-bold flex items-center gap-1.5 hover:bg-hive-dark/90 transition-colors disabled:opacity-50"
            >
              {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              <span>Search</span>
            </button>
          </form>

          {/* Use Current Location button */}
          {showCurrentLocation && (
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={geoLoading}
              className="flex items-center gap-2 text-xs font-bold text-hive-amber hover:text-hive-gold transition-colors self-start disabled:opacity-50"
            >
              {geoLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Navigation className="w-4 h-4" />
              )}
              <span>{geoLoading ? "Getting your location..." : "Use Current Location"}</span>
            </button>
          )}

          {/* Geo error message */}
          {geoError && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{geoErrorMessages[geoError]}</span>
            </div>
          )}

          {/* Geocoding indicator */}
          {geocoding && (
            <div className="flex items-center gap-2 text-xs text-hive-text-muted font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-hive-amber" />
              <span>Looking up address...</span>
            </div>
          )}
        </>
      )}

      {/* Map */}
      <div
        ref={mapContainerRef}
        className="w-full rounded-2xl border border-hive-border overflow-hidden shadow-inner"
        style={{ height, zIndex: 10 }}
      />

      {!readOnly && (
        <p className="text-[10px] text-hive-text-muted leading-tight">
          💡 Tap anywhere on the map or drag the pin to set your exact delivery location.
        </p>
      )}
    </div>
  );
}
