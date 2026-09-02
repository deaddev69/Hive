"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { Search, MapPin, Loader2, Navigation, AlertCircle, X, Plus, Minus } from "lucide-react";
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
  hidePOIs?: boolean;
  topOverlay?: React.ReactNode;
  children?: (props: { gpsButton: React.ReactNode }) => React.ReactNode;
}

// `useMapsLibrary("geocoding")` returns undefined until its dynamic import resolves, which can
// still be in flight the instant a shopper taps "Locate Me" (permission prompt + first render
// happen before the library script has loaded). Gating on that hook's value meant the reverse
// geocode was silently skipped on that first tap — no error, just nothing, so the confirm sheet
// never appeared and the tap looked like it did nothing. `importLibrary` is promise-based and
// idempotent (repeat calls resolve instantly once loaded), so it never races the hook's state.
let geocodingLibraryPromise: Promise<google.maps.GeocodingLibrary> | null = null;
function loadGeocoder(): Promise<google.maps.Geocoder> {
  if (!geocodingLibraryPromise) {
    geocodingLibraryPromise = google.maps.importLibrary("geocoding") as Promise<google.maps.GeocodingLibrary>;
  }
  return geocodingLibraryPromise.then((lib) => new lib.Geocoder());
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
  hidePOIs = true,
  topOverlay,
  children,
}: LocationMapPickerProps) {
  const [activeMapTab, setActiveMapTab] = useState<"search" | "gps" | "manual">("search");
  const [isDragging, setIsDragging] = useState(false);
  // Google needs a beat to fetch its first tiles. Until then the container paints plain white,
  // and the pin and controls sit on top of nothing — which reads as a broken map rather than a
  // loading one. Tracked off the real `tilesloaded` event rather than a timer so the placeholder
  // clears exactly when there's something to show.
  const [tilesLoaded, setTilesLoaded] = useState(false);

  // GPS state
  const [geoLoading, setGeoLoading] = useState(false);
  const map = useMap();

  // Initial camera only. Deliberately NOT passed as the controlled `center`/`zoom` props — see
  // the <Map> block below for why.
  const initialCenter = useRef({ lat, lng }).current;

  // The last centre this component itself reported upward via onChange. Incoming lat/lng that
  // matches it is our own echo coming back through props, and must not trigger a re-pan.
  const lastEmittedRef = useRef<{ lat: number; lng: number } | null>(null);

  // Whether the camera moved because the user dragged, as opposed to a programmatic panTo from
  // search / GPS / a saved-address chip. Only user drags should trigger reverse geocoding.
  const userDraggedRef = useRef(false);

  const geocodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
  }, []);

  // Safety valve for the tile placeholder. `tilesloaded` never fires if Maps fails to initialise
  // at all — an unauthorised referer, a blocked key, no network — and without this the shopper
  // would sit behind "Loading map…" indefinitely with no way to reach the pin. Reveal the map
  // regardless after a few seconds so the failure degrades to the previous behaviour instead of
  // becoming a dead end; the search box and Locate Me stay usable either way.
  useEffect(() => {
    if (tilesLoaded) return;
    const t = setTimeout(() => setTilesLoaded(true), 6000);
    return () => clearTimeout(t);
  }, [tilesLoaded]);

  // Follow externally-driven coordinate changes (saved address selected, parent reset) by panning
  // imperatively. This replaces the controlled `center` prop, which used to re-assert a stale
  // position on every render.
  useEffect(() => {
    if (!map) return;
    const last = lastEmittedRef.current;
    if (last && Math.abs(last.lat - lat) < 1e-6 && Math.abs(last.lng - lng) < 1e-6) return;
    map.panTo({ lat, lng });
  }, [map, lat, lng]);

  // POI & transit hiding styles. Deliberately not using a Cloud-based `mapId` here — Google
  // Maps ignores inline `styles` whenever a mapId is present (styling then has to be configured
  // per-mapId in the Cloud Console instead), and nothing on this map needs a mapId otherwise
  // (no AdvancedMarker in use), so this stays the one reliable way to actually hide POI/transit
  // clutter on the delivery-address picker.
  const poiStyles: google.maps.MapTypeStyle[] = hidePOIs
    ? [
        {
          featureType: "poi",
          elementType: "all",
          stylers: [{ visibility: "off" }],
        },
        {
          featureType: "transit",
          elementType: "labels",
          stylers: [{ visibility: "off" }],
        },
      ]
    : [];

  const handleMapClick = (e: any) => {
    if (readOnly) return;
    const latLng = e.detail?.latLng || e.latLng;
    if (!latLng) return;
    const clickLat = typeof latLng.lat === "function" ? latLng.lat() : latLng.lat;
    const clickLng = typeof latLng.lng === "function" ? latLng.lng() : latLng.lng;
    if (typeof clickLat === "number" && typeof clickLng === "number") {
      // Tapping the map is a deliberate re-pin, so the resulting idle should reverse-geocode
      // exactly as a drag would.
      userDraggedRef.current = true;
      if (onChange) onChange(clickLat, clickLng);
      map?.panTo({ lat: clickLat, lng: clickLng });
    }
  };

  const handleZoomIn = () => {
    if (map) {
      const currentZoom = map.getZoom() || 14;
      map.setZoom(currentZoom + 1);
    }
  };

  const handleZoomOut = () => {
    if (map) {
      const currentZoom = map.getZoom() || 14;
      map.setZoom(currentZoom - 1);
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

        if (onReverseGeocode) {
          loadGeocoder()
            .then((geocoder) => {
              geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results: google.maps.GeocoderResult[] | null, status: google.maps.GeocoderStatus) => {
                if (status === "OK" && results && results.length > 0) {
                  onReverseGeocode(extractGeocodeData(results, "gps"));
                } else {
                  toast.error("Unable to identify this location. Please search manually.");
                }
              });
            })
            .catch(() => {
              toast.error("Unable to identify this location. Please search manually.");
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
  }, [map, onChange, onReverseGeocode]);

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

          {/* Floating Touch-Friendly Zoom Buttons (Middle-Right) */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2 pointer-events-auto">
            <button
              type="button"
              onClick={handleZoomIn}
              aria-label="Zoom in"
              className="w-11 h-11 bg-white hover:bg-slate-50 active:scale-95 rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.12)] border border-slate-100 flex items-center justify-center text-slate-800 transition-all select-none cursor-pointer"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              aria-label="Zoom out"
              className="w-11 h-11 bg-white hover:bg-slate-50 active:scale-95 rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.12)] border border-slate-100 flex items-center justify-center text-slate-800 transition-all select-none cursor-pointer"
            >
              <Minus className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        </>
      )}

      {/* Map Container - Full Bleed */}
      <div className={`w-full h-full ${readOnly ? 'opacity-90' : ''}`} style={{ height }}>
        {/* Camera is UNCONTROLLED on purpose. Passing `center`/`zoom` as props makes this a
            controlled component, and every re-render then re-asserts them — which broke both
            gestures: `zoom` was a hardcoded literal so pinch-zoom (and the +/- buttons, which
            call map.setZoom imperatively) always snapped back to 14, and `onDragstart` setting
            React state mid-gesture re-applied the PRE-drag centre, yanking the map back under
            the user's finger. External coordinate changes are now driven imperatively by the
            panTo effect above instead. */}
        <Map
          defaultCenter={initialCenter}
          defaultZoom={14}
          onClick={handleMapClick}
          disableDefaultUI={true}
          clickableIcons={!hidePOIs}
          styles={poiStyles}
          zoomControl={false}
          gestureHandling={readOnly ? "none" : "greedy"}
          onTilesLoaded={() => setTilesLoaded(true)}
          onDragstart={() => {
            setIsDragging(true);
            userDraggedRef.current = true;
          }}
          onIdle={(e: any) => {
            setIsDragging(false);
            if (readOnly || !e.map) return;

            // Only react to camera moves the user actually made. Programmatic pans (search
            // result, GPS, saved address) already reported a richer result upstream — letting
            // them fall through to here fired a second billed Geocoding call whose coarser
            // "map_pin" answer overwrote the precise "search"/"gps" one.
            if (!userDraggedRef.current) return;
            userDraggedRef.current = false;

            const centerLatLng = e.map.getCenter();
            if (!centerLatLng) return;
            const newLat = centerLatLng.lat();
            const newLng = centerLatLng.lng();

            lastEmittedRef.current = { lat: newLat, lng: newLng };
            if (onChange) onChange(newLat, newLng);

            if (onReverseGeocode) {
              // Debounced: idle can fire repeatedly while a flick decelerates.
              if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
              geocodeTimerRef.current = setTimeout(() => {
                loadGeocoder().then((geocoder) => {
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
                }).catch(() => {
                  toast.error("Unable to identify this location. Please try again.");
                });
              }, 250);
            }
          }}
        />
        
        {/* Tile-loading placeholder. Sits above the map and the pin but below the search bar
            (z-20), so the shopper can start typing an address before tiles arrive. Fades rather
            than cutting, and stays mounted-but-transparent so removing it can't itself flash. */}
        <div
          aria-hidden="true"
          className={`absolute inset-0 z-[15] pointer-events-none transition-opacity duration-500 ${
            tilesLoaded ? "opacity-0" : "opacity-100"
          }`}
        >
          <div className="absolute inset-0 bg-hive-cream" />
          {/* Suggestion of streets, so the gap reads as a map arriving rather than a blank panel. */}
          <div
            className="absolute inset-0 opacity-[0.55]"
            style={{
              backgroundImage:
                "linear-gradient(90deg, rgba(28,25,23,0.07) 2px, transparent 2px), linear-gradient(180deg, rgba(28,25,23,0.07) 2px, transparent 2px), linear-gradient(58deg, transparent 46%, rgba(28,25,23,0.05) 46%, rgba(28,25,23,0.05) 52%, transparent 52%)",
              backgroundSize: "84px 84px, 84px 84px, 100% 100%",
            }}
          />
          <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-transparent via-white/40 to-transparent" />
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/90 backdrop-blur-sm shadow-sm border border-hive-border/50">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-hive-gold" />
            <span className="text-[11px] font-bold text-hive-dark">Loading map…</span>
          </div>
        </div>

        {/* Swiggy-Style Fixed Center Pin. Held back until tiles exist — a pin floating on a blank
            white panel is what made the load gap look like a failure rather than a wait. */}
        {!readOnly && tilesLoaded && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full pointer-events-none z-10 flex flex-col items-center select-none animate-in fade-in duration-300">
            {/* Floating Badge */}
            <div className={`bg-[#EAB308] text-black text-[10px] font-extrabold px-3 py-1 rounded-full shadow-md mb-1.5 border border-black/10 uppercase tracking-wider transition-transform duration-200 ${isDragging ? '-translate-y-2 scale-105 shadow-xl' : 'translate-y-0'}`}>
              Delivering Here
            </div>

            {/* Pin Head */}
            <div className={`w-8 h-8 bg-[#EAB308] rounded-full flex items-center justify-center shadow-lg border-2 border-white transition-transform duration-200 ${isDragging ? '-translate-y-2 scale-105 shadow-xl' : 'translate-y-0'}`}>
              <div className="w-2.5 h-2.5 bg-black rounded-full" />
            </div>

            {/* Pin Stem & Shadow */}
            <div className={`w-1 h-3 bg-[#EAB308] transition-transform duration-200 ${isDragging ? '-translate-y-2' : 'translate-y-0'}`} />
            <div className={`w-3 h-1 bg-black/20 rounded-full blur-[1px] transition-all duration-200 ${isDragging ? 'scale-125 opacity-40' : 'scale-100 opacity-70'}`} />
          </div>
        )}
        
        {readOnly && (
          <div className="absolute inset-0 bg-black/5 pointer-events-none" />
        )}
      </div>
    </div>
  );
}

export function LocationMapPicker(props: LocationMapPickerProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY || "";
  return (
    <APIProvider apiKey={apiKey}>
      <MapPickerInner {...props} />
    </APIProvider>
  );
}

export default LocationMapPicker;
