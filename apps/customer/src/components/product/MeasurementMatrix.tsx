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
    <div className="border border-stone-200/80 rounded-2xl overflow-hidden bg-white text-left">
      <button
        type="button"
        onClick={() => setIsLegendOpen(!isLegendOpen)}
        className="w-full flex items-center justify-between px-4 py-3 text-xs font-bold text-stone-850 hover:bg-stone-50/50 transition-all outline-none"
      >
        <span className="flex items-center gap-2 uppercase tracking-wider">
          <Ruler className="w-4 h-4 text-stone-400" />
          How We Measure (Inches Guide)
        </span>
        {isLegendOpen ? (
          <ChevronUp className="w-4 h-4 text-stone-450" />
        ) : (
          <ChevronDown className="w-4 h-4 text-stone-455" />
        )}
      </button>

      {isLegendOpen && (
        <div className="px-4 pb-4 pt-1.5 text-xs text-stone-500 space-y-3 leading-relaxed border-t border-stone-200/60 bg-stone-50/10 font-medium animate-fade-in">
          <div>
            <strong className="text-stone-900 font-bold">1. Chest:</strong> Measured flat from armpit seam to armpit seam, then doubled.
          </div>
          <div>
            <strong className="text-stone-900 font-bold">2. Waist:</strong> Measured across the narrowest point of the waistband, then doubled.
          </div>
          <div>
            <strong className="text-stone-900 font-bold">3. Hip:</strong> Measured across the widest part of the lower garment, then doubled.
          </div>
          <div>
            <strong className="text-stone-900 font-bold">4. Length:</strong> Measured vertically from the highest shoulder seam down to the hem.
          </div>
          <div className="text-[10px] text-stone-500 border-t border-stone-200/60 pt-2 font-bold italic flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 flex-shrink-0 text-stone-400" />
            Measurements are physical tape dimensions of the item flat-laid, not body sizes.
          </div>
        </div>
      )}
    </div>
  );
};

// Helper to generate a universal sizing chart based on categories and sizing parameters
export function getUniversalSizeChart(sizes: string[] = [], productName: string = ""): MeasurementRow[] {
  const nameLower = productName.toLowerCase();
  
  // If it's a saree or only has Free Size / FS
  if (sizes.includes("Free") || sizes.includes("FS") || nameLower.includes("saree") || nameLower.includes("kasavu")) {
    const s = sizes.includes("FS") ? "FS" : "Free";
    return [
      {
        size: s,
        chest: "N/A",
        waist: "N/A",
        shoulder: "N/A",
        length: "5.5 meters",
        hip: "N/A",
        fitType: "Draped",
        stretch: "None",
      }
    ];
  }

  // Otherwise, it's apparel (Kurti, Lehenga, Salwar Set, etc.)
  const standardMap: Record<string, Omit<MeasurementRow, "size">> = {
    "XS": { chest: "32\"", waist: "26\"", shoulder: "13.5\"", length: "42\"", hip: "36\"", fitType: "Regular", stretch: "Low" },
    "S": { chest: "34\"", waist: "28\"", shoulder: "14\"", length: "43\"", hip: "38\"", fitType: "Regular", stretch: "Low" },
    "M": { chest: "36\"", waist: "30\"", shoulder: "14.5\"", length: "44\"", hip: "40\"", fitType: "Regular", stretch: "Low" },
    "L": { chest: "38\"", waist: "32\"", shoulder: "15\"", length: "45\"", hip: "42\"", fitType: "Regular", stretch: "Low" },
    "XL": { chest: "40\"", waist: "34\"", shoulder: "15.5\"", length: "45\"", hip: "44\"", fitType: "Regular", stretch: "Low" },
    "XXL": { chest: "42\"", waist: "36\"", shoulder: "16\"", length: "46\"", hip: "46\"", fitType: "Regular", stretch: "Low" },
    "3XL": { chest: "44\"", waist: "38\"", shoulder: "16.5\"", length: "46\"", hip: "48\"", fitType: "Regular", stretch: "Low" },
  };

  const matrix: MeasurementRow[] = [];
  const activeSizes = sizes.length > 0 ? sizes : ["S", "M", "L", "XL"];
  
  for (const sz of activeSizes) {
    const upperSz = sz.toUpperCase();
    if (standardMap[upperSz]) {
      matrix.push({
        size: sz,
        ...standardMap[upperSz],
      });
    } else {
      matrix.push({
        size: sz,
        chest: "36\"",
        waist: "30\"",
        shoulder: "14.5\"",
        length: "44\"",
        hip: "40\"",
        fitType: "Regular",
        stretch: "Low",
      });
    }
  }

  return matrix;
}

// ─────────────────────────────────────────────────────────────────────────────
// Subcomponent: MeasurementTable
// ─────────────────────────────────────────────────────────────────────────────
interface MeasurementTableProps {
  matrix: MeasurementRow[];
  selectedSize: string;
  isFallback: boolean;
}
export const MeasurementTable: React.FC<MeasurementTableProps> = ({ matrix, selectedSize, isFallback }) => {
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
      {isFallback ? (
        <div className="bg-stone-50 border border-stone-200/60 rounded-xl p-3.5 mb-3 text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-stone-850">
              <Info className="w-3.5 h-3.5 text-stone-500 flex-shrink-0" />
              <span className="text-[10px] font-extrabold uppercase tracking-wider">
                Standard Size Reference
              </span>
            </div>
            {selectedSize ? (
              <span className="text-[9px] font-bold text-stone-600 bg-stone-100/80 px-2 py-0.5 rounded border border-stone-200/50">
                Active Size: {selectedSize}
              </span>
            ) : (
              <span className="text-[9px] font-bold text-stone-500 bg-stone-100/80 px-2 py-0.5 rounded border border-stone-200/50">
                Standard Fit
              </span>
            )}
          </div>
          <p className="text-[10px] text-stone-500 mt-2 leading-relaxed font-medium">
            Partner measurements unavailable. Showing standard size reference.
          </p>
        </div>
      ) : (
        <div className="bg-stone-50 border border-stone-200/60 rounded-xl p-3.5 mb-3 text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-stone-850">
              <Info className="w-3.5 h-3.5 text-stone-500 flex-shrink-0" />
              <span className="text-[10px] font-extrabold uppercase tracking-wider">
                Garment Measurements
              </span>
            </div>
            {selectedSize && (
              <span className="text-[9px] font-bold text-stone-600 bg-stone-100/80 px-2 py-0.5 rounded border border-stone-200/50">
                Active Size: {selectedSize}
              </span>
            )}
          </div>
          <p className="text-[10px] text-stone-500 mt-2 leading-relaxed font-medium">
            Garment measurements provided by the partner.
          </p>
        </div>
      )}

      <div
        ref={containerRef}
        className="w-full border border-stone-200/80 rounded-2xl overflow-x-auto scrollbar-thin scrollbar-thumb-stone-300 hover:scrollbar-thumb-stone-400"
      >
        <table className="min-w-[500px] w-full text-left border-collapse text-xs table-fixed">
          <thead>
            <tr className="bg-stone-50/50 border-b border-stone-200/80 text-[9px] font-bold text-stone-500 uppercase tracking-wider sticky top-0 z-10 backdrop-blur-md">
              <th className="px-3.5 py-3 w-[70px]">Size</th>
              <th className="px-3.5 py-3">Chest</th>
              <th className="px-3.5 py-3">Waist</th>
              <th className="px-3.5 py-3">Hip</th>
              <th className="px-3.5 py-3">Length</th>
              <th className="px-3.5 py-3">Fit Type</th>
              <th className="px-3.5 py-3">Stretch</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 font-semibold text-stone-850">
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
                    "transition-all duration-200",
                    isSelected
                      ? "bg-stone-100/70 border-l-2 border-l-stone-900 scale-[1.002]"
                      : idx % 2 === 1
                      ? "bg-stone-50/20"
                      : "bg-white"
                  )}
                >
                  <td
                    className={cn(
                      "px-3.5 py-3 font-bold w-[70px] transition-colors",
                      isSelected ? "text-stone-900 bg-stone-100/30" : "text-stone-850"
                    )}
                  >
                    {row.size}
                  </td>
                  <td className="px-3.5 py-3">{row.chest}</td>
                  <td className="px-3.5 py-3">{row.waist}</td>
                  <td className="px-3.5 py-3">{hipVal}</td>
                  <td className="px-3.5 py-3">{row.length}</td>
                  <td className="px-3.5 py-3 text-stone-500 font-medium">{fitTypeVal}</td>
                  <td className="px-3.5 py-3 text-stone-500 font-medium">{stretchVal}</td>
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
  measurementMatrix?: MeasurementRow[];
  sizes?: string[];
  selectedSize: string;
  fitNote?: string;
  className?: string;
  isOpen?: boolean;
  setIsOpen?: (open: boolean) => void;
}

export const MeasurementMatrix: React.FC<MeasurementMatrixProps> = ({
  productName,
  measurementMatrix = [],
  sizes = [],
  selectedSize,
  fitNote = "Standard sizing. Fits true to size.",
  className = "",
  isOpen: controlledIsOpen,
  setIsOpen: controlledSetIsOpen,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = controlledSetIsOpen !== undefined ? controlledSetIsOpen : setInternalIsOpen;

  const isFallback = !measurementMatrix || measurementMatrix.length === 0;

  // Only render when open
  if (!isOpen) return null;

  const activeMatrix = measurementMatrix;

  return (
    <div className={cn("w-full flex flex-col text-left py-2", className)}>
      <div className="w-full flex flex-col gap-4 animate-fade-in pt-2">
        {/* Table Section */}
        <MeasurementTable matrix={activeMatrix} selectedSize={selectedSize} isFallback={isFallback} />

        {/* Legend Guide Accordion */}
        <MeasurementLegend />

        {/* Bottom Close Button */}
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500 hover:text-stone-900 transition-colors cursor-pointer"
          >
            Hide Measurements ↑
          </button>
        </div>
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
