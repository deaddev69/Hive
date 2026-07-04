"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { Search, MapPin, Loader2 } from "lucide-react";
import { Button } from "@hive/ui";
import { GoogleMap, useJsApiLoader, Marker, Autocomplete } from "@react-google-maps/api";
import { browserLocationCache } from "@hive/utils";
import { useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";

interface PlaceDetails {
  name: string;
  address: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
  lat: number;
  lng: number;
  eLoc?: string;
}

interface BoutiqueMapProps {
  lat: number;
  lng: number;
  onChange?: (lat: number, lng: number) => void;
  onSelectPlace?: (place: PlaceDetails) => void;
  readOnly?: boolean;
}

const libraries: ("places" | "geometry" | "drawing" | "visualization")[] = ["places"];

export default function BoutiqueMap({ lat, lng, onChange, onSelectPlace, readOnly = false }: BoutiqueMapProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY || "",
    libraries,
  });

  const [activeMapTab, setActiveMapTab] = useState<"search" | "gps" | "manual">("search");
  
  // GPS state
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  
  const mapRef = useRef<google.maps.Map | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const reverseGeocode = useAction(api.location.reverseGeocode);

  const initialLat = lat || 10.0159; // Default Kakkanad, Ernakulam
  const initialLng = lng || 76.3419;

  const handleMapInteraction = useCallback(
    async (clickLat: number, clickLng: number) => {
      onChange?.(clickLat, clickLng);

      if (onSelectPlace) {
        // 1. Check local cache
        const cached = browserLocationCache.get(clickLat, clickLng);
        if (cached) {
          onSelectPlace({
            name: cached.area || "Shop Location",
            address: cached.address || "",
            area: cached.area || "",
            city: cached.city || "Kochi",
            state: cached.state || "Kerala",
            pincode: cached.pincode || "",
            lat: clickLat,
            lng: clickLng,
            eLoc: cached.placeId,
          });
          return;
        }

        // 2. Fetch from backend (which now uses Convex Action securely)
        try {
          const data = await reverseGeocode({ lat: clickLat, lng: clickLng });
            
          browserLocationCache.set(clickLat, clickLng, {
            placeId: data.eLoc,
            address: data.formattedAddress,
            area: data.locality,
            city: data.city,
            state: data.state,
            pincode: data.pincode,
            lat: clickLat,
            lng: clickLng
          });

          onSelectPlace({
            name: data.locality || "Shop Location",
            address: data.formattedAddress || "",
            area: data.locality || "",
            city: data.city || "Kochi",
            state: data.state || "Kerala",
            pincode: data.pincode || "",
            lat: clickLat,
            lng: clickLng,
            eLoc: data.eLoc,
          });
        } catch (err) {
          console.error("Reverse geocoding interaction error in BoutiqueMap:", err);
        }
      }
    },
    [onChange, onSelectPlace]
  );

  const handleDragEnd = (e: google.maps.MapMouseEvent) => {
    if (readOnly || !e.latLng) return;
    const newLat = e.latLng.lat();
    const newLng = e.latLng.lng();
    
    // Update parent coordinates instantly so marker moves
    if (onChange) onChange(newLat, newLng);

    // Debounce the reverse geocoding API call by 400ms to save costs
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      handleMapInteraction(newLat, newLng);
    }, 400);
  };

  const handlePlaceChanged = () => {
    if (autocompleteRef.current !== null) {
      const place = autocompleteRef.current.getPlace();
      if (place && place.geometry && place.geometry.location) {
        const searchLat = place.geometry.location.lat();
        const searchLng = place.geometry.location.lng();
        
        onChange?.(searchLat, searchLng);
        mapRef.current?.panTo({ lat: searchLat, lng: searchLng });

        if (onSelectPlace) {
          let locality = "";
          let city = "";
          let state = "";
          let pincode = "";

          for (const component of place.address_components || []) {
            if (component.types.includes("locality") || component.types.includes("sublocality")) {
              locality = locality || component.long_name;
              city = city || component.long_name;
            }
            if (component.types.includes("administrative_area_level_1")) {
              state = component.long_name;
            }
            if (component.types.includes("postal_code")) {
              pincode = component.long_name;
            }
          }

          onSelectPlace({
            name: place.name || locality || "Selected Location",
            address: place.formatted_address || "",
            area: locality || place.name || "",
            city: city || "Kochi",
            state: state || "Kerala",
            pincode: pincode || "",
            lat: searchLat,
            lng: searchLng,
            eLoc: place.place_id,
          });
        }
      }
    }
  };

  const handleUseCurrentLocation = () => {
    setGeoError(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser.");
      return;
    }

    setGeoLoading(true);

    const successCallback = async (position: GeolocationPosition) => {
      const { latitude, longitude } = position.coords;
      onChange?.(latitude, longitude);
      mapRef.current?.panTo({ lat: latitude, lng: longitude });
      await handleMapInteraction(latitude, longitude);
      setGeoLoading(false);
    };

    const errorCallback = (error: GeolocationPositionError) => {
      setGeoLoading(false);
      if (error.code === 1) {
        setGeoError("Location permission denied.");
      } else {
        setGeoError("Failed to retrieve location details.");
      }
    };

    navigator.geolocation.getCurrentPosition(successCallback, errorCallback, { enableHighAccuracy: true, timeout: 10000 });
  };

  if (loadError) {
    return (
      <div className="h-[300px] w-full bg-slate-50 border border-dashed border-red-200 rounded-xl flex flex-col items-center justify-center gap-2 text-center p-4">
        <span className="text-sm font-bold text-red-500">Map unavailable (Script failed to load)</span>
        <span className="text-xs text-slate-500">Please enter your address manually or check your network connection.</span>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="h-[300px] w-full bg-slate-50 border border-dashed border-slate-200 rounded-xl flex items-center justify-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-hive-amber" />
        <span className="text-sm font-bold text-slate-500">Loading Google Maps...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Input Selection Mode Tabs */}
      {!readOnly && (
        <div className="flex border border-slate-200 rounded-xl p-0.5 bg-slate-50 gap-0.5 text-xs font-bold shadow-sm">
          <button
            type="button"
            onClick={() => setActiveMapTab("search")}
            className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeMapTab === "search"
                ? "bg-white text-slate-900 shadow-sm border border-slate-200/50"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Search Location
          </button>
          <button
            type="button"
            onClick={() => setActiveMapTab("gps")}
            className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeMapTab === "gps"
                ? "bg-white text-slate-900 shadow-sm border border-slate-200/50"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Detect GPS
          </button>
          <button
            type="button"
            onClick={() => setActiveMapTab("manual")}
            className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeMapTab === "manual"
                ? "bg-white text-slate-900 shadow-sm border border-slate-200/50"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Manual Pin
          </button>
        </div>
      )}

      {!readOnly && activeMapTab === "search" && (
        <div className="relative flex flex-col gap-2">
          <Autocomplete
            onLoad={(autocomplete) => {
              autocompleteRef.current = autocomplete;
              // Bias search results to India/Kerala if possible
              autocomplete.setComponentRestrictions({ country: "in" });
            }}
            onPlaceChanged={handlePlaceChanged}
            options={{ fields: ["address_components", "geometry", "icon", "name", "formatted_address", "place_id"] }}
          >
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Search shop address..."
                className="w-full px-4 py-2 pl-10 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-hive-amber/30 text-slate-900"
              />
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            </div>
          </Autocomplete>
        </div>
      )}

      {!readOnly && activeMapTab === "gps" && (
        <div className="flex flex-col gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl items-center text-center">
          <p className="text-xs text-slate-500">Center the map on your exact coordinates using the browser location.</p>
          <Button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={geoLoading}
            className="flex items-center gap-2 text-xs py-1.5 cursor-pointer"
          >
            {geoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
            {geoLoading ? "Detecting Coordinates..." : "Center on My Location"}
          </Button>
          {geoError && <p className="text-[10px] font-bold text-red-600 mt-1">⚠️ {geoError}</p>}
        </div>
      )}

      {!readOnly && activeMapTab === "manual" && (
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-left">
          <h4 className="text-xs font-bold text-slate-900">Draggable Pin Drop Active</h4>
          <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
            Drag the pin to place your shop location on the map.
          </p>
        </div>
      )}

      <div className="w-full rounded-xl border border-slate-200 overflow-hidden shadow-inner">
        <GoogleMap
          mapContainerStyle={{ width: "100%", height: "300px" }}
          center={{ lat: initialLat, lng: initialLng }}
          zoom={15}
          onLoad={(map) => { mapRef.current = map as any; }}
          options={{
            disableDefaultUI: false,
            zoomControl: true,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
          }}
        >
          <Marker
            position={{ lat: initialLat, lng: initialLng }}
            draggable={!readOnly}
            onDragEnd={handleDragEnd}
            icon={{
              path: "M 0,0 C -2,-20 -10,-22 -10,-30 A 10,10 0 1,1 10,-30 C 10,-22 2,-20 0,0 z",
              fillColor: "#F5A623",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2,
              scale: 1,
            }}
          />
        </GoogleMap>
      </div>
    </div>
  );
}
