"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { Search, MapPin, Loader2, Navigation, AlertCircle, X } from "lucide-react";
import { APIProvider, Map, AdvancedMarker, useMapsLibrary, useMap } from "@vis.gl/react-google-maps";
import { toast } from "@hive/utils";

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
  topOverlay?: React.ReactNode;
  children?: (props: { gpsButton: React.ReactNode }) => React.ReactNode;
}

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
    const types = component.types;
    if (types.includes("locality")) {
      city = component.long_name;
    } else if (types.includes("sublocality") || types.includes("sublocality_level_1") || types.includes("neighborhood")) {
      if (!locality) {
        locality = component.long_name;
      }
    } else if (types.includes("administrative_area_level_2") && !city) {
      city = component.long_name;
    }
    
    if (types.includes("administrative_area_level_1")) {
      state = component.long_name;
    }
    if (types.includes("postal_code")) {
      pincode = component.long_name;
    }
    if (types.includes("country")) {
      country = component.long_name;
    }
  }

  return {
    formattedAddress: result.formatted_address,
    locality: locality.trim(),
    city: city.trim(),
    state,
    pincode,
    country,
    source,
    precisionLevel: "exact",
    placeId: result.place_id,
  };
};

function PlaceAutocomplete({ 
  onPlaceSelect, 
  setActiveMapTab,
  lat,
  lng
}: { 
  onPlaceSelect: (place: google.maps.places.PlaceResult) => void;
  setActiveMapTab: (v: any) => void;
  lat?: number;
  lng?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const places = useMapsLibrary("places");
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!places || inputValue.trim().length === 0) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      try {
        setLoading(true);
        const { AutocompleteSuggestion } = places;
        if (!AutocompleteSuggestion) return;
        const response = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: inputValue,
          includedRegionCodes: ["in"],
          locationBias: (lat && lng) ? {
            radius: 30000,
            center: { lat, lng }
          } : undefined
        });
        setSuggestions(response.suggestions || []);
      } catch (err) {
        console.error("Error fetching suggestions:", err);
      } finally {
        setLoading(false);
      }
    };

    const delayDebounceFn = setTimeout(() => {
      fetchSuggestions();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [inputValue, places]);

  const handleSelectSuggestion = async (suggestion: any) => {
    const placeId = suggestion.placePrediction.placeId;
    const formattedText = suggestion.placePrediction.text.toString();
    setInputValue(formattedText);
    if (inputRef.current) {
      inputRef.current.value = formattedText;
    }
    setSuggestions([]);

    // Geocode to get lat/lng details
    try {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ placeId }, (results, status) => {
        if (status === "OK" && results && results[0]) {
          onPlaceSelect({
            geometry: {
              location: results[0].geometry.location
            },
            address_components: results[0].address_components,
            formatted_address: results[0].formatted_address,
            place_id: results[0].place_id
          } as any);
        } else {
          toast.error("Failed to load details for selected location.");
        }
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to load details for selected location.");
    }
  };

  const handleClear = () => {
    setInputValue("");
    setSuggestions([]);
    if (inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.focus();
    }
  };

  return (
    <div className="relative w-full rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] group z-50">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-hive-dark opacity-60 pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        placeholder="Search your area, building, or landmark..."
        className="w-full pl-11 pr-11 py-3.5 bg-white/95 backdrop-blur-xl border-0 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-hive-gold/50 transition-all text-hive-dark placeholder:text-hive-text-muted"
        onClick={() => setActiveMapTab("search")}
        onChange={(e) => setInputValue(e.target.value)}
      />
      {inputValue.length > 0 && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-hive-text-muted hover:text-hive-dark rounded-full hover:bg-slate-100 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-hive-gold"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Custom Suggestions Dropdown List */}
      {suggestions.length > 0 && (
        <div className="absolute left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-100 shadow-[0_12px_40px_rgba(0,0,0,0.12)] overflow-hidden max-h-60 overflow-y-auto z-[9999] pointer-events-auto">
          {suggestions.map((s, idx) => (
            <button
              key={s.placePrediction.placeId || idx}
              type="button"
              onClick={() => handleSelectSuggestion(s)}
              className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-b-0 flex items-start gap-3 text-xs text-hive-dark"
            >
              <MapPin className="w-4 h-4 text-hive-gold flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">
                  {s.placePrediction.text.toString().split(",")[0]}
                </p>
                <p className="text-[10px] text-hive-text-muted truncate mt-0.5">
                  {s.placePrediction.text.toString()}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MapPickerInner({
  lat,
  lng,
  onChange,
  onReverseGeocode,
  readOnly = false,
  height = "100%", // Default changed to full height
  topOverlay,
  children,
}: LocationMapPickerProps) {
  const [activeMapTab, setActiveMapTab] = useState<"search" | "gps" | "manual">("search");
  const [isDragging, setIsDragging] = useState(false);
  
  // GPS state
  const [geoLoading, setGeoLoading] = useState(false);
  const map = useMap();
  const geocodingLib = useMapsLibrary("geocoding");

  const center = { lat, lng };

  const handleMapClick = (e: any) => {
    if (readOnly || !e.detail || !e.detail.latLng) return;
    map?.panTo(e.detail.latLng);
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
      try {
        onReverseGeocode(extractGeocodeData([mockResult], "search"));
      } catch (err) {
        toast.error("Unable to identify this location. Please try pinning it manually.");
      }
    }
  }, [map, onChange, onReverseGeocode]);

  const requestGeolocation = useCallback(() => {
    setActiveMapTab("gps");
    
    if (!navigator.geolocation) {
      toast.error("Location services are not supported by your browser.");
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
            } else {
              toast.error("Unable to identify this location. Please search manually.");
            }
          });
        }
      },
      (error) => {
        setGeoLoading(false);
        if (error.code === error.PERMISSION_DENIED) {
          toast.error("Location access denied. Please enable in settings or search manually.");
        } else if (error.code === error.TIMEOUT) {
          toast.error("Location request timed out. Please try again.");
        } else {
          toast.error("Unable to fetch location. Please search manually.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [map, onChange, onReverseGeocode, geocodingLib]);

  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";

  return (
    <div className="absolute inset-0 w-full h-full">
      {/* Floating Controls Overlay - Rendered FIRST in DOM for correct Tab order (Search -> Chips -> FAB -> Map) */}
      {!readOnly && (
        <>
          {/* Top Search Bar */}
          <div className="absolute top-4 left-4 right-4 z-20">
            <PlaceAutocomplete onPlaceSelect={handlePlaceSelect} setActiveMapTab={setActiveMapTab} lat={lat} lng={lng} />
          </div>

          {/* Injected Top Overlay (Saved Address Chips) */}
          {topOverlay && (
            <div className="absolute top-[84px] inset-x-0 z-20 pointer-events-none">
              {topOverlay}
            </div>
          )}

          {/* Floating GPS Button */}
          {/* We create the button, but if children render prop is provided, we pass it down instead of rendering it here */}
          {(() => {
            const gpsButton = (
              <button
                type="button"
                onClick={requestGeolocation}
                disabled={geoLoading}
                aria-label="Use current location"
                className="flex items-center justify-center gap-2.5 px-5 py-3 bg-white rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:bg-slate-50 transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-hive-gold disabled:opacity-60 disabled:cursor-not-allowed border border-slate-100"
              >
                {geoLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-hive-gold" />
                ) : (
                  <Navigation className="w-4 h-4 text-hive-gold" />
                )}
                <span className="text-sm font-bold text-hive-dark">Locate Me</span>
              </button>
            );

            if (children) {
              return children({ gpsButton });
            }

            // Fallback default positioning if no children render prop is used
            return (
              <div className="absolute right-4 bottom-4 z-20 pointer-events-auto">
                {gpsButton}
              </div>
            );
          })()}
        </>
      )}

      {/* Map Container - Full Bleed */}
      <div className={`w-full h-full ${readOnly ? 'opacity-90' : ''}`} style={{ height }}>
        <Map
          mapId={mapId}
          defaultCenter={center}
          center={center}
          defaultZoom={14}
          zoom={14}
          onClick={handleMapClick}
          disableDefaultUI={true}
          zoomControl={false}
          gestureHandling={readOnly ? "none" : "greedy"}
          onDragstart={() => setIsDragging(true)}
          onIdle={(e: any) => {
            setIsDragging(false);
            if (!readOnly && e.map) {
              const centerLatLng = e.map.getCenter();
              if (centerLatLng) {
                const newLat = centerLatLng.lat();
                const newLng = centerLatLng.lng();
                if (onChange) onChange(newLat, newLng);
                if (onReverseGeocode && geocodingLib) {
                  const geocoder = new geocodingLib.Geocoder();
                  geocoder.geocode({ location: { lat: newLat, lng: newLng } }, (results: google.maps.GeocoderResult[] | null, status: google.maps.GeocoderStatus) => {
                    if (status === "OK" && results && results.length > 0) {
                      try {
                        onReverseGeocode(extractGeocodeData(results, "map_pin"));
                      } catch (err) {
                        toast.error("Unable to parse location details.");
                      }
                    } else if (status !== "ZERO_RESULTS") {
                      toast.error("Unable to identify this location. Please try again.");
                    }
                  });
                }
              }
            }
          }}
        />
        
        {/* Exact Center Overlay Pin */}
        <div 
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full pointer-events-none transition-transform duration-200 ease-out z-10 ${
            isDragging && !readOnly ? "-translate-y-[calc(100%+8px)] scale-105" : ""
          }`}
        >
          <MapPin className="w-9 h-9 text-hive-gold fill-hive-gold drop-shadow-lg" />
        </div>
        
        {readOnly && (
          <div className="absolute inset-0 bg-black/5 pointer-events-none" />
        )}
      </div>
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
