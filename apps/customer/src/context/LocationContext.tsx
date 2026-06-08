"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@clerk/nextjs";

export interface LocationState {
  pincode: string | null;
  regionName: string | null;
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
  setGateOpen: (open: boolean) => void;
  setDrawerOpen: (open: boolean) => void;
  setBrowseAllProducts: (v: boolean) => void;
  updateLocationDetails: (data: {
    latitude: number;
    longitude: number;
    city: string;
    state: string;
    country: string;
    postcode: string;
  }) => Promise<void>;
  detectLocation: () => Promise<{ success: boolean; error?: string }>;
  clearLocation: () => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isSignedIn } = useAuth();
  const saveLocation = useMutation(api.userLocations.save);
  const dbLocation = useQuery(api.userLocations.get);

  const [state, setState] = useState<LocationState>({
    pincode: null,
    regionName: null,
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

  // 1. Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("hive_location");
    const browseAll = localStorage.getItem("hive_browse_all") === "true";
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setState((prev) => ({
          ...prev,
          pincode: parsed.postcode || parsed.pincode || null,
          regionName: parsed.regionName || parsed.city || null,
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
      const regionName = `${dbLocation.city}, ${dbLocation.state}`;
      
      const checkDbLoc = async () => {
        const locationData = {
          latitude: dbLocation.latitude,
          longitude: dbLocation.longitude,
          city: dbLocation.city,
          state: dbLocation.state,
          country: dbLocation.country,
          postcode: dbLocation.postcode,
          pincode: dbLocation.postcode,
          regionName,
        };

        localStorage.setItem("hive_location", JSON.stringify(locationData));
        setState((prev) => ({
          ...prev,
          pincode: dbLocation.postcode,
          regionName,
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
      setState((prev) => ({ ...prev, isGateOpen: true }));
    }
  }, [dbLocation, hasLoadedInit, state.postcode]);

  const setGateOpen = (open: boolean) => {
    setState((prev) => ({ ...prev, isGateOpen: open }));
  };

  const setDrawerOpen = (open: boolean) => {
    setState((prev) => ({ ...prev, isDrawerOpen: open }));
  };

  const setBrowseAllProducts = (v: boolean) => {
    localStorage.setItem("hive_browse_all", v ? "true" : "false");
    setState((prev) => ({ ...prev, browseAllProducts: v }));
  };

  const updateLocationDetails = async (data: {
    latitude: number;
    longitude: number;
    city: string;
    state: string;
    country: string;
    postcode: string;
  }) => {
    const regionName = `${data.city}, ${data.state}`;
    const locationData = {
      latitude: data.latitude,
      longitude: data.longitude,
      city: data.city,
      state: data.state,
      country: data.country,
      postcode: data.postcode,
      pincode: data.postcode,
      regionName,
    };

    console.log('[Geolocation] Saving to localStorage:', locationData);
    localStorage.setItem("hive_location", JSON.stringify(locationData));
    localStorage.setItem("hive_customer_pincode", data.postcode);
    localStorage.setItem("hive_customer_region", regionName);

    // Reset browse-all mode when the user explicitly sets a new delivery location
    localStorage.setItem("hive_browse_all", "false");
    setState((prev) => ({
      ...prev,
      pincode: data.postcode,
      regionName,
      isGateOpen: false,
      latitude: data.latitude,
      longitude: data.longitude,
      city: data.city,
      stateName: data.state,
      country: data.country,
      postcode: data.postcode,
      browseAllProducts: false,
    }));

    if (isSignedIn) {
      try {
        await saveLocation({
          latitude: data.latitude,
          longitude: data.longitude,
          city: data.city,
          state: data.state,
          country: data.country,
          postcode: data.postcode,
        });
      } catch (err) {
        console.error("Failed to save location to Convex:", err);
      }
    }
  };

  const detectLocation = async (): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ success: false, error: "Geolocation is not supported by your browser." });
        return;
      }

      const options = {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000, // 10 seconds cache tolerance
      };

      console.log('[Geolocation] Initiating getCurrentPosition with options:', options);

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          console.log('[Geolocation] getCurrentPosition Success. coords:', { 
            latitude: position.coords.latitude, 
            longitude: position.coords.longitude 
          });
          const { latitude, longitude } = position.coords;

          setState((prev) => ({
            ...prev,
            latitude,
            longitude,
          }));

          try {
            console.log('[Geolocation] Fetching Nominatim reverse geocoding for:', { latitude, longitude });
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
            );
            if (!res.ok) {
              throw new Error("Failed to contact reverse geocoding service.");
            }
            const data = await res.json();
            console.log('[Geolocation] Nominatim Response:', data);

            const address = data.address || {};
            const city = address.city || address.town || address.village || address.suburb || "Kochi";
            const state = address.state || "Kerala";
            const country = address.country || "India";
            const postcode = address.postcode || "";

            await updateLocationDetails({
              latitude,
              longitude,
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

          if (options.enableHighAccuracy) {
            console.log('[Geolocation] High accuracy failed. Retrying with enableHighAccuracy: false...');
            navigator.geolocation.getCurrentPosition(
              async (pos) => {
                console.log('[Geolocation] Fallback Success. coords:', { 
                  latitude: pos.coords.latitude, 
                  longitude: pos.coords.longitude 
                });
                const { latitude, longitude } = pos.coords;
                
                setState((prev) => ({
                  ...prev,
                  latitude,
                  longitude,
                }));

                try {
                  console.log('[Geolocation] Fetching Nominatim reverse geocoding (fallback) for:', { latitude, longitude });
                  const res = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
                  );
                  if (!res.ok) throw new Error("Failed to reverse geocode");
                  const data = await res.json();
                  console.log('[Geolocation] Nominatim Response (fallback):', data);

                  const address = data.address || {};
                  const city = address.city || address.town || address.village || address.suburb || "Kochi";
                  const state = address.state || "Kerala";
                  const country = address.country || "India";
                  const postcode = address.postcode || "";

                  await updateLocationDetails({ latitude, longitude, city, state, country, postcode });
                  resolve({ success: true });
                } catch (err) {
                  console.error("Fallback reverse geocoding error:", err);
                  resolve({ success: false, error: "Could not resolve address. Please try again." });
                }
              },
              (err2) => {
                console.warn('[Geolocation] Fallback getCurrentPosition Error: Code = ' + err2.code + ', Message = ' + err2.message);
                let errMsg = "Unable to detect location. Please try again.";
                if (err2.code === err2.PERMISSION_DENIED) {
                  errMsg = "Location access denied. Please choose your location manually.";
                } else if (err2.code === err2.POSITION_UNAVAILABLE) {
                  errMsg = "Location unavailable. Please choose manually.";
                } else if (err2.code === err2.TIMEOUT) {
                  errMsg = "Location request timed out. Please try again.";
                }
                resolve({ success: false, error: errMsg });
              },
              { ...options, enableHighAccuracy: false, maximumAge: 60000 }
            );
          } else {
            let errMsg = "Unable to detect location. Please try again.";
            if (error.code === error.PERMISSION_DENIED) {
              errMsg = "Location access denied. Please choose your location manually.";
            } else if (error.code === error.POSITION_UNAVAILABLE) {
              errMsg = "Location unavailable. Please choose manually.";
            } else if (error.code === error.TIMEOUT) {
              errMsg = "Location request timed out. Please try again.";
            }
            resolve({ success: false, error: errMsg });
          }
        },
        options
      );
    });
  };

  const clearLocation = () => {
    localStorage.removeItem("hive_location");
    localStorage.removeItem("hive_customer_pincode");
    localStorage.removeItem("hive_customer_region");
    localStorage.removeItem("hive_customer_serviceable");
    localStorage.setItem("hive_browse_all", "false");

    setState((prev) => ({
      ...prev,
      pincode: null,
      regionName: null,
      isGateOpen: true,
      latitude: null,
      longitude: null,
      city: null,
      stateName: null,
      country: null,
      postcode: null,
      browseAllProducts: false,
    }));
  };

  return (
    <LocationContext.Provider value={{ ...state, setGateOpen, setDrawerOpen, setBrowseAllProducts, updateLocationDetails, detectLocation, clearLocation }}>
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
