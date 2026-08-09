"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { formatRupees } from "@hive/utils";
import { CheckCircle2, Clock, XCircle, AlertCircle, ShoppingBag } from "lucide-react";

interface ReservationStatusCardProps {
  reservation: any;
}

export const ReservationStatusCard: React.FC<ReservationStatusCardProps> = ({ reservation }) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const renderContent = () => {
    switch (reservation.status) {
      case "reservation_active":
      case "awaiting_store_confirmation":
        return (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm font-bold">Reservation placed ✓</span>
            </div>
            <p className="text-xs text-stone-600">
              We'll confirm availability {reservation.scheduledConfirmDate ? `on ${reservation.scheduledConfirmDate}` : "tomorrow"}.
            </p>
          </div>
        );
      case "awaiting_payment": {
        let timeLeft = 0;
        if (reservation.paymentExpiresAt) {
          timeLeft = Math.max(0, Math.floor((reservation.paymentExpiresAt - now) / 60000));
        }
        return (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-bold text-stone-900">Your item is available 🎉</h3>
              <p className="text-xs text-stone-600">
                Complete your payment to confirm the order.
              </p>
            </div>
            <Link 
              href="/checkout/address" 
              className="inline-flex items-center justify-center gap-2 bg-stone-950 text-white text-xs font-bold py-2 px-4 rounded-full max-w-fit hover:bg-stone-800 transition-colors"
            >
              Pay & order &rarr;
            </Link>
            {timeLeft > 0 && (
              <div className="flex items-center gap-1.5 text-[10px] text-amber-600 font-bold mt-1">
                <Clock className="w-3.5 h-3.5" />
                Expires in {timeLeft} minutes
              </div>
            )}
          </div>
        );
      }
      case "reservation_confirmed":
      case "order_confirmed":
        return (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm font-bold">Order Confirmed</span>
            </div>
            <p className="text-xs text-stone-600">Your payment was successful.</p>
          </div>
        );
      case "payment_expired":
      case "reservation_expired":
        return (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-stone-500">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-bold">Reservation ended</span>
            </div>
            <Link href="/" className="text-xs font-bold text-stone-900 hover:text-stone-700 underline">
              Explore similar styles &rarr;
            </Link>
          </div>
        );
      case "unavailable":
      case "cancelled":
        return (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-red-600">
              <XCircle className="w-4 h-4" />
              <span className="text-sm font-bold">
                {reservation.status === "cancelled" ? "Reservation cancelled" : "Looks like this one isn't available anymore"}
              </span>
            </div>
            <Link href="/" className="text-xs font-bold text-stone-900 hover:text-stone-700 underline">
              See similar styles &rarr;
            </Link>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2 text-stone-500">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-bold">{reservation.status.replace(/_/g, " ")}</span>
          </div>
        );
    }
  };

  return (
    <div className="bg-white border border-stone-100 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row gap-4 items-start">
      <div className="w-20 h-20 rounded-lg overflow-hidden bg-stone-50 flex-shrink-0 relative border border-stone-100">
        {reservation.productImageUrl ? (
          <img src={reservation.productImageUrl} alt={reservation.productName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-stone-300">
            <ShoppingBag className="w-6 h-6" />
          </div>
        )}
      </div>
      
      <div className="flex-1 flex flex-col gap-1">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-sm font-bold text-stone-900">{reservation.productName}</h3>
            <p className="text-xs text-stone-500 mt-0.5">Size {reservation.size}</p>
          </div>
          <span className="text-sm font-bold text-stone-900">{formatRupees(reservation.priceAtReserve)}</span>
        </div>
        <div className="mt-2 pt-2 border-t border-stone-50">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};
