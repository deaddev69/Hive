"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { Search, MapPin, Loader2, Navigation, AlertCircle } from "lucide-react";
import { APIProvider, Map, AdvancedMarker, useMapsLibrary, useMap } from "@vis.gl/react-google-maps";

export interface ReverseGeocodeResult {
  formattedAddress: string;
  locality: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  precisionLevel?: "area" | "exact";
  source?: "popular_area" | "search" | "map_pin" | "gps" | "saved_address";
  placeId?: string;
}

export interface LocationMapPickerProps {
  lat: number;
  lng: number;
  onChange?: (lat: number, lng: number) => void;
  onReverseGeocode?: (result: ReverseGeocodeResult) => void;
  readOnly?: boolean;
  height?: string;
  showCurrentLocation?: boolean;
}

type GeoError = "permission_denied" | "timeout" | "unavailable" | "unsupported" | null;

const extractGeocodeData = (results: google.maps.GeocoderResult[], source: ReverseGeocodeResult["source"] = "map_pin"): ReverseGeocodeResult => {
  const result = results[0];
  if (!result) {
    throw new Error("Geocoding returned empty results.");
  }
  let locality = "";
  let city = "";
  let state = "";
  let pincode = "";
  let country = "";

  for (const component of result.address_components) {
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
    if (component.types.includes("country")) {
      country = component.long_name;
    }
  }

  return {
    formattedAddress: result.formatted_address,
    locality,
    city,
    state,
    pincode,
    country,
    source,
    precisionLevel: "exact",
    placeId: result.place_id,
  };
};

function PlaceAutocomplete({ onPlaceSelect, setActiveMapTab }: { onPlaceSelect: (place: google.maps.places.PlaceResult) => void, setActiveMapTab: (v: any) => void }) {
  const [placeAutocomplete, setPlaceAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const places = useMapsLibrary("places");

  useEffect(() => {
    if (!places || !inputRef.current) return;
    const options = {
      componentRestrictions: { country: "in" }
    };
    setPlaceAutocomplete(new places.Autocomplete(inputRef.current, options));
  }, [places]);

  useEffect(() => {
    if (!placeAutocomplete) return;
    const listener = placeAutocomplete.addListener('place_changed', () => {
      onPlaceSelect(placeAutocomplete.getPlace());
    });
    return () => {
      google.maps.event.removeListener(listener);
    }
  }, [onPlaceSelect, placeAutocomplete]);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-hive-text-muted" />
      <input
        ref={inputRef}
        type="text"
        placeholder="Search your area, building, or landmark..."
        className="w-full pl-10 pr-4 py-3 bg-white border border-hive-border rounded-xl text-sm focus:outline-none focus:border-hive-gold focus:ring-1 focus:ring-hive-gold transition-all"
        onClick={() => setActiveMapTab("search")}
      />
    </div>
  );
}

function MapPickerInner({
  lat,
  lng,
  onChange,
  onReverseGeocode,
  readOnly = false,
  height = "300px",
}: LocationMapPickerProps) {
  const [activeMapTab, setActiveMapTab] = useState<"search" | "gps" | "manual">("search");
  
  // GPS state
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<GeoError>(null);
  const map = useMap();
  const geocodingLib = useMapsLibrary("geocoding");

  const center = { lat, lng };

  const handleMapClick = (e: any) => {
    if (readOnly || !e.detail || !e.detail.latLng) return;
    const newLat = e.detail.latLng.lat;
    const newLng = e.detail.latLng.lng;
    
    if (onChange) onChange(newLat, newLng);

    if (onReverseGeocode && geocodingLib) {
      const geocoder = new geocodingLib.Geocoder();
      geocoder.geocode({ location: { lat: newLat, lng: newLng } }, (results: google.maps.GeocoderResult[] | null, status: google.maps.GeocoderStatus) => {
        if (status === "OK" && results && results.length > 0) {
          onReverseGeocode(extractGeocodeData(results, "map_pin"));
        }
      });
    }
  };

  const handlePlaceSelect = useCallback((place: google.maps.places.PlaceResult) => {
    if (!place.geometry || !place.geometry.location) return;

    const newLat = place.geometry.location.lat();
    const newLng = place.geometry.location.lng();

    if (onChange) onChange(newLat, newLng);
    map?.panTo({ lat: newLat, lng: newLng });
    map?.setZoom(15);

    if (onReverseGeocode && place.address_components) {
      // Construct a mock GeocoderResult to reuse extraction logic
      const mockResult: any = {
        address_components: place.address_components,
        formatted_address: place.formatted_address,
        place_id: place.place_id
      };
      onReverseGeocode(extractGeocodeData([mockResult], "search"));
    }
  }, [map, onChange, onReverseGeocode]);

  const requestGeolocation = useCallback(() => {
    setGeoError(null);
    setActiveMapTab("gps");
    
    if (!navigator.geolocation) {
      setGeoError("unsupported");
      return;
    }

    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeoLoading(false);
        const { latitude, longitude } = position.coords;
        if (onChange) onChange(latitude, longitude);
        map?.panTo({ lat: latitude, lng: longitude });
        map?.setZoom(16);

        if (onReverseGeocode && geocodingLib) {
          const geocoder = new geocodingLib.Geocoder();
          geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results: google.maps.GeocoderResult[] | null, status: google.maps.GeocoderStatus) => {
            if (status === "OK" && results && results.length > 0) {
              onReverseGeocode(extractGeocodeData(results, "gps"));
            }
          });
        }
      },
      (error) => {
        setGeoLoading(false);
        if (error.code === error.PERMISSION_DENIED) setGeoError("permission_denied");
        else if (error.code === error.TIMEOUT) setGeoError("timeout");
        else setGeoError("unavailable");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [map, onChange, onReverseGeocode, geocodingLib]);

  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";

  return (
    <div className="flex flex-col space-y-3">
      {/* Search / GPS Controls */}
      {!readOnly && (
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <PlaceAutocomplete onPlaceSelect={handlePlaceSelect} setActiveMapTab={setActiveMapTab} />
          </div>

          <button
            type="button"
            onClick={requestGeolocation}
            disabled={geoLoading}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-hive-border rounded-xl text-sm font-medium hover:bg-hive-light/50 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {geoLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-hive-gold" />
            ) : (
              <Navigation className="w-4 h-4 text-hive-gold" />
            )}
            Use Current Location
          </button>
        </div>
      )}

      {/* Map Container */}
      <div 
        className={`relative w-full rounded-2xl overflow-hidden border border-hive-border shadow-sm ${readOnly ? 'opacity-90' : ''}`}
        style={{ height }}
      >
        <Map
          mapId={mapId}
          defaultCenter={center}
          center={center}
          defaultZoom={14}
          zoom={14}
          onClick={handleMapClick}
          disableDefaultUI={true}
          zoomControl={true}
          gestureHandling={readOnly ? "none" : "greedy"}
        >
          <AdvancedMarker position={center} />
        </Map>
        
        {readOnly && (
          <div className="absolute inset-0 bg-black/5 pointer-events-none" />
        )}
      </div>

      {geoError === "permission_denied" && (
        <p className="text-xs text-red-500 flex items-center gap-1.5 mt-1">
          <AlertCircle className="w-3.5 h-3.5" />
          Location permission denied. Please enable it in your browser settings or search manually.
        </p>
      )}
    </div>
  );
}

export default function LocationMapPicker(props: LocationMapPickerProps) {
  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY || ""}>
      <MapPickerInner {...props} />
    </APIProvider>
  );
}
