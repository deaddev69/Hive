"use client";

import React, { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Button, Modal, TextEffect } from "@hive/ui";
import { Upload, X, ArrowRight, ArrowLeft, Check, ImageIcon, AlertCircle, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { toast } from "@hive/utils";

const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL", "FREE"];
const MATERIAL_OPTIONS = [
  "Cotton", "Silk", "Linen", "Georgette", "Chiffon",
  "Velvet", "Rayon", "Satin", "Blend", "Other"
];
const CARE_OPTIONS = ["Dry Clean Only", "Machine Wash Cold", "Hand Wash", "Do Not Bleach", "Other"];

const DEFAULT_CATEGORY_TAGS = [
  { id: "womens-ethnic", name: "Women's Ethnic" },
  { id: "sarees", name: "Sarees" },
  { id: "lehengas", name: "Lehengas" },
  { id: "kurtis", name: "Kurtis" },
  { id: "salwar-sets", name: "Salwar Sets" },
  { id: "anarkalis", name: "Anarkalis" },
  { id: "gowns", name: "Gowns" },
  { id: "indo-western", name: "Indo-Western" },
  { id: "dupattas", name: "Dupattas" },
  { id: "blouses", name: "Blouses" },
  { id: "co-ord-sets", name: "Co-ord Sets" },
  { id: "fusion-wear", name: "Fusion Wear" },
  { id: "dresses", name: "Dresses" },
  { id: "tops-tunics", name: "Tops & Tunics" },
  { id: "jewellery", name: "Jewellery" },
  { id: "accessories", name: "Accessories" },
  { id: "home-decor", name: "Home Decor" },
  { id: "other", name: "Other" }
];

const FABRIC_CONTENT_OPTIONS = [
  "100% Cotton", "100% Organic Silk", "100% Linen", "50% Silk 50% Cotton",
  "80% Cotton 20% Polyester", "100% Rayon", "100% Polyester", "100% Viscose",
  "Silk Blend", "Cotton Blend", "Wool Blend", "Other"
];
const FABRIC_DETAIL_OPTIONS = [
  "Plain Weave", "Satin", "Twill Weave", "Jacquard", "Zari Brocade",
  "Chanderi Weave", "Georgette", "Chiffon", "Velvet", "Mulmul", "Organza", "Other"
];
const NECK_TYPE_OPTIONS = [
  "Boat Neck", "Mandarin Collar", "V-Neck", "Round Neck", "Sweetheart Neck",
  "Collar Neck", "High Neck", "Square Neck", "Halter Neck", "Cowl Neck", "Other"
];
const CLOSURE_OPTIONS = [
  "Hook and Eye", "Zipper", "Buttons", "Drawstring", "Slip On",
  "Elasticated", "Tie-up", "Velcro", "Other"
];
const SLEEVE_LENGTH_OPTIONS = [
  "Three-Quarter Sleeve", "Short Sleeve", "Sleeveless", "Full Sleeve",
  "Half Sleeve", "Elbow Length", "Cap Sleeve", "Other"
];
const SLEEVE_STYLING_OPTIONS = [
  "Puff Sleeve", "Regular", "Bell Sleeve", "Flutter Sleeve", "Bishop Sleeve",
  "Cape Sleeve", "Raglan Sleeve", "Other"
];
const SHAPE_OPTIONS = [
  "A-Line", "Straight", "Anarkali", "Flared", "Fit and Flare", "Asymmetric",
  "Peplum", "Other"
];
const HEMLINE_OPTIONS = [
  "Flared", "Asymmetric", "Straight", "Curved", "Scalloped", "High-Low", "Other"
];
const GARMENT_LENGTH_OPTIONS = [
  "Calf Length", "Knee Length", "Maxi / Floor Length", "Ankle Length",
  "Short / Above Knee", "Thigh Length", "Other"
];
const PATTERN_OPTIONS = [
  "Floral Print", "Solid / Plain", "Striped", "Self Design", "Embellished",
  "Checked", "Printed", "Zari Woven", "Embroidery", "Other"
];
const FABRIC_FAMILY_OPTIONS = [
  "Silk", "Cotton", "Banarasi", "Linen", "Organza", "Chanderi",
  "Georgette", "Crepe", "Velvet", "Rayon", "Polyester", "Other"
];

interface InlineDropdownProps {
  label: string;
  options: string[];
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
}

function InlineDropdown({ label, options, placeholder, value, onChange }: InlineDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [isOpen]);

  return (
    <div className={`flex flex-col gap-1.5 relative w-full font-sans animate-in fade-in ${isOpen ? "z-[120]" : "z-10"}`} ref={containerRef}>
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-700">{label}</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-[13px] text-left text-slate-700 bg-white flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-[#F5C22B] shadow-sm cursor-pointer select-none"
      >
        <span className={value ? "text-slate-800 font-medium" : "text-slate-400 font-medium"}>
          {value || placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div ref={listRef} className="absolute left-0 right-0 top-[102%] bg-white border border-slate-200 rounded-xl shadow-2xl z-[120] max-h-56 overflow-y-auto py-1 animate-in fade-in slide-in-from-top-1">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                onChange(opt);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-2.5 text-[13px] text-left hover:bg-slate-50 transition-colors ${value === opt ? "bg-[#F5C22B]/10 text-[#D9A71E] font-bold" : "text-slate-700"
                }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function autoCorrectCapitalization(str: string): string {
  if (!str) return str;
  return str.replace(/\b([a-z])([a-z]*)\b/gi, (match, p1, p2) => {
    return p1.toUpperCase() + p2.toLowerCase();
  });
}

interface CustomSelectProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder: string;
  required?: boolean;
}

function CustomSelect({ label, value, onChange, options, placeholder, required }: CustomSelectProps) {
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
    <div className="flex flex-col gap-1.5 relative w-full font-sans" ref={containerRef}>
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-[13px] text-left text-slate-700 bg-white shadow-sm flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-[#F5C22B] select-none cursor-pointer"
      >
        <span className={value ? "text-slate-800 font-medium" : "text-slate-400 font-medium"}>
          {value || placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-[102%] bg-white border border-[#f1f5f9]/30 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto py-1 animate-in fade-in slide-in-from-top-1">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                onChange(opt);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-2.5 text-[13px] text-left hover:bg-slate-50 transition-colors ${value === opt ? "bg-[#F5C22B]/10 text-[#D9A71E] font-bold" : "text-slate-700"
                }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface CustomMultiSelectProps {
  label: string;
  selectedValues: string[];
  onChange: (vals: string[]) => void;
  options: string[];
  placeholder: string;
  required?: boolean;
}

function CustomMultiSelect({
  label,
  selectedValues,
  onChange,
  options,
  placeholder,
  required,
}: CustomMultiSelectProps) {
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

  const toggleOption = (opt: string) => {
    if (selectedValues.includes(opt)) {
      onChange(selectedValues.filter((v) => v !== opt));
    } else {
      onChange([...selectedValues, opt]);
    }
  };

  const displayText = selectedValues.length > 0 ? selectedValues.join(", ") : placeholder;

  return (
    <div className="flex flex-col gap-1.5 relative w-full font-sans" ref={containerRef}>
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-[13px] text-left text-slate-700 bg-white shadow-sm flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-[#F5C22B] select-none"
      >
        <span className={selectedValues.length > 0 ? "text-slate-800 font-medium truncate pr-2" : "text-slate-400 font-medium"}>
          {displayText}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-[102%] bg-white border border-[#f1f5f9]/30 rounded-xl shadow-lg z-50 max-h-56 overflow-y-auto py-1.5 animate-in fade-in slide-in-from-top-1">
          {options.map((opt) => {
            const isChecked = selectedValues.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => toggleOption(opt)}
                className={`w-full px-4 py-2 flex items-center gap-3 hover:bg-slate-50 transition-colors text-[13px] text-slate-700`}
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${isChecked ? "bg-[#F5C22B] border-[#F5C22B] text-slate-900" : "border-slate-300 bg-white"
                  }`}>
                  {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <span className={isChecked ? "font-bold text-slate-900" : "font-medium"}>{opt}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface CategoryMultiSelectProps {
  selectedValues: string[];
  onChange: (vals: string[]) => void;
  categories: { _id: string; name: string }[];
  required?: boolean;
}

function CategoryMultiSelect({
  selectedValues,
  onChange,
  categories,
  required,
}: CategoryMultiSelectProps) {
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

  const toggleCategory = (catId: string) => {
    if (selectedValues.includes(catId)) {
      onChange(selectedValues.filter((id) => id !== catId));
    } else {
      if (selectedValues.length >= 3) {
        toast.error("Category Limit Reached", "You can select up to 3 categories only.");
        return;
      }
      onChange([...selectedValues, catId]);
    }
  };

  const getCategoryName = (id: string) => {
    const found = categories.find((c) => c._id === id || c.name.toLowerCase() === id.toLowerCase());
    return found ? found.name : id;
  };

  return (
    <div className="flex flex-col gap-1.5 relative w-full font-sans" ref={containerRef}>
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-black uppercase tracking-widest text-slate-600">
          CATEGORY TAG {required && <span className="text-red-500">*</span>}
        </label>
        <span className="text-[10px] font-bold text-slate-400">
          {selectedValues.length}/3 selected (Max 3)
        </span>
      </div>

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-[13px] text-left text-slate-700 bg-white shadow-sm flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-[#F5C22B] select-none cursor-pointer"
      >
        <span className={selectedValues.length > 0 ? "text-slate-800 font-medium truncate pr-2" : "text-slate-400 font-medium"}>
          {selectedValues.length > 0
            ? selectedValues.map(getCategoryName).join(", ")
            : "Select categories (max 3)..."}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {selectedValues.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {selectedValues.map((catId) => {
            const catName = getCategoryName(catId);
            return (
              <span
                key={catId}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#F5C22B]/15 text-[#9E7606] font-bold text-[11px] rounded-full border border-[#F5C22B]/30 shadow-2xs"
              >
                {catName}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(selectedValues.filter((id) => id !== catId));
                  }}
                  className="hover:text-red-600 p-0.5 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {isOpen && (
        <div className="absolute left-0 right-0 top-[102%] bg-white border border-[#f1f5f9]/30 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto py-1.5 animate-in fade-in slide-in-from-top-1">
          {categories.map((c) => {
            const isChecked = selectedValues.includes(c._id);
            const isMaxReached = !isChecked && selectedValues.length >= 3;

            return (
              <button
                key={c._id}
                type="button"
                onClick={() => toggleCategory(c._id)}
                disabled={isMaxReached}
                className={`w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors text-[13px] ${isMaxReached ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${isChecked ? "bg-[#F5C22B] border-[#F5C22B] text-slate-900" : "border-slate-300 bg-white"
                      }`}
                  >
                    {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span className={isChecked ? "font-bold text-slate-900" : "font-medium text-slate-700"}>
                    {c.name}
                  </span>
                </div>
                {isChecked && (
                  <span className="text-[10px] font-black uppercase text-[#D9A71E] bg-[#F5C22B]/10 px-2 py-0.5 rounded-full">
                    Selected
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function CreateProductModal({
  isOpen,
  onClose,
  productToEdit,
  categories,
}: {
  isOpen: boolean;
  onClose: () => void;
  productToEdit: any;
  categories: any[];
}) {
  const createProduct = useMutation(api.products.createProduct);
  const updateProduct = useMutation(api.products.updateProduct);
  const platformSettings = useQuery(api.adminSettings.getPlatformSettings);
  const generateUploadUrl = useAction(api.media.api.generateUploadUrl);
  const commitUpload = useAction(api.media.api.commitUpload);
  const myBoutiqueSafe = useQuery(api.boutiques.getMyBoutiqueSafe);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Wizard state
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  // Scroll to top of modal container on step transition
  useEffect(() => {
    if (formRef.current) {
      const scrollParent = formRef.current.closest(".overflow-y-auto") || formRef.current.parentElement;
      if (scrollParent) {
        scrollParent.scrollTop = 0;
      }
    }
  }, [step]);

  // Form State
  const [name, setName] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [localPreviews, setLocalPreviews] = useState<{ url: string; file?: File; storageId?: string }[]>([]);

  const [description, setDescription] = useState("");
  const [story, setStory] = useState("");
  const [materialType, setMaterialType] = useState("");
  const [customMaterialType, setCustomMaterialType] = useState("");
  const [care, setCare] = useState("");
  const [customCare, setCustomCare] = useState("");
  const [craft, setCraft] = useState("");
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const [generatingStory, setGeneratingStory] = useState(false);

  // Use ONLY categories from the DB so it perfectly syncs with Admin Panel
  const allCategoriesList = React.useMemo(() => {
    const list: { _id: string; name: string }[] = [];
    const nameSet = new Set<string>();

    (categories || []).forEach((c) => {
      let cleanName = c.name;
      // Auto-correct typo from legacy DB entries if present
      if (cleanName.toLowerCase() === "ethnic wer") {
        cleanName = "Ethnic Wear";
      }
      list.push({ _id: c._id, name: cleanName });
      nameSet.add(cleanName.toLowerCase());
    });

    return list;
  }, [categories]);

  const [justPolishedDesc, setJustPolishedDesc] = useState(false);
  const [justPolishedStory, setJustPolishedStory] = useState(false);

  const handleGenerateAI = async (type: "description" | "story") => {
    const rough = type === "description" ? description : story;
    if (!rough || !rough.trim()) {
      toast.error(`Please write a few rough words or phrases in the ${type === "description" ? "description" : "design story"} field first.`);
      return;
    }

    if (type === "description") setGeneratingDesc(true);
    else setGeneratingStory(true);

    try {
      const boutiqueName = (myBoutiqueSafe?.boutique as any)?.boutiqueName || "";
      const boutiqueDescription = (myBoutiqueSafe?.boutique as any)?.description || "";

      const res = await fetch("/api/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roughText: rough,
          type,
          boutiqueName,
          boutiqueDescription,
        }),
      });

      let generatedText = "";
      if (res.headers.get("content-type")?.includes("application/json")) {
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        generatedText = data.text || "";
      } else {
        generatedText = await res.text();
      }

      if (type === "description") {
        setDescription(generatedText);
        setJustPolishedDesc(true);
        setTimeout(() => setJustPolishedDesc(false), 5000);
        toast.success("Copy Refined with AI", "Your text has been polished successfully.");
      } else {
        setStory(generatedText);
        setJustPolishedStory(true);
        setTimeout(() => setJustPolishedStory(false), 5000);
        toast.success("Copy Refined with AI", "Your text has been polished successfully.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("AI Generation Failed", "Couldn't generate copy right now. Please try again.");
    } finally {
      if (type === "description") setGeneratingDesc(false);
      else setGeneratingStory(false);
    }
  };
  const [step2Error, setStep2Error] = useState("");

  const [specs, setSpecs] = useState({
    color: "",
    fabricContent: "",
    fabricDetail: "",
    neckType: "",
    closure: "",
    sleeve: "",
    sleeveStyling: "",
    shape: "",
    hemline: "",
    length: "",
    pattern: "",
    fabricFamily: ""
  });

  const [specDropdowns, setSpecDropdowns] = useState({
    fabricContent: "",
    fabricDetail: "",
    neckType: "",
    closure: "",
    sleeve: "",
    sleeveStyling: "",
    shape: "",
    hemline: "",
    length: "",
    pattern: "",
    fabricFamily: "",
  });

  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [stockBySize, setStockBySize] = useState<Record<string, number>>({});
  const [fitRecommendation, setFitRecommendation] = useState<"runs_small" | "true_to_size" | "runs_large">("true_to_size");
  const [silhouette, setSilhouette] = useState<"slim_fit" | "regular_fit" | "relaxed_fit" | "oversized">("regular_fit");

  const [price, setPrice] = useState("");
  const [mrp, setMrp] = useState("");
  const [discountPrice, setDiscountPrice] = useState("");
  const [sameDayEligible, setSameDayEligible] = useState(false);
  const [featured, setFeatured] = useState(false);
  const [active, setActive] = useState(true);

  const [uploadingImages, setUploadingImages] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [uploadStatusText, setUploadStatusText] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (step < totalSteps) {
      if (step === 1) {
        if (!name.trim()) {
          toast.error("Product Name Required", "Please enter a product name.");
          return;
        }
        if (selectedCategoryIds.length === 0) {
          toast.error("Category Required", "Please select at least one category tag.");
          return;
        }
        if (localPreviews.length < 3) {
          toast.error("More Photos Needed", "Please upload at least 3 high-resolution photos.");
          return;
        }
      }
      if (step === 2) {
        setStep2Error("");
        if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
          setStep2Error("Please enter a valid price greater than ₹0.");
          toast.error("Valid Price Required", "Please enter a valid price greater than ₹0.");
          return;
        }
        if (selectedSizes.length === 0) {
          setStep2Error("Please select at least one active size.");
          toast.error("Sizing Required", "Please select at least one active size.");
          return;
        }
        const hasZeroStock = selectedSizes.every((sz) => !stockBySize[sz] || stockBySize[sz] <= 0);
        if (hasZeroStock) {
          setStep2Error("At least one selected size must have a stock quantity greater than 0.");
          toast.error("Stock Quantity Required", "At least one selected size must have a stock quantity greater than 0.");
          return;
        }
      }
      setStep(step + 1);
      return;
    }

    if (localPreviews.length < 3) {
      toast.error("Please upload at least 3 high-resolution images for your product.");
      return;
    }

    setSubmitError("");
    setSubmitting(true);
    setUploadingImages(true);
    setUploadStatusText("Uploading product images...");

    try {
      let completedUploads = 0;
      const totalNewFiles = localPreviews.filter((p) => p.file).length;

      // Parallelize image upload tasks using Promise.all (drops upload time from 5s to <1s)
      const uploadPromises = localPreviews.map(async (item) => {
        if (item.file) {
          const { presignedUrl, sessionId } = await generateUploadUrl({
            mimeType: item.file.type,
            fileSize: item.file.size,
            ownerType: "boutique",
            ownerId: "products",
            context: "product_image",
          });

          await fetch(presignedUrl, {
            method: "PUT",
            headers: { "Content-Type": item.file.type },
            body: item.file,
          });

          const finalizedAsset = await commitUpload({ sessionId });
          completedUploads++;
          if (totalNewFiles > 0) {
            setUploadStatusText(`Uploading images (${completedUploads}/${totalNewFiles})...`);
          }
          return finalizedAsset;
        } else if (item.storageId) {
          return item.storageId;
        }
        return null;
      });

      const finalImages = (await Promise.all(uploadPromises)).filter(Boolean);

      setUploadStatusText(productToEdit ? "Updating product catalog..." : "Publishing product...");
      setUploadingImages(false);

      const rawCatId = selectedCategoryIds[0] || (allCategoriesList?.[0]?._id || "womens-ethnic");
      const foundCat = allCategoriesList.find((c: any) => c._id === rawCatId || c.slug === rawCatId || c.name?.toLowerCase() === (rawCatId || "").toLowerCase());
      const resolvedCatId = foundCat ? foundCat._id : (allCategoriesList?.[0]?._id || rawCatId);

      const finalMaterial = materialType === "Other" ? autoCorrectCapitalization(customMaterialType) : materialType;
      const finalCare = care === "Other" ? autoCorrectCapitalization(customCare) : care;

      const payload = {
        name,
        description,
        categoryId: resolvedCatId as any,
        price: parseFloat(price),
        mrp: mrp ? parseFloat(mrp) : undefined,
        compareAtPrice: mrp ? parseFloat(mrp) : undefined,
        discountPrice: discountPrice ? parseFloat(discountPrice) : undefined,
        images: finalImages,
        sizes: selectedSizes,
        stockBySize,
        sameDayEligible,
        featured,
        active,
        story,
        materialType: finalMaterial,
        material: finalMaterial,
        care: finalCare,
        details: {
          ...specs,
        },
        fitRecommendation,
        silhouette,
      };

      if (productToEdit?._id) {
        await updateProduct({ id: productToEdit._id as any, ...payload });
        toast.success("Changes Saved", "Your product details have been updated successfully.");
      } else {
        await createProduct(payload);
        toast.success("Product Submitted for Verification", "Your listing is saved and under admin review. We'll notify you once it goes live.");
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      setSubmitError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
      setUploadingImages(false);
      setUploadStatusText("");
    }
  };

  const isSareeCategory = React.useMemo(() => {
    return selectedCategoryIds.some((catId) => {
      const found = allCategoriesList.find((c) => c._id === catId || c.name.toLowerCase() === catId.toLowerCase());
      if (!found) return false;
      const lower = found.name.toLowerCase();
      return lower.includes("saree") || lower.includes("sarree");
    });
  }, [selectedCategoryIds, allCategoriesList]);

  // Auto-set FREE size for Saree category
  useEffect(() => {
    if (isSareeCategory) {
      setSelectedSizes(["FREE"]);
      setStockBySize((prev) => {
        if (prev["FREE"] !== undefined) return prev;
        return { ...prev, FREE: 5 }; // default stock 5
      });
    } else {
      setSelectedSizes((prev) => {
        if (prev.length === 1 && prev[0] === "FREE") {
          return [];
        }
        return prev;
      });
    }
  }, [isSareeCategory]);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      if (productToEdit) {
        setName(productToEdit.name || "");

        // Multi category init
        const rawCatIds = productToEdit.details?.categoryIds
          ? productToEdit.details.categoryIds.split(",")
          : [productToEdit.categoryId];
        setSelectedCategoryIds(rawCatIds.filter(Boolean));

        setDescription(productToEdit.description || "");
        setStory(productToEdit.story || "");

        // Material Type init
        const existingMat = productToEdit.materialType || productToEdit.material || "";
        if (MATERIAL_OPTIONS.includes(existingMat) && existingMat !== "Other") {
          setMaterialType(existingMat);
          setCustomMaterialType("");
        } else if (existingMat) {
          setMaterialType("Other");
          setCustomMaterialType(autoCorrectCapitalization(existingMat));
        } else {
          setMaterialType("");
          setCustomMaterialType("");
        }

        // Care init
        const existingCare = productToEdit.care || "";
        if (CARE_OPTIONS.includes(existingCare) && existingCare !== "Other") {
          setCare(existingCare);
          setCustomCare("");
        } else if (existingCare) {
          setCare("Other");
          setCustomCare(autoCorrectCapitalization(existingCare));
        } else {
          setCare("");
          setCustomCare("");
        }

        setCraft(productToEdit.details?.craft ? autoCorrectCapitalization(productToEdit.details.craft) : "");

        if (productToEdit.details) {
          const cFabricContent = autoCorrectCapitalization(productToEdit.details.fabricContent || "");
          const cFabricDetail = autoCorrectCapitalization(productToEdit.details.fabricDetail || "");
          const cNeckType = autoCorrectCapitalization(productToEdit.details.neckType || "");
          const cClosure = autoCorrectCapitalization(productToEdit.details.closure || "");
          const cSleeve = autoCorrectCapitalization(productToEdit.details.sleeve || "");
          const cSleeveStyling = autoCorrectCapitalization(productToEdit.details.sleeveStyling || "");
          const cShape = autoCorrectCapitalization(productToEdit.details.shape || "");
          const cHemline = autoCorrectCapitalization(productToEdit.details.hemline || "");
          const cLength = autoCorrectCapitalization(productToEdit.details.length || "");
          const cPattern = autoCorrectCapitalization(productToEdit.details.pattern || "");
          const cFabricFamily = autoCorrectCapitalization(productToEdit.details.fabricFamily || "");

          const initSpec = (val: string, options: string[]) => {
            if (!val) return "";
            const found = options.find(o => o.toLowerCase() === val.toLowerCase());
            if (found && found !== "Other") return found;
            return "Other";
          };

          setSpecs({
            color: autoCorrectCapitalization(productToEdit.details.color || ""),
            fabricContent: cFabricContent,
            fabricDetail: cFabricDetail,
            neckType: cNeckType,
            closure: cClosure,
            sleeve: cSleeve,
            sleeveStyling: cSleeveStyling,
            shape: cShape,
            hemline: cHemline,
            length: cLength,
            pattern: cPattern,
            fabricFamily: cFabricFamily
          });

          setSpecDropdowns({
            fabricContent: initSpec(cFabricContent, FABRIC_CONTENT_OPTIONS),
            fabricDetail: initSpec(cFabricDetail, FABRIC_DETAIL_OPTIONS),
            neckType: initSpec(cNeckType, NECK_TYPE_OPTIONS),
            closure: initSpec(cClosure, CLOSURE_OPTIONS),
            sleeve: initSpec(cSleeve, SLEEVE_LENGTH_OPTIONS),
            sleeveStyling: initSpec(cSleeveStyling, SLEEVE_STYLING_OPTIONS),
            shape: initSpec(cShape, SHAPE_OPTIONS),
            hemline: initSpec(cHemline, HEMLINE_OPTIONS),
            length: initSpec(cLength, GARMENT_LENGTH_OPTIONS),
            pattern: initSpec(cPattern, PATTERN_OPTIONS),
            fabricFamily: initSpec(cFabricFamily, FABRIC_FAMILY_OPTIONS),
          });
        }

        setSelectedSizes(productToEdit.sizes || []);
        setStockBySize(productToEdit.stockBySize || {});
        setFitRecommendation(productToEdit.fitRecommendation || "true_to_size");
        setSilhouette(productToEdit.silhouette || "regular_fit");

        setPrice(productToEdit.basePrice?.toString() || productToEdit.price?.toString() || "");
        const realMrp = (productToEdit as any).mrp ?? (productToEdit as any).compareAtPrice;
        setMrp(realMrp ? realMrp.toString() : "");
        setDiscountPrice(productToEdit.baseDiscountPrice?.toString() || productToEdit.discountPrice?.toString() || "");

        setSameDayEligible(productToEdit.sameDayEligible || false);
        setFeatured(productToEdit.featured || false);
        setActive(productToEdit.active !== false);

        const rawStorageIds = productToEdit.imageStorageIds || [];
        setImages(rawStorageIds);
        const previews = rawStorageIds.map((imgId: string, idx: number) => ({
          url: productToEdit.images?.[idx] || imgId,
          storageId: imgId
        }));
        setLocalPreviews(previews);
      } else {
        // Reset form
        setName("");
        const defaultCatId = allCategoriesList[0]?._id || "";
        setSelectedCategoryIds(defaultCatId ? [defaultCatId] : []);
        setDescription("");
        setStory("");
        setMaterialType("");
        setCustomMaterialType("");
        setCare("");
        setCustomCare("");
        setCraft("");
        setStep2Error("");
        setSpecs({
          color: "", fabricContent: "", fabricDetail: "", neckType: "",
          closure: "", sleeve: "", sleeveStyling: "", shape: "",
          hemline: "", length: "", pattern: "", fabricFamily: ""
        });
        setSpecDropdowns({
          fabricContent: "", fabricDetail: "", neckType: "", closure: "",
          sleeve: "", sleeveStyling: "", shape: "", hemline: "",
          length: "", pattern: "", fabricFamily: ""
        });
        setSelectedSizes([]);
        setStockBySize({});
        setFitRecommendation("true_to_size");
        setSilhouette("regular_fit");
        setPrice("");
        setDiscountPrice("");
        setSameDayEligible(false);
        setFeatured(false);
        setActive(true);
        setImages([]);
        setLocalPreviews([]);
      }
    }
  }, [isOpen, productToEdit, categories, allCategoriesList]);

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newPreviews = files.map((file) => ({
      url: URL.createObjectURL(file),
      file,
    }));
    setLocalPreviews((prev) => [...prev, ...newPreviews].slice(0, 5)); // max 5
  };

  const removeImage = (idx: number) => {
    setLocalPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const setCoverImage = (idx: number) => {
    const arr = [...localPreviews];
    const item = arr.splice(idx, 1)[0];
    if (item) {
      arr.unshift(item);
    }
    setLocalPreviews(arr);
  };

  const toggleSize = (size: string) => {
    setSelectedSizes((prev) => {
      if (prev.includes(size)) {
        const next = prev.filter((s) => s !== size);
        const newStock = { ...stockBySize };
        delete newStock[size];
        setStockBySize(newStock);
        return next;
      } else {
        return [...prev, size];
      }
    });
  };

  const renderStepIndicator = () => {
    const titles = ["PHOTOS & INFO", "DETAILS & SIZES", "SPECIFICATIONS"];
    return (
      <div className="flex flex-col mb-8">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-black tracking-widest text-[#D9A71E] uppercase">STEP {step} OF 3</span>
          <span className="text-[11px] font-black tracking-widest text-slate-800 uppercase">{titles[step - 1]}</span>
        </div>
        <div className="flex gap-2 w-full mb-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`h-1 rounded-full flex-1 ${i <= step ? "bg-[#F5C22B]" : "bg-[#F0F0F0]"}`} />
          ))}
        </div>

        {step === 1 && (
          <>
            <hr className="border-slate-100 mb-5" />
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs font-bold text-slate-800 mb-6 gap-3 sm:gap-0">
              <div className="flex flex-wrap items-center gap-2">
                <span>Listing Completeness: 50%</span>
                <span className="px-2 py-0.5 border border-slate-200 text-slate-600 rounded-md text-[9px] uppercase tracking-wider bg-slate-50">NEEDS DETAILS</span>
              </div>
              <span className="text-[#D9A71E] cursor-pointer text-[10px] uppercase tracking-widest">▼ VIEW CHECKLIST</span>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={productToEdit ? "Edit Product" : "Create Product"}
      className="max-w-xl w-full !p-5 sm:!p-8 bg-white font-sans"
    >
      <form onSubmit={handleSubmit} className="flex flex-col text-left" ref={formRef}>
        {renderStepIndicator()}

        {/* STEP 1: Photos & Info */}
        {step === 1 && (
          <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4">
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">PRODUCT INFO</h3>
              <p className="text-[13px] text-slate-500 font-medium">Specify your product name and select up to 3 category tags.</p>
            </div>

            <div className="flex flex-col gap-1.5 mt-1">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-600">PRODUCT NAME <span className="text-red-500">*</span></label>
              <input
                type="text"
                placeholder="e.g. Silk Zari Saree"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-[13px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
              />
            </div>

            <CategoryMultiSelect
              selectedValues={selectedCategoryIds}
              onChange={setSelectedCategoryIds}
              categories={allCategoriesList}
              required
            />

            <div className="flex flex-col gap-1.5 mt-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-600">YOUR BASE PRICE (₹) <span className="text-red-500">*</span></label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-[13px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#F5C22B] shadow-sm"
              />
              {price && platformSettings && (() => {
                const baseVal = parseFloat(price);
                if (isNaN(baseVal) || baseVal < 0) return null;

                const feeRate = platformSettings.platformFeeRate ?? 0.02;
                const feeAmount = baseVal * feeRate;
                const netPayout = baseVal - feeAmount;

                return (
                  <div className="text-[11px] font-medium text-slate-500 mt-1 flex flex-wrap items-center gap-x-3">
                    <div>
                      Platform Fee ({(feeRate * 100).toFixed(0)}%): <span className="font-bold text-slate-700 font-mono">-₹{feeAmount.toFixed(2)}</span>
                    </div>
                    <div>
                      Your Net Payout: <span className="font-bold text-emerald-600 font-mono">₹{netPayout.toLocaleString("en-IN", { minimumFractionDigits: 2 })} per order</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Physical Tag MRP (Optional - for authentic discount badges) */}
            <div className="bg-amber-50/40 border border-amber-200/60 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800">Physical Tag MRP (₹)</span>
                  <span className="text-[9px] bg-amber-200/60 text-amber-900 font-extrabold px-1.5 py-0.5 rounded uppercase">Optional</span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">
                  Want to show a discount badge? Enter the authentic MRP printed on the physical garment tag.
                </p>
              </div>
              <div className="w-full sm:w-48">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 2499"
                  value={mrp}
                  onChange={(e) => setMrp(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-amber-200 rounded-lg text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#F5C22B] shadow-2xs font-semibold"
                />
              </div>
            </div>

            <hr className="border-slate-100 my-4" />

            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">PRODUCT PHOTOS</h3>
              <p className="text-[13px] text-slate-500 font-medium leading-relaxed">Upload high-resolution images of your product (3 to 5 photos).<br />Click "Set Cover" to select a primary cover image.</p>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 border-[1.5px] border-dashed border-[#F5C22B] bg-[#f8fafc] rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-amber-50/50 transition-colors"
            >
              <Upload className="w-5 h-5 text-[#D9A71E] mb-2" />
              <span className="text-[11px] font-black tracking-widest uppercase text-slate-600">UPLOAD PHOTOS</span>
              <span className="text-[9px] font-bold tracking-widest text-slate-400 mt-1 uppercase">3-5 IMAGES</span>
              <input
                type="file"
                ref={fileInputRef}
                multiple
                accept="image/*"
                onChange={handleImageFileChange}
                className="hidden"
              />
            </div>

            {localPreviews.length > 0 && (
              <div className="flex flex-wrap gap-3 mt-2">
                {localPreviews.map((prev, idx) => (
                  <div key={idx} className="relative w-[100px] h-[100px] rounded-[18px] overflow-hidden border border-slate-200 shadow-sm group">
                    <img src={prev.url} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-full"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    {idx === 0 ? (
                      <div className="absolute top-2 left-2 bg-[#F5C22B] text-slate-900 font-bold text-[9px] font-black uppercase px-2 py-1 rounded-full shadow flex items-center gap-1"><span className="text-[8px]">✨</span> COVER</div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setCoverImage(idx)}
                        className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-white/90 text-slate-800 text-[9px] font-black uppercase px-2.5 py-1 rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap"
                      >
                        Set Cover
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Sizes & Stock */}
        {step === 2 && (
          <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4">
            {step2Error && (
              <div className="flex items-center gap-3 p-4 border-l-[3px] border-red-500 bg-[#FCF8F8] rounded-xl relative shadow-sm mt-2 mb-2">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <span className="text-[13px] font-bold text-slate-800">{step2Error}</span>
                <button type="button" onClick={() => setStep2Error("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">PRODUCT DETAILS</h3>
              <p className="text-[13px] text-slate-500 font-medium">Specify fabric storytelling, materials, and care instructions.</p>
            </div>

            <div className="flex flex-col gap-1 mt-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-700">PRODUCT DESCRIPTION <span className="text-red-500">*</span></label>
                <button
                  type="button"
                  disabled={generatingDesc}
                  onClick={() => handleGenerateAI("description")}
                  className="text-[11px] font-bold text-[#D9A71E] hover:text-[#020617] disabled:opacity-50 transition-colors flex items-center gap-1 select-none cursor-pointer"
                >
                  {generatingDesc ? "Generating..." : "✨ Generate with AI"}
                </button>
              </div>
              {justPolishedDesc && description ? (
                <div className="p-3 bg-amber-50/70 border border-amber-200/70 rounded-xl">
                  <TextEffect key={description} per="word" preset="fade" className="text-[13px] text-slate-800 font-medium leading-relaxed">
                    {description}
                  </TextEffect>
                </div>
              ) : null}
              <textarea
                placeholder="Provide a detailed description of fabrics, stitching style, design aesthetics..."
                value={description}
                onChange={(e) => { setDescription(e.target.value); setStep2Error(""); }}
                rows={3}
                className={`w-full px-4 py-3 border ${step2Error ? "border-red-400 ring-1 ring-red-400" : "border-slate-200"} rounded-xl text-[13px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#F5C22B] shadow-sm resize-none`}
              />
            </div>



            <div className="flex flex-col gap-2">
              <CustomSelect
                label="MATERIAL TYPE"
                value={materialType}
                onChange={(val) => {
                  setMaterialType(val);
                  if (val !== "Other") setCustomMaterialType("");
                  setStep2Error("");
                }}
                options={MATERIAL_OPTIONS}
                placeholder="Select material..."
                required
              />

              {materialType === "Other" && (
                <div className="flex flex-col gap-1 mt-1 animate-in fade-in slide-in-from-top-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-700">
                    SPECIFY OTHER MATERIAL <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Organza, Mulmul, Jacquard"
                    value={customMaterialType}
                    onChange={(e) => setCustomMaterialType(autoCorrectCapitalization(e.target.value))}
                    onBlur={(e) => setCustomMaterialType(autoCorrectCapitalization(e.target.value))}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-[13px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#F5C22B] shadow-sm"
                  />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <CustomSelect
                label="CARE INSTRUCTIONS"
                value={care}
                onChange={(val) => {
                  setCare(val);
                  if (val !== "Other") setCustomCare("");
                  setStep2Error("");
                }}
                options={CARE_OPTIONS}
                placeholder="Select care instructions..."
                required
              />

              {care === "Other" && (
                <div className="flex flex-col gap-1 mt-1 animate-in fade-in slide-in-from-top-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-700">
                    SPECIFY OTHER CARE INSTRUCTIONS <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Gentle Hand Wash Separately in Cold Water"
                    value={customCare}
                    onChange={(e) => setCustomCare(autoCorrectCapitalization(e.target.value))}
                    onBlur={(e) => setCustomCare(autoCorrectCapitalization(e.target.value))}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-[13px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#F5C22B] shadow-sm"
                  />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-700">CRAFT</label>
              <input
                type="text"
                placeholder="e.g. Handloom Kasavu, Chikankari, Shibori"
                value={craft}
                onChange={(e) => setCraft(autoCorrectCapitalization(e.target.value))}
                onBlur={(e) => setCraft(autoCorrectCapitalization(e.target.value))}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-[13px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#F5C22B] shadow-sm"
              />
            </div>

            <hr className="border-slate-100 -my-3" />

            {isSareeCategory ? (
              <div className="flex flex-col gap-2 bg-[#f8fafc] p-4 rounded-2xl border border-[#f1f5f9]">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-700">PRODUCT SIZE</label>
                <div className="text-xs font-semibold text-slate-800 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#F5C22B]" />
                  Sarees are Free Size. Size "FREE" has been automatically set for this product.
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-700">SELECT SIZES <span className="text-red-500">*</span></label>
                <div className="flex flex-wrap gap-2">
                  {SIZE_OPTIONS.map((sz) => {
                    const isSelected = selectedSizes.includes(sz);
                    return (
                      <button
                        type="button"
                        key={sz}
                        onClick={() => toggleSize(sz)}
                        className={`h-12 w-12 sm:h-14 sm:w-14 rounded-2xl border font-black text-xs transition-colors flex items-center justify-center ${isSelected ? "bg-[#252323] text-white border-[#252323]" : "bg-white text-slate-800 border-slate-200 hover:border-[#F5C22B]"
                          }`}
                      >
                        {sz}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedSizes.length > 0 && (
              <div className="flex flex-col gap-1 animate-in fade-in zoom-in-95 mt-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#D9A71E]">STOCK PER SIZE</label>
                <div className="border border-[#f1f5f9] rounded-2xl overflow-hidden">
                  <div className="bg-[#f8fafc] px-4 py-3 flex justify-between border-b border-[#f1f5f9]">
                    <span className="text-[10px] font-black tracking-widest text-slate-500">SIZE</span>
                    <span className="text-[10px] font-black tracking-widest text-slate-500">STOCK</span>
                  </div>
                  {selectedSizes.map((sz) => (
                    <div key={sz} className="bg-white px-4 py-3 flex justify-between items-center border-b border-[#f1f5f9] last:border-0">
                      <span className="text-sm font-black text-slate-800">{sz}</span>
                      <input
                        type="number"
                        min="0"
                        value={stockBySize[sz] || ""}
                        onChange={(e) => setStockBySize({ ...stockBySize, [sz]: parseInt(e.target.value) || 0 })}
                        className="w-20 px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-right focus:outline-none focus:ring-1 focus:ring-[#F5C22B]"
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <hr className="border-slate-100 my-1" />

            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-600">1. COMPARED TO A STANDARD SIZE, HOW DOES THIS PRODUCT FIT?</label>
              <div className="flex bg-[#f8fafc] p-1.5 rounded-2xl border border-[#f1f5f9] gap-1">
                <button
                  type="button"
                  onClick={() => setFitRecommendation("runs_small")}
                  className={`flex-1 py-3 flex flex-col sm:flex-row items-center justify-center gap-1.5 rounded-xl transition-all ${fitRecommendation === "runs_small" ? "bg-white shadow-sm border border-[#f1f5f9] text-slate-800" : "text-slate-400 hover:text-slate-600"}`}
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-black tracking-widest uppercase text-center leading-tight">RUNS<br />SMALL</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFitRecommendation("true_to_size")}
                  className={`flex-1 py-3 flex flex-col sm:flex-row items-center justify-center gap-1.5 rounded-xl transition-all ${fitRecommendation === "true_to_size" ? "bg-white shadow-sm border border-[#f1f5f9] text-[#D9A71E]" : "text-slate-400 hover:text-slate-600"}`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-black tracking-widest uppercase text-center leading-tight text-slate-800">TRUE TO<br />SIZE</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFitRecommendation("runs_large")}
                  className={`flex-1 py-3 flex flex-col sm:flex-row items-center justify-center gap-1.5 rounded-xl transition-all ${fitRecommendation === "runs_large" ? "bg-white shadow-sm border border-[#f1f5f9] text-slate-800" : "text-slate-400 hover:text-slate-600"}`}
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-black tracking-widest uppercase text-center leading-tight">RUNS<br />LARGE</span>
                </button>
              </div>
              <span className="text-[9px] font-medium text-slate-500">Based on your experience helping customers choose sizes for this product.</span>
            </div>

            <div className="flex flex-col gap-2 mt-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-600">2. OVERALL FIT OF THE GARMENT</label>
              <div className="flex bg-[#f8fafc] p-1.5 rounded-2xl border border-[#f1f5f9] gap-1">
                {[
                  { value: "slim_fit", label: "SLIM FIT" },
                  { value: "regular_fit", label: "REGULAR FIT" },
                  { value: "relaxed_fit", label: "RELAXED FIT" },
                  { value: "oversized", label: "OVERSIZED" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSilhouette(opt.value as any)}
                    className={`flex-1 py-3 text-[9px] font-black tracking-widest rounded-xl transition-all ${silhouette === opt.value ? "bg-white shadow-sm border border-[#f1f5f9] text-slate-800" : "text-slate-500 hover:text-slate-600"}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <span className="text-[9px] font-medium text-slate-500">Select the design cut style / outline category.</span>
            </div>
          </div>
        )}

        {/* STEP 3: Product Details */}
        {step === 3 && (
          <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4">

            <div className="flex flex-col gap-1">
              <h3 className="text-[13px] font-black uppercase tracking-widest text-slate-800">SPECIFICATIONS</h3>
              <p className="text-[11px] text-slate-500 font-medium mb-2">Fill out these characteristics to provide pure transparency and details to customers.</p>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-5">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-700">COLOUR <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={specs.color}
                  onChange={(e) => setSpecs({ ...specs, color: autoCorrectCapitalization(e.target.value) })}
                  onBlur={(e) => setSpecs({ ...specs, color: autoCorrectCapitalization(e.target.value) })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-[13px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#F5C22B] shadow-sm"
                  placeholder="e.g. White"
                />
              </div>

              <div className="flex flex-col gap-1">
                <InlineDropdown
                  label="FABRIC CONTENT"
                  options={FABRIC_CONTENT_OPTIONS}
                  placeholder="Select fabric content..."
                  value={specDropdowns.fabricContent}
                  onChange={(val) => {
                    setSpecDropdowns(prev => ({ ...prev, fabricContent: val }));
                    if (val !== "Other") {
                      setSpecs(prev => ({ ...prev, fabricContent: val }));
                    } else {
                      setSpecs(prev => ({ ...prev, fabricContent: "" }));
                    }
                  }}
                />
                {specDropdowns.fabricContent === "Other" && (
                  <input
                    type="text"
                    placeholder="Enter custom fabric content..."
                    value={specs.fabricContent}
                    onChange={(e) => setSpecs(prev => ({ ...prev, fabricContent: autoCorrectCapitalization(e.target.value) }))}
                    onBlur={(e) => setSpecs(prev => ({ ...prev, fabricContent: autoCorrectCapitalization(e.target.value) }))}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-[13px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#F5C22B] shadow-sm mt-1"
                  />
                )}
              </div>

              <div className="flex flex-col gap-1">
                <InlineDropdown
                  label="FABRIC DETAIL"
                  options={FABRIC_DETAIL_OPTIONS}
                  placeholder="Select fabric detail..."
                  value={specDropdowns.fabricDetail}
                  onChange={(val) => {
                    setSpecDropdowns(prev => ({ ...prev, fabricDetail: val }));
                    if (val !== "Other") {
                      setSpecs(prev => ({ ...prev, fabricDetail: val }));
                    } else {
                      setSpecs(prev => ({ ...prev, fabricDetail: "" }));
                    }
                  }}
                />
                {specDropdowns.fabricDetail === "Other" && (
                  <input
                    type="text"
                    placeholder="Enter custom fabric detail..."
                    value={specs.fabricDetail}
                    onChange={(e) => setSpecs(prev => ({ ...prev, fabricDetail: autoCorrectCapitalization(e.target.value) }))}
                    onBlur={(e) => setSpecs(prev => ({ ...prev, fabricDetail: autoCorrectCapitalization(e.target.value) }))}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-[13px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#F5C22B] shadow-sm mt-1"
                  />
                )}
              </div>

              <div className="flex flex-col gap-1">
                <InlineDropdown
                  label="NECK TYPE"
                  options={NECK_TYPE_OPTIONS}
                  placeholder="Select neck type..."
                  value={specDropdowns.neckType}
                  onChange={(val) => {
                    setSpecDropdowns(prev => ({ ...prev, neckType: val }));
                    if (val !== "Other") {
                      setSpecs(prev => ({ ...prev, neckType: val }));
                    } else {
                      setSpecs(prev => ({ ...prev, neckType: "" }));
                    }
                  }}
                />
                {specDropdowns.neckType === "Other" && (
                  <input
                    type="text"
                    placeholder="Enter custom neck type..."
                    value={specs.neckType}
                    onChange={(e) => setSpecs(prev => ({ ...prev, neckType: autoCorrectCapitalization(e.target.value) }))}
                    onBlur={(e) => setSpecs(prev => ({ ...prev, neckType: autoCorrectCapitalization(e.target.value) }))}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-[13px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#F5C22B] shadow-sm mt-1"
                  />
                )}
              </div>

              <div className="flex flex-col gap-1">
                <InlineDropdown
                  label="CLOSURE"
                  options={CLOSURE_OPTIONS}
                  placeholder="Select closure..."
                  value={specDropdowns.closure}
                  onChange={(val) => {
                    setSpecDropdowns(prev => ({ ...prev, closure: val }));
                    if (val !== "Other") {
                      setSpecs(prev => ({ ...prev, closure: val }));
                    } else {
                      setSpecs(prev => ({ ...prev, closure: "" }));
                    }
                  }}
                />
                {specDropdowns.closure === "Other" && (
                  <input
                    type="text"
                    placeholder="Enter custom closure..."
                    value={specs.closure}
                    onChange={(e) => setSpecs(prev => ({ ...prev, closure: autoCorrectCapitalization(e.target.value) }))}
                    onBlur={(e) => setSpecs(prev => ({ ...prev, closure: autoCorrectCapitalization(e.target.value) }))}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-[13px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#F5C22B] shadow-sm mt-1"
                  />
                )}
              </div>

              <div className="flex flex-col gap-1">
                <InlineDropdown
                  label="SLEEVE LENGTH"
                  options={SLEEVE_LENGTH_OPTIONS}
                  placeholder="Select sleeve length..."
                  value={specDropdowns.sleeve}
                  onChange={(val) => {
                    setSpecDropdowns(prev => ({ ...prev, sleeve: val }));
                    if (val !== "Other") {
                      setSpecs(prev => ({ ...prev, sleeve: val }));
                    } else {
                      setSpecs(prev => ({ ...prev, sleeve: "" }));
                    }
                  }}
                />
                {specDropdowns.sleeve === "Other" && (
                  <input
                    type="text"
                    placeholder="Enter custom sleeve length..."
                    value={specs.sleeve}
                    onChange={(e) => setSpecs(prev => ({ ...prev, sleeve: autoCorrectCapitalization(e.target.value) }))}
                    onBlur={(e) => setSpecs(prev => ({ ...prev, sleeve: autoCorrectCapitalization(e.target.value) }))}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-[13px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#F5C22B] shadow-sm mt-1"
                  />
                )}
              </div>

              <div className="flex flex-col gap-1">
                <InlineDropdown
                  label="SLEEVE STYLING"
                  options={SLEEVE_STYLING_OPTIONS}
                  placeholder="Select sleeve styling..."
                  value={specDropdowns.sleeveStyling}
                  onChange={(val) => {
                    setSpecDropdowns(prev => ({ ...prev, sleeveStyling: val }));
                    if (val !== "Other") {
                      setSpecs(prev => ({ ...prev, sleeveStyling: val }));
                    } else {
                      setSpecs(prev => ({ ...prev, sleeveStyling: "" }));
                    }
                  }}
                />
                {specDropdowns.sleeveStyling === "Other" && (
                  <input
                    type="text"
                    placeholder="Enter custom sleeve styling..."
                    value={specs.sleeveStyling}
                    onChange={(e) => setSpecs(prev => ({ ...prev, sleeveStyling: autoCorrectCapitalization(e.target.value) }))}
                    onBlur={(e) => setSpecs(prev => ({ ...prev, sleeveStyling: autoCorrectCapitalization(e.target.value) }))}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-[13px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#F5C22B] shadow-sm mt-1"
                  />
                )}
              </div>

              <div className="flex flex-col gap-1">
                <InlineDropdown
                  label="SHAPE"
                  options={SHAPE_OPTIONS}
                  placeholder="Select shape..."
                  value={specDropdowns.shape}
                  onChange={(val) => {
                    setSpecDropdowns(prev => ({ ...prev, shape: val }));
                    if (val !== "Other") {
                      setSpecs(prev => ({ ...prev, shape: val }));
                    } else {
                      setSpecs(prev => ({ ...prev, shape: "" }));
                    }
                  }}
                />
                {specDropdowns.shape === "Other" && (
                  <input
                    type="text"
                    placeholder="Enter custom shape..."
                    value={specs.shape}
                    onChange={(e) => setSpecs(prev => ({ ...prev, shape: autoCorrectCapitalization(e.target.value) }))}
                    onBlur={(e) => setSpecs(prev => ({ ...prev, shape: autoCorrectCapitalization(e.target.value) }))}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-[13px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#F5C22B] shadow-sm mt-1"
                  />
                )}
              </div>

              <div className="flex flex-col gap-1">
                <InlineDropdown
                  label="HEMLINE"
                  options={HEMLINE_OPTIONS}
                  placeholder="Select hemline..."
                  value={specDropdowns.hemline}
                  onChange={(val) => {
                    setSpecDropdowns(prev => ({ ...prev, hemline: val }));
                    if (val !== "Other") {
                      setSpecs(prev => ({ ...prev, hemline: val }));
                    } else {
                      setSpecs(prev => ({ ...prev, hemline: "" }));
                    }
                  }}
                />
                {specDropdowns.hemline === "Other" && (
                  <input
                    type="text"
                    placeholder="Enter custom hemline..."
                    value={specs.hemline}
                    onChange={(e) => setSpecs(prev => ({ ...prev, hemline: autoCorrectCapitalization(e.target.value) }))}
                    onBlur={(e) => setSpecs(prev => ({ ...prev, hemline: autoCorrectCapitalization(e.target.value) }))}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-[13px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#F5C22B] shadow-sm mt-1"
                  />
                )}
              </div>

              <div className="flex flex-col gap-1">
                <InlineDropdown
                  label="GARMENT LENGTH"
                  options={GARMENT_LENGTH_OPTIONS}
                  placeholder="Select garment length..."
                  value={specDropdowns.length}
                  onChange={(val) => {
                    setSpecDropdowns(prev => ({ ...prev, length: val }));
                    if (val !== "Other") {
                      setSpecs(prev => ({ ...prev, length: val }));
                    } else {
                      setSpecs(prev => ({ ...prev, length: "" }));
                    }
                  }}
                />
                {specDropdowns.length === "Other" && (
                  <input
                    type="text"
                    placeholder="Enter custom garment length..."
                    value={specs.length}
                    onChange={(e) => setSpecs(prev => ({ ...prev, length: autoCorrectCapitalization(e.target.value) }))}
                    onBlur={(e) => setSpecs(prev => ({ ...prev, length: autoCorrectCapitalization(e.target.value) }))}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-[13px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#F5C22B] shadow-sm mt-1"
                  />
                )}
              </div>

              <div className="flex flex-col gap-1">
                <InlineDropdown
                  label="PATTERN"
                  options={PATTERN_OPTIONS}
                  placeholder="Select pattern..."
                  value={specDropdowns.pattern}
                  onChange={(val) => {
                    setSpecDropdowns(prev => ({ ...prev, pattern: val }));
                    if (val !== "Other") {
                      setSpecs(prev => ({ ...prev, pattern: val }));
                    } else {
                      setSpecs(prev => ({ ...prev, pattern: "" }));
                    }
                  }}
                />
                {specDropdowns.pattern === "Other" && (
                  <input
                    type="text"
                    placeholder="Enter custom pattern..."
                    value={specs.pattern}
                    onChange={(e) => setSpecs(prev => ({ ...prev, pattern: autoCorrectCapitalization(e.target.value) }))}
                    onBlur={(e) => setSpecs(prev => ({ ...prev, pattern: autoCorrectCapitalization(e.target.value) }))}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-[13px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#F5C22B] shadow-sm mt-1"
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Inline Error Display */}
        {submitError && (
          <div className="mt-6 flex items-center gap-3 p-4 border-l-[3px] border-red-500 bg-[#FCF8F8] rounded-xl relative shadow-sm">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <span className="text-[13px] font-bold text-slate-800">
              Failed to save product: {submitError}
            </span>
            <button
              type="button"
              onClick={() => setSubmitError("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Footer Navigation */}
        <div className="mt-8 flex justify-between items-center pt-6 border-t border-slate-100">
          <div className="flex flex-col">
            {(submitting || uploadingImages) && uploadStatusText ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#F5C22B]/10 border border-[#F5C22B]/30 text-amber-900 animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D9A71E]" />
                <span className="text-[11px] font-bold tracking-wide">
                  {uploadStatusText}
                </span>
              </div>
            ) : (
              step === 2 && selectedSizes.length > 0 && (
                <span className="text-[10px] font-black tracking-widest uppercase text-slate-400">
                  {selectedSizes.length} SIZES ACTIVE
                </span>
              )
            )}
          </div>
          <div className="flex gap-3">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="px-6 py-3 border border-slate-200 text-slate-500 rounded-2xl text-[12px] font-bold uppercase tracking-wider hover:bg-slate-50 hover:text-slate-800 transition-all active:scale-95 duration-150 select-none disabled:opacity-50"
                disabled={submitting || uploadingImages}
              >
                Back
              </button>
            )}
            <button
              type="submit"
              disabled={submitting || uploadingImages}
              className="px-8 py-3 bg-[#F5C22B] hover:bg-[#E0B024] text-slate-900 font-extrabold rounded-2xl text-[12px] font-bold uppercase tracking-wider shadow-md transition-all active:scale-95 duration-150 flex items-center gap-2 disabled:opacity-50 select-none cursor-pointer"
            >
              <span className="flex items-center gap-2 relative z-10">
                {submitting || uploadingImages ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-900" />
                    <span>{uploadStatusText || "Saving..."}</span>
                  </>
                ) : (
                  <>
                    {step === totalSteps ? "Publish" : "Continue"}
                    {step < totalSteps && <ArrowRight className="w-4 h-4" />}
                  </>
                )}
              </span>
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
// Trigger Vercel Build

