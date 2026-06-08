"use client";

import React, { useState, useEffect } from "react";
import { Modal, Button } from "@hive/ui";
import { useLocation } from "@/context/LocationContext";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { MapPinOff } from "lucide-react";
import { calculateDistanceKm } from "@/lib/distance";
import { useRouter } from "next/navigation";

export const UnsupportedArea: React.FC = () => {
  const { city, latitude, longitude, setGateOpen, browseAllProducts, setBrowseAllProducts } = useLocation();
  const dbBoutiques = useQuery(api.boutiques.getApprovedBoutiques) ?? [];
  const router = useRouter();

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
    // Never reopen the modal once the user has chosen to browse anyway
    if (browseAllProducts) {
      setIsOpen(false);
      return;
    }
    if (city && !serviceable) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [serviceable, city, browseAllProducts]);

  // Do not render anything if: no city, location is serviceable, or user chose browse-all
  if (!city || serviceable || browseAllProducts) return null;

  const handleBrowseAnyway = () => {
    // 1. Persist the bypass flag so the modal won't reopen and the products page
    //    can read it from context (in addition to the URL param)
    setBrowseAllProducts(true);
    // 2. Close the modal immediately
    setIsOpen(false);
    // 3. Navigate to the all-products page with the browse=all param so that
    //    the backend query skips delivery-radius filtering
    router.push("/products?browse=all");
  };

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
            onClick={handleBrowseAnyway}
            className="w-full flex items-center justify-center gap-1.5 font-extrabold uppercase tracking-wider text-xs py-3"
          >
            Browse Products Anyway
          </Button>
        </div>
      </div>
    </Modal>
  );
};
