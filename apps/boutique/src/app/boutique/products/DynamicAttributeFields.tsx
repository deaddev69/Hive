"use client";

import React from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@hive/ui";

/**
 * The attribute form for a category whose questions are defined in admin.
 *
 * SpecificationEditor renders the hardcoded VerticalConfig fields and stays in
 * place for every category without a schema of its own — that is the apparel
 * path. This component renders the database-defined ones instead, so a new
 * vertical (perfume, bags, anything after) needs no code here.
 */

export interface AttributeFieldDef {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "multi-select";
  options?: string[];
  required: boolean;
  unit?: string;
  helpText?: string;
}

interface Props {
  fields: AttributeFieldDef[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  /** Keys the seller left blank on a required field, from the submit attempt. */
  missingKeys?: string[];
}

function FieldShell({
  field,
  invalid,
  children,
}: {
  field: AttributeFieldDef;
  invalid: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
        {field.label}
        {field.required && <span className="text-red-500 ml-0.5">*</span>}
        {field.unit && (
          <span className="ml-1.5 font-semibold normal-case tracking-normal text-slate-400">
            in {field.unit}
          </span>
        )}
      </label>
      {children}
      {invalid ? (
        <span className="text-[11px] font-medium text-red-500">
          {field.label} is required.
        </span>
      ) : (
        field.helpText && (
          <span className="text-[11px] text-slate-400">{field.helpText}</span>
        )
      )}
    </div>
  );
}

function SelectField({
  field,
  value,
  onChange,
}: {
  field: AttributeFieldDef;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full px-4 py-3 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-[13px] flex items-center justify-between text-left transition-all cursor-pointer focus:outline-none focus:border-slate-900"
      >
        <span className={value ? "font-semibold text-slate-900" : "text-slate-400"}>
          {value || `Select ${field.label.toLowerCase()}`}
        </span>
        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute z-20 mt-1.5 w-full max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg p-1 flex flex-col gap-0.5">
          {(field.options ?? []).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                // Choosing the current value again clears it, so an optional
                // field can be unset without a separate control.
                onChange(option === value ? "" : option);
                setOpen(false);
              }}
              className={cn(
                "w-full px-3 py-2 rounded-lg text-left text-xs font-medium flex items-center justify-between cursor-pointer transition-all",
                option === value
                  ? "bg-slate-950 text-white font-bold"
                  : "text-slate-700 hover:bg-slate-50"
              )}
            >
              {option}
              {option === value && <Check className="w-3.5 h-3.5" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MultiSelectField({
  field,
  value,
  onChange,
}: {
  field: AttributeFieldDef;
  value: string;
  onChange: (value: string) => void;
}) {
  // Stored as a comma-separated string so `details` stays Record<string,string>,
  // which is the shape every existing consumer of products.details reads.
  const chosen = value ? value.split(",").map((v) => v.trim()).filter(Boolean) : [];

  const toggle = (option: string) => {
    const next = chosen.includes(option)
      ? chosen.filter((c) => c !== option)
      : [...chosen, option];
    onChange(next.join(", "));
  };

  return (
    <div className="flex flex-wrap gap-2">
      {(field.options ?? []).map((option) => {
        const active = chosen.includes(option);
        return (
          <button
            key={option}
            type="button"
            onClick={() => toggle(option)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border",
              active
                ? "bg-slate-950 text-white border-slate-950"
                : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"
            )}
          >
            {option}
            {active && <X className="w-3 h-3" />}
          </button>
        );
      })}
    </div>
  );
}

export function DynamicAttributeFields({ fields, values, onChange, missingKeys = [] }: Props) {
  if (fields.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-bold text-slate-900 tracking-tight">
          Product Details
        </span>
        <span className="text-[11px] text-slate-500">
          These are the details shoppers filter and compare on for this category.
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map((field) => {
          const value = values[field.key] ?? "";
          const invalid = missingKeys.includes(field.key);
          const isWide = field.type === "multi-select";

          return (
            <div key={field.key} className={isWide ? "sm:col-span-2" : undefined}>
              <FieldShell field={field} invalid={invalid}>
                {field.type === "select" ? (
                  <SelectField
                    field={field}
                    value={value}
                    onChange={(v) => onChange(field.key, v)}
                  />
                ) : field.type === "multi-select" ? (
                  <MultiSelectField
                    field={field}
                    value={value}
                    onChange={(v) => onChange(field.key, v)}
                  />
                ) : (
                  <input
                    type={field.type === "number" ? "number" : "text"}
                    inputMode={field.type === "number" ? "decimal" : undefined}
                    step={field.type === "number" ? "any" : undefined}
                    value={value}
                    placeholder={
                      field.type === "number"
                        ? field.unit
                          ? `e.g. 100 ${field.unit}`
                          : "Enter a number"
                        : `Enter ${field.label.toLowerCase()}`
                    }
                    onChange={(e) => onChange(field.key, e.target.value)}
                    className={cn(
                      "w-full px-4 py-3 bg-white border rounded-xl text-[13px] font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all",
                      invalid ? "border-red-500" : "border-slate-200 hover:border-slate-300"
                    )}
                  />
                )}
              </FieldShell>
            </div>
          );
        })}
      </div>
    </div>
  );
}
