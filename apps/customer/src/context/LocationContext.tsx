"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useAction, useConvex } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useSessionStore } from "./SessionContext";
import { isWithinDeliveryRadius } from "../../../../convex/lib/serviceability";
import { calculateDistanceKm } from "@/lib/distance";
import { safeGetItem, safeSetItem, safeRemoveItem } from "@/lib/safeStorage";

export interface LocationState {
  pincode: string | null;
  regionName: string | null;
  locality: string | null;
  isGateOpen: boolean;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  stateName: string | null;
  country: string | null;
  postcode: string | null;
  isDrawerOpen: boolean;
  /** When true, delivery-radius filtering is bypassed and ALL products are shown. */
  browseAllProducts: boolean;
}

export interface LocationContextType extends LocationState {
  isServiceable: boolean;
  serviceableBoutiqueCount: number;
  setGateOpen: (open: boolean) => void;
  setDrawerOpen: (open: boolean) => void;
  setBrowseAllProducts: (v: boolean) => void;
  updateLocationDetails: (data: {
    latitude: number;
    longitude: number;
    locality?: string;
    city: string;
    state: string;
    country: string;
    postcode: string;
  }) => Promise<void>;
  detectLocation: () => Promise<{ success: boolean; error?: string }>;
  clearLocation: () => void;
  geocodePincode: (pincode: string) => Promise<{ success: boolean; error?: string }>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, token } = useSessionStore();
  const convex = useConvex();
  const saveLocation = useMutation(api.userLocations.save);
  const requestService = useMutation(api.serviceability.requestService);
  const dbLocation = useQuery(api.userLocations.get, { token: token || undefined });
  const dbBoutiques = useQuery(api.boutiques.getApprovedBoutiques) ?? [];
  const resolveRoadDistances = useAction(api.routing.resolveRoadDistancesAction);
  const reverseGeocode = useAction(api.location.reverseGeocode);

  const [state, setState] = useState<LocationState>({
    pincode: null,
    regionName: null,
    locality: null,
    isGateOpen: false,
    latitude: null,
    longitude: null,
    city: null,
    stateName: null,
    country: null,
    postcode: null,
    isDrawerOpen: false,
    browseAllProducts: false,
  });

  const [hasLoadedInit, setHasLoadedInit] = useState(false);

  const serviceableBoutiques = useMemo(() => {
    if (state.latitude === null || state.longitude === null) return [];
    if (dbBoutiques.length === 0) return [];

    return dbBoutiques.filter((b) => 
      isWithinDeliveryRadius(state.latitude, state.longitude, b)
    );
  }, [state.latitude, state.longitude, dbBoutiques]);

  const isLocationServiceable = useMemo(() => {
    if (state.latitude === null || state.longitude === null) return true;
    return serviceableBoutiques.length > 0;
  }, [state.latitude, state.longitude, serviceableBoutiques]);

  const serviceableBoutiqueCount = useMemo(() => {
    return serviceableBoutiques.length;
  }, [serviceableBoutiques]);

  // 1. Load from localStorage on mount
  useEffect(() => {
    const saved = safeGetItem("hive_location");
    const browseAll = safeGetItem("hive_browse_all") === "true";
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setState((prev) => ({
          ...prev,
          pincode: parsed.postcode || parsed.pincode || null,
          regionName: parsed.regionName || parsed.locality || parsed.city || null,
          locality: parsed.locality || null,
          isGateOpen: false,
          latitude: parsed.latitude || null,
          longitude: parsed.longitude || null,
          city: parsed.city || null,
          stateName: parsed.state || parsed.stateName || null,
          country: parsed.country || null,
          postcode: parsed.postcode || parsed.pincode || null,
          browseAllProducts: browseAll,
        }));
        setHasLoadedInit(true);
      } catch (e) {
        console.error("Failed to parse saved location", e);
        setHasLoadedInit(true);
      }
    } else {
      setState((prev) => ({ ...prev, browseAllProducts: browseAll }));
      setHasLoadedInit(true);
    }
  }, []);

  // 2. Fallback to Convex saved location if localStorage is empty and user is logged in
  useEffect(() => {
    if (!hasLoadedInit) return;
    
    // If we already have a location in state, don't override with DB
    if (state.postcode) return;

    // Wait until dbLocation query resolves
    if (dbLocation === undefined) return;

    if (dbLocation) {
      const dbLocality = (dbLocation as any).locality || "";
      const regionName = dbLocality || dbLocation.city;
      
      const checkDbLoc = async () => {
        const locationData = {
          latitude: dbLocation.latitude,
          longitude: dbLocation.longitude,
          locality: dbLocality,
          city: dbLocation.city,
          state: dbLocation.state,
          country: dbLocation.country,
          postcode: dbLocation.postcode,
          pincode: dbLocation.postcode,
          regionName,
        };

        safeSetItem("hive_location", JSON.stringify(locationData));
        setState((prev) => ({
          ...prev,
          pincode: dbLocation.postcode,
          regionName,
          locality: dbLocality || null,
          isGateOpen: false,
          latitude: dbLocation.latitude,
          longitude: dbLocation.longitude,
          city: dbLocation.city,
          stateName: dbLocation.state,
          country: dbLocation.country,
          postcode: dbLocation.postcode,
        }));
      };
      
      checkDbLoc();
    } else {
      // No location anywhere, open the onboarding gate
      if (!state.isGateOpen) {
        setState((prev) => ({ ...prev, isGateOpen: true }));
      }
    }
  }, [dbLocation, hasLoadedInit, state.postcode]);

  // Trigger background road routing when coordinates change
  useEffect(() => {
    if (state.latitude !== null && state.longitude !== null) {
      resolveRoadDistances({
        userLat: state.latitude,
        userLng: state.longitude,
      }).catch((err) => {
        const errMsg = err?.message || String(err);
        if (errMsg.includes("Connection lost") || errMsg.includes("closed")) {
          console.warn("Background road distance resolution interrupted by connection drop.");
        } else {
          console.error("Failed to resolve road distances in background:", err);
        }
      });
    }
  }, [state.latitude, state.longitude, resolveRoadDistances]);

  const setGateOpen = useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, isGateOpen: open }));
  }, []);

  const setDrawerOpen = useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, isDrawerOpen: open }));
  }, []);

  const setBrowseAllProducts = useCallback((v: boolean) => {
    safeSetItem("hive_browse_all", v ? "true" : "false");
    setState((prev) => ({ ...prev, browseAllProducts: v }));
  }, []);

  const updateLocationDetails = useCallback(async (data: {
    latitude: number;
    longitude: number;
    locality?: string;
    city: string;
    state: string;
    country: string;
    postcode: string;
  }) => {
    const regionName = data.locality || data.city;
    const locationData = {
      latitude: data.latitude,
      longitude: data.longitude,
      locality: data.locality || "",
      city: data.city,
      state: data.state,
      country: data.country,
      postcode: data.postcode,
      pincode: data.postcode,
      regionName,
    };

    safeSetItem("hive_location", JSON.stringify(locationData));
    safeSetItem("hive_customer_pincode", data.postcode);
    safeSetItem("hive_customer_region", regionName);

    // Reset browse-all mode when the user explicitly sets a new delivery location
    safeSetItem("hive_browse_all", "false");
    setState((prev) => ({
      ...prev,
      pincode: data.postcode,
      regionName,
      locality: data.locality || null,
      isGateOpen: false,
      latitude: data.latitude,
      longitude: data.longitude,
      city: data.city,
      stateName: data.state,
      country: data.country,
      postcode: data.postcode,
      browseAllProducts: false,
    }));

    // Log unserviceable location searches for analytics
    const isServiceableLoc = dbBoutiques.some((b) => {
      const bLat = b.latitude ?? b.addressDetails?.lat;
      const bLng = b.longitude ?? b.addressDetails?.lng;
      if (bLat === undefined || bLng === undefined) return false;
      const dist = calculateDistanceKm(data.latitude, data.longitude, bLat, bLng);
      return dist <= (b.deliveryRadiusKm ?? 15);
    });

    if (!isServiceableLoc) {
      try {
        await requestService({
          city: data.city,
          state: data.state,
          latitude: data.latitude,
          longitude: data.longitude,
        });
        console.log('[Analytics] Logged unserviceable location demand:', data.city);
      } catch (err) {
        console.error("Failed to log unserviceable location demand:", err);
      }
    }

    if (isAuthenticated) {
      try {
        await saveLocation({
          latitude: data.latitude,
          longitude: data.longitude,
          locality: data.locality || "",
          city: data.city,
          state: data.state,
          country: data.country,
          postcode: data.postcode,
          token: token || undefined,
        });
      } catch (err) {
        console.error("Failed to save location to Convex:", err);
      }
    }
  }, [isAuthenticated, saveLocation, requestService, dbBoutiques]);

  const detectLocation = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ success: false, error: "Geolocation is not supported by your browser." });
        return;
      }

      // enableHighAccuracy must stay true: on Android Chrome it's what makes the browser offer
      // Google Play Services' native "Turn on Location Accuracy" system dialog when device
      // location is off, instead of just failing straight to an error message — a much better
      // recovery path than anything the page can build itself. maximumAge softens the resulting
      // slower cold-start lock by letting a position from the last minute return instantly on a
      // repeat tap instead of forcing a brand-new fix every time.
      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      };

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          setState((prev) => ({
            ...prev,
            latitude,
            longitude,
          }));

          try {
            const data = await reverseGeocode({ lat: latitude, lng: longitude });

            const locality = data.locality || "";
            const city = data.city || "Kochi";
            const state = data.state || "Kerala";
            const country = data.country || "India";
            const postcode = data.pincode || "";

            await updateLocationDetails({
              latitude,
              longitude,
              locality,
              city,
              state,
              country,
              postcode,
            });

            resolve({ success: true });
          } catch (err: any) {
            console.error("Reverse geocoding error:", err);
            resolve({ success: false, error: "Could not resolve address. Please try again." });
          }
        },
        (error) => {
          console.warn('[Geolocation] getCurrentPosition Error: Code = ' + error.code + ', Message = ' + error.message);
          const getErrorMessage = (code: number) => {
            switch(code) {
              case 1: return "Location permission denied. Please allow location access in your browser settings and try again.";
              case 2: return "Your device's location (GPS) is turned off. Please turn it on in your device settings and try again.";
              case 3: return "Location request timed out. Please check your connection and try again.";
              default: return "Could not determine your location. Please try again.";
            }
          };
          resolve({ success: false, error: getErrorMessage(error.code) });
        },
        options
      );
    });
  }, [updateLocationDetails]);

  const geocodePincode = useCallback(async (pincode: string): Promise<{ success: boolean; error?: string }> => {
    if (!/^\d{6}$/.test(pincode)) {
      return { success: false, error: "Please enter a valid 6-digit pincode." };
    }
    try {
      const record = await convex.query(api.serviceablePincodes.getByPincode, { pincode });
      if (record) {
        await updateLocationDetails({
          latitude: record.lat,
          longitude: record.lng,
          city: record.city,
          state: record.state,
          country: "India",
          postcode: record.pincode,
        });
        return { success: true };
      } else {
        return { success: false, error: "We do not deliver to this pincode yet. We currently support selected areas in Kochi." };
      }
    } catch (e) {
      console.error("Pincode geocode error:", e);
      return { success: false, error: "Failed to look up pincode. Please try again." };
    }
  }, [convex, updateLocationDetails]);

  const clearLocation = useCallback(() => {
    safeRemoveItem("hive_location");
    safeRemoveItem("hive_customer_pincode");
    safeRemoveItem("hive_customer_region");
    safeRemoveItem("hive_customer_serviceable");
    safeSetItem("hive_browse_all", "false");

    setState((prev) => ({
      ...prev,
      pincode: null,
      regionName: null,
      locality: null,
      isGateOpen: true,
      latitude: null,
      longitude: null,
      city: null,
      stateName: null,
      country: null,
      postcode: null,
      browseAllProducts: false,
    }));
  }, []);

  const contextValue = useMemo(() => ({
    ...state,
    isServiceable: isLocationServiceable,
    serviceableBoutiqueCount,
    setGateOpen,
    setDrawerOpen,
    setBrowseAllProducts,
    updateLocationDetails,
    detectLocation,
    clearLocation,
    geocodePincode
  }), [
    state,
    isLocationServiceable,
    serviceableBoutiqueCount,
    setGateOpen,
    setDrawerOpen,
    setBrowseAllProducts,
    updateLocationDetails,
    detectLocation,
    clearLocation,
    geocodePincode
  ]);

  return (
    <LocationContext.Provider value={contextValue}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error("useLocation must be used within a LocationProvider");
  }
  return context;
};
