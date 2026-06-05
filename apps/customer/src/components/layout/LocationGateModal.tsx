"use client";

import React, { useState } from "react";
import { Modal, Input, Button } from "@hive/ui";
import { useLocation } from "@/context/LocationContext";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";

export const LocationGateModal: React.FC = () => {
  const { isGateOpen, setGateOpen, updateLocation } = useLocation();
  const [pincode, setPincode] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    setIsSubmitting(true);

    const result = await updateLocation(pincode);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error);
    } else {
      // Re-read serviceability from context directly
      const savedServiceable = localStorage.getItem("hive_customer_serviceable") === "true";
      if (!savedServiceable) {
        router.push("/not-serviceable");
      } else {
        router.push("/");
      }
    }
  };

  return (
    <Modal
      isOpen={isGateOpen}
      onClose={() => setGateOpen(false)}
      title="Select Delivery Location"
      className="max-w-md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 text-center items-center">
        <div className="w-12 h-12 rounded-full bg-hive-comb flex items-center justify-center text-hive-gold mb-1">
          <MapPin className="w-6 h-6" />
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-semibold text-hive-text">
            Enter Pincode for Hyperlocal Delivery
          </p>
          <p className="text-xs text-hive-text-muted">
            We deliver tailored boutique catalog clothing to your doorstep in hours. Check if we service your area.
          </p>
        </div>
        <Input
          placeholder="e.g. 500034"
          value={pincode}
          onChange={(e) => setPincode(e.target.value)}
          error={error}
          disabled={isSubmitting}
          maxLength={6}
          className="text-center text-lg font-bold tracking-widest"
        />
        <Button variant="primary" type="submit" isLoading={isSubmitting} className="w-full">
          Check Serviceability
        </Button>
      </form>
    </Modal>
  );
};
