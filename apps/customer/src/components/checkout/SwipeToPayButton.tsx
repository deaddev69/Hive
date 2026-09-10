"use client";

import React, { useRef, useState, useEffect } from "react";
import { motion, useMotionValue, useTransform, animate, PanInfo } from "framer-motion";
import { ArrowRight, Loader2 } from "lucide-react";

const THUMB_SIZE = 48; // px
const TRACK_PADDING = 4; // px, matches p-1 on the track
const COMPLETE_THRESHOLD = 0.82; // fraction of travel distance that counts as a full swipe

export interface SwipeToPayButtonProps {
  /** Fired once, when the user drags past the threshold or activates via keyboard. */
  onComplete: () => void;
  /** True while a quote/price is still loading — track is dimmed and inert. */
  disabled?: boolean;
  /** True while the payment is actually being placed — thumb parks at the end and spins. Flipping back to false (attempt finished but component still mounted, i.e. it failed — a success normally navigates away) snaps the thumb back to start. */
  isProcessing?: boolean;
  label?: string;
  className?: string;
}

export const SwipeToPayButton: React.FC<SwipeToPayButtonProps> = ({
  onComplete,
  disabled = false,
  isProcessing = false,
  label = "Slide to Pay",
  className = "",
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [maxDrag, setMaxDrag] = useState(0);
  const [completed, setCompleted] = useState(false);
  const x = useMotionValue(0);
  const textOpacity = useTransform(x, [0, maxDrag || 1], [1, 0]);

  useEffect(() => {
    const measure = () => {
      if (trackRef.current) {
        setMaxDrag(Math.max(0, trackRef.current.offsetWidth - THUMB_SIZE - TRACK_PADDING * 2));
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // While the payment is being placed, park the thumb at the end so the spinner reads as "in flight."
  useEffect(() => {
    if (isProcessing && maxDrag > 0) {
      animate(x, maxDrag, { type: "spring", stiffness: 400, damping: 40 });
    }
  }, [isProcessing, maxDrag, x]);

  // isProcessing going true -> false while this component is still mounted means the attempt
  // failed (a successful payment navigates away, unmounting this instead) — snap back to start
  // so the shopper can try again.
  const wasProcessing = useRef(false);
  useEffect(() => {
    if (wasProcessing.current && !isProcessing) {
      setCompleted(false);
      animate(x, 0, { type: "spring", stiffness: 400, damping: 40 });
    }
    wasProcessing.current = isProcessing;
  }, [isProcessing, x]);

  const handleDragEnd = (_e: unknown, info: PanInfo) => {
    if (disabled || completed || maxDrag === 0) return;
    const progress = x.get() / maxDrag;
    if (progress >= COMPLETE_THRESHOLD) {
      setCompleted(true);
      animate(x, maxDrag, { type: "spring", stiffness: 500, damping: 45 });
      onComplete();
    } else {
      animate(x, 0, { type: "spring", stiffness: 400, damping: 40 });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled || completed) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setCompleted(true);
      if (maxDrag > 0) animate(x, maxDrag, { type: "spring", stiffness: 500, damping: 45 });
      onComplete();
    }
  };

  const showSpinner = isProcessing || completed;

  return (
    <div
      ref={trackRef}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-label={showSpinner ? "Payment processing" : `${label} to confirm and pay`}
      onKeyDown={handleKeyDown}
      className={`relative h-14 w-full rounded-full bg-hive-cream border-2 border-hive-dark p-1 overflow-hidden select-none touch-none focus:outline-none focus-visible:ring-2 focus-visible:ring-hive-dark/30 ${
        disabled ? "opacity-50 pointer-events-none" : ""
      } ${className}`}
    >
      <motion.span
        style={{ opacity: textOpacity }}
        className="absolute inset-0 flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-hive-dark pointer-events-none"
      >
        {label}
        <ArrowRight className="w-3.5 h-3.5" />
      </motion.span>

      <motion.div
        drag={disabled || showSpinner ? false : "x"}
        dragConstraints={{ left: 0, right: maxDrag }}
        dragElastic={0}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        style={{ x, width: THUMB_SIZE, height: THUMB_SIZE }}
        className="relative z-10 rounded-full bg-hive-dark shadow-md flex items-center justify-center cursor-grab active:cursor-grabbing"
      >
        {showSpinner ? (
          <Loader2 className="w-5 h-5 text-hive-gold animate-spin" />
        ) : (
          <ArrowRight className="w-5 h-5 text-hive-gold" />
        )}
      </motion.div>
    </div>
  );
};
