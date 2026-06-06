"use client";
import React, { useEffect, useRef, useState } from "react";
import { Info, Ruler, HelpCircle, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@hive/ui";
import { MeasurementRow } from "@/lib/mockProductDetails";

// ─────────────────────────────────────────────────────────────────────────────
// Subcomponent: SizeConfidenceCard (Section: Stats Mocking)
// ─────────────────────────────────────────────────────────────────────────────
interface SizeConfidenceCardProps {
  productName: string;
  className?: string;
}

export const SizeConfidenceCard: React.FC<SizeConfidenceCardProps> = ({
  productName,
  className = "",
}) => {
  // Generate slightly deterministic mock fit stats based on name length to make each product feel customized
  const hash = productName.length;
  const trueToSizePercent = 88 + (hash % 9); // e.g., 88% - 96%
  const runsSmallPercent = 3 + (hash % 5);
  const runsLargePercent = 100 - trueToSizePercent - runsSmallPercent;

  let fitText = "True to Size";
  let fitDescription = "Most customers report this design fits precisely as measured.";
  if (trueToSizePercent < 90) {
    fitText = "Runs Slightly Small";
    fitDescription = "Tailored cut. If you are in-between sizes, we recommend ordering one size up.";
  } else if (hash % 3 === 0) {
    fitText = "Relaxed Fit";
    fitDescription = "Breezy and comfortable silhouette. Order your standard size.";
  }

  return (
    <div className={cn("bg-gradient-to-br from-[#FFFDF5] to-[#FAF8F0] border border-hive-gold/30 rounded-2xl p-4 text-left shadow-sm", className)}>
      <div className="flex items-center gap-2 mb-2.5">
        <Sparkles className="w-4 h-4 text-hive-amber" />
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-hive-amber">
          Hive Fit Confidence
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-extrabold text-hive-dark font-serif">
          {trueToSizePercent}%
        </span>
        <span className="text-[11px] font-bold text-hive-text-muted">
          of buyers report: <strong className="text-hive-dark">{fitText}</strong>
        </span>
      </div>
      <p className="text-[11px] text-hive-text-muted leading-relaxed mt-1 font-medium">
        {fitDescription}
      </p>

      {/* Mini Bar Chart */}
      <div className="mt-3.5 space-y-1.5">
        <div className="flex h-1.5 rounded-full overflow-hidden bg-hive-border/30">
          <div
            style={{ width: `${trueToSizePercent}%` }}
            className="bg-hive-amber transition-all duration-500"
            title={`True to size: ${trueToSizePercent}%`}
          />
          <div
            style={{ width: `${runsSmallPercent}%` }}
            className="bg-hive-gold transition-all duration-500"
            title={`Runs small: ${runsSmallPercent}%`}
          />
          <div
            style={{ width: `${runsLargePercent}%` }}
            className="bg-hive-comb/30 transition-all duration-500"
            title={`Runs large: ${runsLargePercent}%`}
          />
        </div>
        <div className="flex justify-between text-[9px] font-extrabold uppercase tracking-wider text-hive-text-muted/80">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-hive-amber" />
            True ({trueToSizePercent}%)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-hive-gold" />
            Small ({runsSmallPercent}%)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-hive-comb/30" />
            Large ({runsLargePercent}%)
          </span>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Subcomponent: FitGuidance (prominent display of product.fitNote)
// ─────────────────────────────────────────────────────────────────────────────
interface FitGuidanceProps {
  fitNote: string;
  className?: string;
}

export const FitGuidance: React.FC<FitGuidanceProps> = ({ fitNote, className = "" }) => {
  return (
    <div className={cn("bg-hive-cream/20 border border-hive-border/40 rounded-2xl p-4 text-left flex gap-3 shadow-sm", className)}>
      <div className="w-8 h-8 rounded-lg bg-hive-gold/10 border border-hive-gold/20 flex items-center justify-center text-hive-amber flex-shrink-0">
        <Info className="w-4 h-4" />
      </div>
      <div className="text-xs">
        <span className="font-extrabold uppercase tracking-wider text-hive-dark block">
          Fit & Sizing Note
        </span>
        <p className="text-hive-text-muted mt-1 leading-relaxed font-medium">
          {fitNote}
        </p>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Subcomponent: MeasurementLegend (definitions section)
// ─────────────────────────────────────────────────────────────────────────────
export const MeasurementLegend: React.FC = () => {
  const [isLegendOpen, setIsLegendOpen] = useState(false);

  return (
    <div className="border border-hive-border/40 rounded-2xl overflow-hidden bg-white text-left">
      <button
        type="button"
        onClick={() => setIsLegendOpen(!isLegendOpen)}
        className="w-full flex items-center justify-between px-4 py-3 text-xs font-extrabold text-hive-dark hover:bg-hive-cream/10 transition-all outline-none"
      >
        <span className="flex items-center gap-2 uppercase tracking-wider">
          <Ruler className="w-4 h-4 text-hive-amber" />
          How We Measure (Inches Guide)
        </span>
        {isLegendOpen ? (
          <ChevronUp className="w-4 h-4 text-hive-text-muted" />
        ) : (
          <ChevronDown className="w-4 h-4 text-hive-text-muted" />
        )}
      </button>

      {isLegendOpen && (
        <div className="px-4 pb-4 pt-1.5 text-xs text-hive-text-muted space-y-3 leading-relaxed border-t border-hive-border/30 bg-[#FFFDF7]/40 font-medium animate-fade-in">
          <div>
            <strong className="text-hive-dark font-extrabold">1. Chest:</strong> Measured flat from armpit seam to armpit seam, then doubled.
          </div>
          <div>
            <strong className="text-hive-dark font-extrabold">2. Waist:</strong> Measured across the narrowest point of the waistband, then doubled.
          </div>
          <div>
            <strong className="text-hive-dark font-extrabold">3. Hip:</strong> Measured across the widest part of the lower garment, then doubled.
          </div>
          <div>
            <strong className="text-hive-dark font-extrabold">4. Length:</strong> Measured vertically from the highest shoulder seam down to the hem.
          </div>
          <div className="text-[10px] text-hive-amber border-t border-hive-gold/20 pt-2 font-bold italic flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5 flex-shrink-0" />
            Measurements are physical tape dimensions of the item flat-laid, not body sizes.
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Subcomponent: MeasurementTable
// ─────────────────────────────────────────────────────────────────────────────
interface MeasurementTableProps {
  matrix: MeasurementRow[];
  selectedSize: string;
}

export const MeasurementTable: React.FC<MeasurementTableProps> = ({ matrix, selectedSize }) => {
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll the highlighted row on size select
  useEffect(() => {
    if (selectedSize && rowRefs.current[selectedSize]) {
      const targetRow = rowRefs.current[selectedSize];
      // Perform smooth scroll horizontally if table is overflowed
      targetRow?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [selectedSize]);

  return (
    <div className="w-full text-left">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-hive-text-muted">
          Actual Garment Dimensions
        </span>
        {selectedSize && (
          <span className="text-[9px] font-extrabold bg-hive-gold/15 text-hive-amber border border-hive-gold/20 px-2 py-0.5 rounded-md animate-pulse">
            Active Size: {selectedSize}
          </span>
        )}
      </div>

      <div
        ref={containerRef}
        className="w-full border border-hive-border/40 rounded-2xl overflow-x-auto scrollbar-thin scrollbar-thumb-hive-gold/30 hover:scrollbar-thumb-hive-gold/60"
      >
        <table className="min-w-[500px] w-full text-left border-collapse text-xs table-fixed">
          <thead>
            <tr className="bg-hive-cream/40 border-b border-hive-border/40 text-[9px] font-extrabold text-hive-dark uppercase tracking-wider sticky top-0 z-10 backdrop-blur-md">
              <th className="px-3.5 py-3 w-[70px]">Size</th>
              <th className="px-3.5 py-3">Chest</th>
              <th className="px-3.5 py-3">Waist</th>
              <th className="px-3.5 py-3">Hip</th>
              <th className="px-3.5 py-3">Length</th>
              <th className="px-3.5 py-3">Fit Type</th>
              <th className="px-3.5 py-3">Stretch</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hive-border/30 font-semibold text-hive-dark">
            {matrix.map((row, idx) => {
              const isSelected = row.size === selectedSize;
              // Fallbacks in case columns are missing
              const hipVal = row.hip ?? "N/A";
              const fitTypeVal = row.fitType ?? "Regular";
              const stretchVal = row.stretch ?? "Low";

              return (
                <tr
                  key={row.size}
                  ref={(el) => {
                    rowRefs.current[row.size] = el;
                  }}
                  className={cn(
                    "transition-all duration-300",
                    isSelected
                      ? "bg-hive-gold/15 border-l-2 border-l-hive-amber scale-[1.005]"
                      : idx % 2 === 1
                      ? "bg-hive-cream/5"
                      : "bg-white"
                  )}
                >
                  <td
                    className={cn(
                      "px-3.5 py-3.5 font-extrabold w-[70px] transition-colors",
                      isSelected ? "text-hive-amber bg-hive-gold/10" : "text-hive-dark"
                    )}
                  >
                    {row.size}
                  </td>
                  <td className="px-3.5 py-3.5">{row.chest}</td>
                  <td className="px-3.5 py-3.5">{row.waist}</td>
                  <td className="px-3.5 py-3.5">{hipVal}</td>
                  <td className="px-3.5 py-3.5">{row.length}</td>
                  <td className="px-3.5 py-3.5 text-hive-text-muted/90">{fitTypeVal}</td>
                  <td className="px-3.5 py-3.5 text-hive-text-muted/90">{stretchVal}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component: MeasurementMatrix
// ─────────────────────────────────────────────────────────────────────────────
export interface MeasurementMatrixProps {
  productName: string;
  measurementMatrix: MeasurementRow[];
  selectedSize: string;
  fitNote: string;
  className?: string;
}

export const MeasurementMatrix: React.FC<MeasurementMatrixProps> = ({
  productName,
  measurementMatrix = [],
  selectedSize,
  fitNote,
  className = "",
}) => {
  if (measurementMatrix.length === 0) return null;

  return (
    <div className={cn("w-full flex flex-col gap-5 py-4 border-b border-hive-border/40", className)}>
      
      {/* Table Section */}
      <MeasurementTable matrix={measurementMatrix} selectedSize={selectedSize} />

      {/* Legend Guide Accordion */}
      <MeasurementLegend />

      {/* Size Confidence Card & Fit Guidance Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SizeConfidenceCard productName={productName} />
        <FitGuidance fitNote={fitNote} />
      </div>

    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Loading State Skeleton
// ─────────────────────────────────────────────────────────────────────────────
export const MeasurementMatrixSkeleton: React.FC = () => {
  return (
    <div className="w-full flex flex-col gap-5 py-4 border-b border-hive-border/40 animate-pulse text-left">
      {/* Table Title Skeleton */}
      <div className="flex justify-between items-center">
        <div className="h-3 w-1/3 bg-hive-comb/15 rounded" />
      </div>

      {/* Table Grid Skeleton */}
      <div className="w-full border border-hive-border/20 rounded-2xl h-36 bg-hive-cream/5 flex flex-col p-4 gap-3">
        <div className="h-4 bg-hive-comb/15 rounded w-full" />
        <div className="h-3.5 bg-hive-comb/10 rounded w-full" />
        <div className="h-3.5 bg-hive-comb/10 rounded w-5/6" />
        <div className="h-3.5 bg-hive-comb/10 rounded w-4/5" />
      </div>

      {/* Accordion Bar Skeleton */}
      <div className="h-10 w-full bg-hive-comb/10 border border-hive-border/20 rounded-2xl" />

      {/* Confidence + Guidance Cards Skeletons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="h-28 bg-hive-comb/10 border border-hive-border/20 rounded-2xl" />
        <div className="h-28 bg-hive-comb/10 border border-hive-border/20 rounded-2xl" />
      </div>
    </div>
  );
};
