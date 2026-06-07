"use client";

import React, { useState, useEffect } from "react";
import { Modal, Button } from "@hive/ui";
import { useLocation } from "@/context/LocationContext";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { MapPinOff, ArrowRight } from "lucide-react";
import { calculateDistanceKm } from "@/lib/distance";

export const UnsupportedArea: React.FC = () => {
  const { city, latitude, longitude, setGateOpen } = useLocation();
  const dbBoutiques = useQuery(api.boutiques.getApprovedBoutiques) ?? [];

  const [isOpen, setIsOpen] = useState(false);

  // Check if location is serviceable (i.e. at least one boutique delivers here)
  const isAddressServiceable = () => {
    if (latitude === null || longitude === null) return true; // not set or loading coordinates
    if (dbBoutiques.length === 0) return true; // wait for boutiques to load

    return dbBoutiques.some((b) => {
      const bLat = b.latitude ?? b.addressDetails?.lat;
      const bLng = b.longitude ?? b.addressDetails?.lng;
      if (bLat === undefined || bLng === undefined) return false;
      const dist = calculateDistanceKm(latitude, longitude, bLat, bLng);
      return dist <= (b.deliveryRadiusKm ?? 15);
    });
  };

  const serviceable = isAddressServiceable();

  useEffect(() => {
    if (city && !serviceable) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [serviceable, city]);

  if (!city || serviceable) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      title="Delivery Not Available"
      className="max-w-md"
    >
      <div className="flex flex-col gap-6 text-center items-center py-3">
        <div className="w-14 h-14 rounded-full bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center text-hive-gold animate-pulse">
          <MapPinOff className="w-7 h-7" />
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            No boutiques deliver to this area
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
            The selected location ({city}) is outside the delivery range of our partner boutiques. Please choose a different delivery location.
          </p>
        </div>

        <div className="w-full flex flex-col gap-2.5 mt-2">
          <Button
            variant="primary"
            onClick={() => {
              setIsOpen(false);
              setGateOpen(true);
            }}
            className="w-full flex items-center justify-center gap-2 font-extrabold uppercase tracking-wider text-xs py-3"
          >
            Change Location
          </Button>

          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            className="w-full flex items-center justify-center gap-1.5 font-extrabold uppercase tracking-wider text-xs py-3"
          >
            Browse Products anyway
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Modal>
  );
};
