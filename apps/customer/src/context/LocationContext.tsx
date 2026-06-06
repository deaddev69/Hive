"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { isValidPincode } from "@hive/utils";
import { isServiceablePincode } from "@/data/mockServiceablePincodes";

export interface LocationState {
  pincode: string | null;
  regionName: string | null;
  isServiceable: boolean;
  isGateOpen: boolean;
}

export interface LocationContextType extends LocationState {
  setGateOpen: (open: boolean) => void;
  updateLocation: (pincode: string) => Promise<{ success: boolean; error?: string; isServiceable?: boolean }>;
  clearLocation: () => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<LocationState>({
    pincode: null,
    regionName: null,
    isServiceable: true, // assume serviceable until proven otherwise or pincode checker rules run
    isGateOpen: false,
  });

  // Load from localStorage on mount
  useEffect(() => {
    const savedPincode = localStorage.getItem("hive_customer_pincode");
    const savedRegion = localStorage.getItem("hive_customer_region");
    const savedServiceable = localStorage.getItem("hive_customer_serviceable");

    if (savedPincode) {
      setState((prev) => ({
        ...prev,
        pincode: savedPincode,
        regionName: savedRegion || "Hyderabad Central",
        isServiceable: savedServiceable === "true",
      }));
    } else {
      // Force location gate on first visit
      setState((prev) => ({ ...prev, isGateOpen: true }));
    }
  }, []);

  const setGateOpen = (open: boolean) => {
    setState((prev) => ({ ...prev, isGateOpen: open }));
  };

  const updateLocation = async (pincode: string) => {
    if (!isValidPincode(pincode)) {
      return { success: false, error: "Invalid pincode pattern. Must be exactly 6 digits." };
    }

    const isServiceable = isServiceablePincode(pincode);
    const regionName = isServiceable ? "Hyderabad Central (Banjara Hills)" : null;

    localStorage.setItem("hive_customer_pincode", pincode);
    localStorage.setItem("hive_customer_region", regionName || "");
    localStorage.setItem("hive_customer_serviceable", String(isServiceable));

    setState({
      pincode,
      regionName,
      isServiceable,
      isGateOpen: false,
    });

    return { success: true, isServiceable };
  };

  const clearLocation = () => {
    localStorage.removeItem("hive_customer_pincode");
    localStorage.removeItem("hive_customer_region");
    localStorage.removeItem("hive_customer_serviceable");

    setState({
      pincode: null,
      regionName: null,
      isServiceable: true,
      isGateOpen: true,
    });
  };

  return (
    <LocationContext.Provider value={{ ...state, setGateOpen, updateLocation, clearLocation }}>
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
