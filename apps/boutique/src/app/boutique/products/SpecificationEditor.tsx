"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, X, Ruler } from "lucide-react";
import { cn } from "@hive/ui";
import { VerticalConfig } from "@hive/types";

// Constant options for common verticals
const FRAGRANCE_FAMILY_OPTIONS = [
  "Floral", "Woody", "Oriental / Amber", "Fresh / Citrus",
  "Gourmand", "Aquatic", "Spicy", "Aromatic", "Oud", "Fruity", "Other"
];

const CONCENTRATION_OPTIONS = [
  "Eau de Parfum (EDP)", "Eau de Toilette (EDT)", "Parfum / Extrait",
  "Attar / Perfume Oil", "Eau de Cologne (EDC)", "Body Mist", "Other"
];

const GENDER_OPTIONS = ["Unisex", "Pour Femme (Women)", "Pour Homme (Men)"];

const LONGEVITY_OPTIONS = [
  "4-6 Hours", "6-8 Hours", "8-12 Hours", "12+ Hours (All Day)"
];

const BAG_TYPE_OPTIONS = [
  "Tote Bag", "Sling Bag", "Crossbody", "Shoulder Bag",
  "Clutch", "Potli", "Satchel", "Backpack", "Handbag", "Other"
];

const STRAP_OPTIONS = [
  "Detachable Crossbody Strap", "Fixed Shoulder Handles", "Chain Strap",
  "Adjustable Leather Strap", "Double Handles", "Wristlet Strap", "Other"
];

const CLOSURE_OPTIONS = [
  "Zipper", "Magnetic Snap", "Drawstring", "Flap Lock",
  "Hook and Eye", "Buttons", "Turn Lock", "Slip On", "Other"
];

// Inline Dropdown Helper
interface InlineDropdownProps {
  label: string;
  options: string[];
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
  onRemove?: () => void;
}

function InlineDropdown({ label, options, placeholder, value, onChange, onRemove }: InlineDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`flex flex-col gap-1.5 relative w-full font-sans ${isOpen ? "z-[120]" : "z-10"}`} ref={containerRef}>
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">{label}</label>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-[11px] font-semibold text-slate-400 hover:text-red-600 transition-colors cursor-pointer flex items-center gap-0.5"
          >
            <X className="w-3 h-3" />
            <span>Remove</span>
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-[13px] text-left text-slate-800 flex items-center justify-between focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all cursor-pointer select-none"
      >
        <span className={value ? "text-slate-900 font-medium" : "text-slate-400 font-normal"}>
          {value || placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-[104%] bg-white border border-slate-200 rounded-xl shadow-xl z-[120] max-h-56 overflow-y-auto py-1 animate-in fade-in-50 zoom-in-95">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                onChange(opt);
                setIsOpen(false);
              }}
              className={cn(
                "w-full px-4 py-2.5 text-[13px] text-left hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer",
                value === opt ? "bg-slate-50 text-slate-950 font-bold" : "text-slate-700 font-medium"
              )}
            >
              <span>{opt}</span>
              {value === opt && <Check className="w-4 h-4 text-slate-950" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export interface SpecificationEditorProps {
  config: VerticalConfig;
  details: Record<string, string>;
  onDetailChange: (key: string, value: string) => void;
  activeExtraFields: Set<string>;
  onToggleExtraField: (key: string) => void;
  // Measurement matrix (apparel-only)
  measurementMatrix?: Array<{ size: string; chest: string; waist: string; shoulder: string; length: string }>;
  onMeasurementMatrixChange?: (matrix: any) => void;
  selectedSizes?: string[];
}

export function SpecificationEditor({
  config,
  details,
  onDetailChange,
  activeExtraFields,
  onToggleExtraField,
  measurementMatrix = [],
  onMeasurementMatrixChange,
  selectedSizes = [],
}: SpecificationEditorProps) {
  const isFragrance = config.id === "fragrance";
  const isHandbag = config.id === "handbag";
  const isApparel = config.id === "apparel";

  // Pre-configured dropdown lists based on vertical
  const getDropdownOptions = (key: string): string[] | null => {
    if (key === "fragranceFamily") return FRAGRANCE_FAMILY_OPTIONS;
    if (key === "concentration") return CONCENTRATION_OPTIONS;
    if (key === "gender") return GENDER_OPTIONS;
    if (key === "longevity") return LONGEVITY_OPTIONS;
    if (key === "bagType") return BAG_TYPE_OPTIONS;
    if (key === "strapType") return STRAP_OPTIONS;
    if (key === "closure") return CLOSURE_OPTIONS;
    return null;
  };

  // Spec keys available for progressive disclosure
  const availableChips = config.specKeys
    .filter((k) => k !== "color") // color is handled in step 2
    .map((k) => ({
      id: k,
      label: `+ ${config.specLabels[k] || k}`,
    }));

  return (
    <div className="flex flex-col gap-5 pt-2" style={{ touchAction: "pan-y" }}>
      {/* ── FRAGRANCE DIRECT FIELDS (Olfactory Profile & Concentration) ── */}
      {isFragrance && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-200">
          <InlineDropdown
            label="Concentration *"
            options={CONCENTRATION_OPTIONS}
            placeholder="Select concentration (e.g. EDP, EDT)..."
            value={details.concentration || ""}
            onChange={(val) => onDetailChange("concentration", val)}
          />

          <InlineDropdown
            label="Olfactory Family"
            options={FRAGRANCE_FAMILY_OPTIONS}
            placeholder="Select scent family (e.g. Woody, Floral)..."
            value={details.fragranceFamily || ""}
            onChange={(val) => onDetailChange("fragranceFamily", val)}
          />

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Scent Notes (Top, Heart, Base)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <input
                type="text"
                placeholder="Top Notes (e.g. Bergamot, Citrus)"
                value={details.topNotes || ""}
                onChange={(e) => onDetailChange("topNotes", e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-[12px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900"
              />
              <input
                type="text"
                placeholder="Heart Notes (e.g. Rose, Cardamom)"
                value={details.heartNotes || ""}
                onChange={(e) => onDetailChange("heartNotes", e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-[12px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900"
              />
              <input
                type="text"
                placeholder="Base Notes (e.g. Amber, Sandalwood)"
                value={details.baseNotes || ""}
                onChange={(e) => onDetailChange("baseNotes", e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-[12px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── HANDBAG DIRECT FIELDS (Silhouette & Dimensions) ── */}
      {isHandbag && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-200">
          <InlineDropdown
            label="Bag Silhouette *"
            options={BAG_TYPE_OPTIONS}
            placeholder="Select style (e.g. Tote, Sling, Crossbody)..."
            value={details.bagType || ""}
            onChange={(val) => onDetailChange("bagType", val)}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Dimensions (L x W x H)
            </label>
            <input
              type="text"
              placeholder="e.g. 28cm x 12cm x 22cm"
              value={details.dimensions || ""}
              onChange={(e) => onDetailChange("dimensions", e.target.value)}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900"
            />
          </div>
        </div>
      )}

      {/* ── PROGRESSIVE DISCLOSURE CHIPS FOR ALL VERTICALS ── */}
      {availableChips.length > 0 && (
        <div className="space-y-2.5 pt-2 border-t border-slate-100">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Add Optional {config.label} Details
          </label>

          <div className="flex flex-wrap gap-1.5">
            {availableChips.map((chip) => {
              const isOpen = activeExtraFields.has(chip.id);
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => onToggleExtraField(chip.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer select-none",
                    isOpen
                      ? "bg-slate-950 text-white border-slate-950 font-semibold"
                      : "bg-white hover:bg-slate-50 border-slate-200 text-slate-600"
                  )}
                >
                  {isOpen ? `✓ ${chip.label.replace("+ ", "")}` : chip.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── EXPANDED DETAIL INPUTS ── */}
      {activeExtraFields.size > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 animate-in fade-in duration-200">
          {Array.from(activeExtraFields).map((fieldKey) => {
            const label = config.specLabels[fieldKey] || fieldKey;
            const dropdownOpts = getDropdownOptions(fieldKey);

            if (dropdownOpts) {
              return (
                <InlineDropdown
                  key={fieldKey}
                  label={label}
                  options={dropdownOpts}
                  placeholder={`Select ${label.toLowerCase()}...`}
                  value={details[fieldKey] || ""}
                  onChange={(val) => onDetailChange(fieldKey, val)}
                  onRemove={() => {
                    onDetailChange(fieldKey, "");
                    onToggleExtraField(fieldKey);
                  }}
                />
              );
            }

            return (
              <div key={fieldKey} className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    {label}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      onDetailChange(fieldKey, "");
                      onToggleExtraField(fieldKey);
                    }}
                    className="text-[11px] text-slate-400 hover:text-red-600 font-semibold cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
                <input
                  type="text"
                  placeholder={`Enter ${label.toLowerCase()}...`}
                  value={details[fieldKey] || ""}
                  onChange={(e) => onDetailChange(fieldKey, e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900"
                />
              </div>
            );
          })}
        </div>
      )}

      {/* ── APPAREL ONLY: MEASUREMENT MATRIX ── */}
      {isApparel && config.variant.requiresMeasurements && onMeasurementMatrixChange && selectedSizes.length > 0 && (
        <div className="flex flex-col gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            <Ruler className="w-4 h-4 text-slate-500" />
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
              Garment Measurements (Inches)
            </label>
          </div>
          <p className="text-[11px] text-slate-400 font-normal">
            Optional: Add chest, waist, and length measurements to assist customer sizing.
          </p>
        </div>
      )}
    </div>
  );
}
