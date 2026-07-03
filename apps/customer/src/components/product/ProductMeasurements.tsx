"use client";

import React, { useState } from "react";
import { X, Ruler, ChevronDown, CheckCircle, Info } from "lucide-react";
import { cn } from "@hive/ui";
import { MeasurementRow } from "@/lib/mockProductDetails";

export interface ProductMeasurementsProps {
  isOpen: boolean;
  onClose: () => void;
  measurementMatrix: MeasurementRow[];
  productName: string;
}

export const ProductMeasurements: React.FC<ProductMeasurementsProps> = ({
  isOpen,
  onClose,
  measurementMatrix,
  productName,
}) => {
  const [guideOpen, setGuideOpen] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-hive-dark/45 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl z-10 flex flex-col max-h-[90vh] overflow-hidden border border-hive-border/40 animate-[modalIn_0.3s_cubic-bezier(0.215,0.61,0.355,1)_forwards]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-hive-border/50 flex-shrink-0 bg-hive-cream/20">
          <div className="flex items-center gap-2 text-hive-dark">
            <Ruler className="w-5 h-5 text-hive-amber" />
            <span className="text-sm font-extrabold uppercase tracking-wider">
              Actual Product Measurements
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-hive-cream/60 text-hive-dark transition-colors"
            aria-label="Close sizing chart"
          >
            <X className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>

        {/* Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <span className="text-[10px] font-extrabold text-hive-text-muted uppercase tracking-wider block mb-1">
              SPECIFICATION FOR
            </span>
            <h3 className="text-sm font-extrabold text-hive-dark font-serif truncate">
              {productName}
            </h3>
            <p className="text-[11px] text-hive-text-muted mt-1 leading-relaxed">
              Unlike generic sizing charts, these represent actual physical tape measurements of this specific design, hand-measured by our boutique partner.
            </p>
          </div>

          {/* Measurements Table */}
          <div className="border border-hive-border/60 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-hive-cream/40 border-b border-hive-border/60 text-[10px] font-extrabold text-hive-dark uppercase tracking-wider">
                  <th className="px-4 py-3">Size</th>
                  <th className="px-4 py-3">Chest</th>
                  <th className="px-4 py-3">Waist</th>
                  <th className="px-4 py-3">Shoulder</th>
                  <th className="px-4 py-3">Length</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hive-border/40 font-semibold text-hive-dark">
                {measurementMatrix.map((row, idx) => (
                  <tr
                    key={row.size}
                    className={cn(
                      "transition-colors",
                      idx % 2 === 1 ? "bg-hive-cream/5" : "bg-white"
                    )}
                  >
                    <td className="px-4 py-3 font-extrabold text-hive-amber bg-hive-gold/5">{row.size}</td>
                    <td className="px-4 py-3">{row.chest}</td>
                    <td className="px-4 py-3">{row.waist}</td>
                    <td className="px-4 py-3">{row.shoulder}</td>
                    <td className="px-4 py-3">{row.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Sizing Reassurance Card */}
          <div className="bg-hive-gold/5 border border-hive-gold/25 p-4 rounded-2xl flex gap-3 text-xs">
            <CheckCircle className="w-5 h-5 text-hive-amber flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-extrabold text-hive-dark">Hive Fit Guarantee</span>
              <p className="text-hive-text-muted mt-0.5 leading-relaxed font-medium">
                We guarantee these tape dimensions are 100% accurate. If the received dress does not match these measurements, you qualify for our 3-Day Return & Refund Policy.
              </p>
            </div>
          </div>

          {/* Accordion: How to Measure Guide */}
          <div className="border border-hive-border/50 rounded-2xl overflow-hidden bg-white">
            <button
              type="button"
              onClick={() => setGuideOpen(!guideOpen)}
              className="w-full flex items-center justify-between px-4 py-3 text-xs font-bold text-hive-dark hover:bg-hive-cream/20 transition-all outline-none"
            >
              <span className="flex items-center gap-2">
                <Info className="w-4 h-4 text-hive-amber" />
                How to Measure Your Body
              </span>
              <ChevronDown
                className={cn("w-4 h-4 transition-transform duration-200", guideOpen && "rotate-180")}
              />
            </button>

            {guideOpen && (
              <div className="px-4 pb-4 pt-1 text-[11px] text-hive-text-muted space-y-3 leading-relaxed border-t border-hive-border/30 bg-hive-cream/5 font-medium animate-[accordionSlide_0.25s_ease-out]">
                <div>
                  <strong className="text-hive-dark">1. Chest:</strong> Wrap a tape measure around the fullest part of your bust, keeping it parallel to the floor.
                </div>
                <div>
                  <strong className="text-hive-dark">2. Waist:</strong> Measure around the narrowest part of your natural waistline (usually near your belly button).
                </div>
                <div>
                  <strong className="text-hive-dark">3. Shoulder:</strong> Measure from the edge of one shoulder bone across your back to the edge of the other shoulder bone.
                </div>
                <div>
                  <strong className="text-hive-dark">4. Length:</strong> Measure vertically from the highest point of your shoulder down to the hemline of the garment.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-hive-border/50 bg-hive-cream/20 flex justify-end flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-hive-dark text-hive-gold text-xs font-extrabold uppercase tracking-widest hover:bg-hive-amber hover:text-white transition-colors"
          >
            Got It
          </button>
        </div>
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
};
