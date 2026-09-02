"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Button, Modal, cn, HivePublishingOverlay } from "@hive/ui";
import { toast } from "@hive/utils";
import { 
  Upload, X, ArrowLeft, ArrowRight, Check, AlertCircle, ChevronDown, 
  ChevronUp, ChevronLeft, ChevronRight, Loader2, Sparkles, Image as ImageIcon, 
  Save, CheckCircle2, Search, Plus, Minus, Trash2, HelpCircle, Store, Coins, 
  ShieldCheck, Tag, Layers, Sliders, Scissors, FileText, Info
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Cropper from "react-easy-crop";

// Constant arrays
const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL", "Free"];
const MATERIAL_OPTIONS = [
  "Cotton", "Silk", "Linen", "Cotton Linen", "Georgette", "Chiffon",
  "Velvet", "Rayon", "Satin", "Blend", "Other"
];
const CARE_OPTIONS = ["Dry Clean Only", "Dry Wash", "Machine Wash Cold", "Hand Wash", "Do Not Bleach", "Other"];

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
  "A-Line", "Straight", "Anarkalis", "Flared", "Fit and Flare", "Asymmetric",
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

const DEFAULT_TIER_SLABS = [
  { min_price: 0, max_price: 499, rate: 8 },
  { min_price: 500, max_price: 999, rate: 8 },
  { min_price: 1000, max_price: 1499, rate: 8 },
  { min_price: 1500, max_price: 2499, rate: 8 },
  { min_price: 2500, max_price: 4999, rate: 8 },
  { min_price: 5000, max_price: null, rate: 5 },
];

function autoCorrectCapitalization(str: string): string {
  if (!str) return str;
  return str.replace(/\b([a-z])([a-z]*)\b/gi, (match, p1, p2) => {
    return p1.toUpperCase() + p2.toLowerCase();
  });
}

function calculatePricingBreakdown(basePriceRupees: number, config?: any, rawTierKey?: string) {
  if (!basePriceRupees || isNaN(basePriceRupees) || basePriceRupees <= 0) {
    return null;
  }

  // Map legacy tier names to keys
  let tierKey = (rawTierKey || "bronze").toLowerCase();
  if (tierKey === "tier1") tierKey = "bronze";
  if (tierKey === "tier2") tierKey = "silver";
  if (tierKey === "tier3") tierKey = "gold";

  const tiers = config?.tiers && config.tiers.length > 0 ? config.tiers : [
    {
      key: "bronze",
      name: "Bronze",
      commissionSlabs: [
        { minPrice: 0, maxPrice: 499, commissionPercent: 2 },
        { minPrice: 500, maxPrice: 999, commissionPercent: 3 },
        { minPrice: 1000, maxPrice: 1499, commissionPercent: 4 },
        { minPrice: 1500, maxPrice: null, commissionPercent: 5 },
      ],
      commissionGstPercent: 18,
      handlingChargePaise: 2900,
      platformFeePaise: 2000,
      platformGstPercent: 18,
    },
    {
      key: "silver",
      name: "Silver",
      commissionSlabs: [
        { minPrice: 0, maxPrice: 499, commissionPercent: 2.5 },
        { minPrice: 500, maxPrice: 999, commissionPercent: 3.5 },
        { minPrice: 1000, maxPrice: null, commissionPercent: 4.5 },
      ],
      commissionGstPercent: 18,
      handlingChargePaise: 2500,
      platformFeePaise: 1500,
      platformGstPercent: 18,
    },
    {
      key: "gold",
      name: "Gold",
      commissionSlabs: [
        { minPrice: 0, maxPrice: 499, commissionPercent: 3 },
        { minPrice: 500, maxPrice: 999, commissionPercent: 4 },
        { minPrice: 1000, maxPrice: null, commissionPercent: 5 },
      ],
      commissionGstPercent: 18,
      handlingChargePaise: 2000,
      platformFeePaise: 1000,
      platformGstPercent: 18,
    },
  ];

  const tier = tiers.find((t: any) => t.key.toLowerCase() === tierKey) || tiers[0];
  
  // Find applicable slab based on rounded base price in rupees
  const roundedRupees = Math.round(basePriceRupees);
  const slabs = tier?.commissionSlabs || [];
  const matchingSlab = slabs.find((s: any) => {
    const minMatch = roundedRupees >= s.minPrice;
    const maxMatch = s.maxPrice === null || s.maxPrice === undefined || roundedRupees <= s.maxPrice;
    return minMatch && maxMatch;
  }) || slabs[slabs.length - 1] || { minPrice: 0, maxPrice: null, commissionPercent: 2 };

  const commissionPercent = matchingSlab.commissionPercent;
  const gstRatePercent = tier?.commissionGstPercent ?? config?.gstRatePercent ?? 18;

  // Handling charge + platform fee + GST from tier
  const handlingCharge = (tier?.handlingChargePaise ?? config?.handlingChargePaise ?? 2900) / 100;
  const platformFee = (tier?.platformFeePaise ?? config?.platformFeePaise ?? 2000) / 100;
  const platformGstPercent = tier?.platformGstPercent ?? config?.gstRatePercent ?? 18;
  const gstOnCharges = (handlingCharge + platformFee) * (platformGstPercent / 100);
  const totalPlatformFees = handlingCharge + platformFee + gstOnCharges;
  const storefrontPrice = Math.round((basePriceRupees + totalPlatformFees) * 100) / 100;

  // Commission is taken directly from seller base price
  const commissionAmount = (basePriceRupees * commissionPercent) / 100;
  // GST on the commission is deducted from the seller
  const gstOnCommission = (commissionAmount * gstRatePercent) / 100;
  // Net payout to boutique
  const netPayout = Math.max(0, basePriceRupees - commissionAmount - gstOnCommission);

  const slabLabel = matchingSlab.maxPrice === null || matchingSlab.maxPrice === undefined
    ? `₹${matchingSlab.minPrice.toLocaleString("en-IN")}+`
    : `₹${matchingSlab.minPrice.toLocaleString("en-IN")} – ₹${matchingSlab.maxPrice.toLocaleString("en-IN")}`;

  return {
    tierName: tier?.name ?? "Bronze",
    slabLabel,
    slabMinPrice: matchingSlab.minPrice,
    slabMaxPrice: matchingSlab.maxPrice,
    commissionPercent,
    commissionAmount,
    gstRatePercent,
    gstOnCommission,
    storefrontPrice,
    netPayout,
  };
}



const cropImage = (
  srcUrl: string,
  croppedAreaPixels: { x: number; y: number; width: number; height: number },
  originalFile: File
): Promise<File> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(originalFile);
        return;
      }

      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.drawImage(
        img,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        croppedAreaPixels.width,
        croppedAreaPixels.height
      );

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const croppedFile = new File([blob], originalFile.name, {
              type: originalFile.type || "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(croppedFile);
          } else {
            resolve(originalFile);
          }
        },
        originalFile.type || "image/jpeg",
        0.92
      );
    };
    img.onerror = () => {
      resolve(originalFile);
    };
    img.src = srcUrl;
  });
};

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
        <div ref={listRef} className="absolute left-0 right-0 top-[104%] bg-white border border-slate-200 rounded-xl shadow-xl z-[120] max-h-56 overflow-y-auto py-1 animate-in fade-in-50 zoom-in-95">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                onChange(opt);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-2.5 text-[13px] text-left hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer ${
                value === opt ? "bg-slate-50 text-slate-950 font-bold" : "text-slate-700 font-medium"
              }`}
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

// Zod Validation Schema
const productFormSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  price: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Listing price must be greater than ₹0",
  }),
  mrp: z.string().optional(),
  discountPrice: z.string().optional(),
  categoryId: z.string().min(1, "Please choose a category for this product"),
  description: z.string().min(1, "Product description is required"),
  story: z.string().optional(),
  materialType: z.string().min(1, "Please select the garment material"),
  customMaterialType: z.string().optional(),
  care: z.string().min(1, "Please select care instructions"),
  customCare: z.string().optional(),
  craft: z.string().optional(),
  color: z.string().min(1, "Please enter the color"),
  fabricContent: z.string().optional(),
  fabricDetail: z.string().optional(),
  neckType: z.string().optional(),
  closure: z.string().optional(),
  sleeve: z.string().optional(),
  sleeveStyling: z.string().optional(),
  shape: z.string().optional(),
  hemline: z.string().optional(),
  length: z.string().optional(),
  pattern: z.string().optional(),
  fabricFamily: z.string().optional(),
}).refine(
  (data) => {
    if (data.materialType === "Other") {
      return !!data.customMaterialType && data.customMaterialType.trim().length > 0;
    }
    return true;
  },
  {
    message: "Please specify the custom material",
    path: ["customMaterialType"],
  }
).refine(
  (data) => {
    if (data.care === "Other") {
      return !!data.customCare && data.customCare.trim().length > 0;
    }
    return true;
  },
  {
    message: "Please specify custom care instructions",
    path: ["customCare"],
  }
);

type ProductFormValues = z.infer<typeof productFormSchema>;

interface ProductFormProps {
  productToEdit?: any;
  categories: any[];
}

/**
 * Infer MIME type from file extension when Android WebView returns empty file.type.
 * Capacitor's gallery picker on some Android devices doesn't populate the MIME.
 */
function inferMimeType(file: File): string {
  if (file.type) return file.type;
  const ext = file.name?.split(".").pop()?.toLowerCase();
  const mimeMap: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    avif: "image/avif",
    heic: "image/heic",
    heif: "image/heif",
  };
  return mimeMap[ext || ""] || "image/jpeg";
}

export default function ProductForm({ productToEdit, categories }: ProductFormProps) {
  const router = useRouter();
  const createProduct = useMutation(api.products.createProduct);
  const updateProduct = useMutation(api.products.updateProduct);
  const platformConfig = useQuery(api.adminSettings.getPlatformConfig);
  const generateUploadUrl = useAction(api.media.api.generateUploadUrl);
  const commitUpload = useAction(api.media.api.commitUpload);
  const myBoutiqueSafe = useQuery(api.boutiques.getMyBoutiqueSafe);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 4-Step Wizard State
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(productToEdit ? 2 : 1);
  const [maxUnlockedStep, setMaxUnlockedStep] = useState<1 | 2 | 3 | 4>(productToEdit ? 4 : 1);

  // Pickers modal state
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
  const [isMaterialPickerOpen, setIsMaterialPickerOpen] = useState(false);
  const [isCarePickerOpen, setIsCarePickerOpen] = useState(false);

  // Photos & Cropping State
  const [localPreviews, setLocalPreviews] = useState<{
    url: string;
    file?: File;
    storageId?: string;
    cropSettings?: { zoom: number; x: number; y: number; aspect: "1:1" | "4:5" | "original"; croppedAreaPixels?: any };
  }[]>([]);
  const [selectedPreviewIndex, setSelectedPreviewIndex] = useState<number>(0);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [imageNaturalSize, setImageNaturalSize] = useState({ width: 1, height: 1 });
  const [croppingInProgress, setCroppingInProgress] = useState(false);

  // Sizes & Fit State
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [stockBySize, setStockBySize] = useState<Record<string, number>>({});
  const [fitRecommendation, setFitRecommendation] = useState<"runs_small" | "true_to_size" | "runs_large">("true_to_size");
  const [silhouette, setSilhouette] = useState<"slim_fit" | "regular_fit" | "relaxed_fit" | "oversized">("regular_fit");
  
  const [featured, setFeatured] = useState(false);
  const [active, setActive] = useState(true);
  const [isPublishingComplete, setIsPublishingComplete] = useState(false);

  // Progressive Disclosure: visible extra detail chips in Step 4 (excluding mandatory Material and Care)
  const [activeExtraFields, setActiveExtraFields] = useState<Set<string>>(new Set());

  // Uploading / Submitting status
  const [submitting, setSubmitting] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState("");

  // AI Description states
  const [generatingDesc, setGeneratingDesc] = useState(false);

  // Categories helper list
  const allCategoriesList = useMemo(() => {
    const list: { _id: string; name: string }[] = [];
    const nameSet = new Set<string>();

    (categories || []).forEach((c) => {
      let cleanName = c.name;
      if (cleanName.toLowerCase() === "ethnic wer") {
        cleanName = "Ethnic Wear";
      }
      list.push({ _id: c._id, name: cleanName });
      nameSet.add(cleanName.toLowerCase());
    });

    return list;
  }, [categories]);

  // Form hook definition
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    getValues,
    trigger,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      price: "",
      mrp: "",
      discountPrice: "",
      categoryId: "",
      description: "",
      story: "",
      materialType: "",
      customMaterialType: "",
      care: "",
      customCare: "",
      craft: "",
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
      fabricFamily: "",
    },
  });

  const categoryIdWatch = watch("categoryId");
  const priceWatch = watch("price");
  const mrpWatch = watch("mrp");
  const nameWatch = watch("name");
  const colorWatch = watch("color");
  const descriptionWatch = watch("description");
  const materialTypeWatch = watch("materialType");
  const customMaterialTypeWatch = watch("customMaterialType");
  const careWatch = watch("care");
  const customCareWatch = watch("customCare");
  const craftWatch = watch("craft");
  const fabricContentWatch = watch("fabricContent");
  const fabricDetailWatch = watch("fabricDetail");
  const neckTypeWatch = watch("neckType");
  const closureWatch = watch("closure");
  const sleeveWatch = watch("sleeve");
  const sleeveStylingWatch = watch("sleeveStyling");
  const shapeWatch = watch("shape");
  const hemlineWatch = watch("hemline");
  const lengthWatch = watch("length");
  const patternWatch = watch("pattern");
  const fabricFamilyWatch = watch("fabricFamily");

  const selectedCategoryObj = allCategoriesList.find((c) => c._id === categoryIdWatch);
  const isSareeCategory = selectedCategoryObj?.name?.toLowerCase().includes("saree") || false;

  // Auto-set FREE size for Sarees
  useEffect(() => {
    if (isSareeCategory) {
      if (!selectedSizes.includes("Free") && !selectedSizes.includes("FREE")) {
        setSelectedSizes(["Free"]);
        setStockBySize((prev) => ({ ...prev, Free: prev.Free || prev.FREE || 1 }));
      }
    }
  }, [isSareeCategory]);

  // Load product to edit
  useEffect(() => {
    if (productToEdit) {
      setValue("name", productToEdit.name || "");
      const rawBase = productToEdit.basePrice ?? productToEdit.price;
      setValue("price", rawBase ? Math.round(rawBase / 100).toString() : "");
      if (productToEdit.mrp || productToEdit.compareAtPrice) {
        setValue("mrp", Math.round((productToEdit.mrp || productToEdit.compareAtPrice) / 100).toString());
      }
      if (productToEdit.baseDiscountPrice || productToEdit.discountPrice) {
        const rawDisc = productToEdit.baseDiscountPrice ?? productToEdit.discountPrice;
        setValue("discountPrice", rawDisc ? Math.round(rawDisc / 100).toString() : "");
      }
      setValue("categoryId", productToEdit.categoryId || "");

      setValue("description", productToEdit.description || "");
      setValue("story", productToEdit.story || "");
      
      const mat = productToEdit.materialType || productToEdit.material || "";
      if (MATERIAL_OPTIONS.includes(mat)) {
        setValue("materialType", mat);
      } else if (mat) {
        setValue("materialType", "Other");
        setValue("customMaterialType", mat);
      }

      const cr = productToEdit.care || "";
      if (CARE_OPTIONS.includes(cr)) {
        setValue("care", cr);
      } else if (cr) {
        setValue("care", "Other");
        setValue("customCare", cr);
      }

      const d = productToEdit.details || {};
      setValue("craft", d.craft || productToEdit.craft || "");
      setValue("color", d.color || "");
      setValue("fabricContent", d.fabricContent || "");
      setValue("fabricDetail", d.fabricDetail || "");
      setValue("neckType", d.neckType || "");
      setValue("closure", d.closure || "");
      setValue("sleeve", d.sleeve || "");
      setValue("sleeveStyling", d.sleeveStyling || "");
      setValue("shape", d.shape || "");
      setValue("hemline", d.hemline || "");
      setValue("length", d.length || "");
      setValue("pattern", d.pattern || "");
      setValue("fabricFamily", d.fabricFamily || "");

      const activeChips = new Set<string>();
      if (d.craft || productToEdit.craft) activeChips.add("craft");
      if (d.fabricContent) activeChips.add("fabricContent");
      if (d.fabricDetail) activeChips.add("fabricDetail");
      if (d.neckType) activeChips.add("neckType");
      if (d.closure) activeChips.add("closure");
      if (d.sleeve) activeChips.add("sleeve");
      if (d.sleeveStyling) activeChips.add("sleeveStyling");
      if (d.shape) activeChips.add("shape");
      if (d.hemline) activeChips.add("hemline");
      if (d.length) activeChips.add("length");
      if (d.pattern) activeChips.add("pattern");
      if (d.fabricFamily) activeChips.add("fabricFamily");
      setActiveExtraFields(activeChips);

      setSelectedSizes(productToEdit.sizes || []);
      setStockBySize(productToEdit.stockBySize || {});
      setFitRecommendation(productToEdit.fitRecommendation || "true_to_size");
      setSilhouette(productToEdit.silhouette || "regular_fit");
      setFeatured(productToEdit.featured || false);
      setActive(productToEdit.active !== false);

      if (productToEdit.images && Array.isArray(productToEdit.images)) {
        const loaded = productToEdit.images.map((img: any) => {
          if (typeof img === "string") {
            return { url: img, storageId: img };
          }
          const url = img.variants?.card || img.objectKey || "";
          return { url, storageId: img.assetId || img.objectKey };
        });
        setLocalPreviews(loaded);
      }
      setMaxUnlockedStep(4);
    }
  }, [productToEdit]);

  // Image Upload Handlers
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    
    if (localPreviews.length + files.length > 5) {
      toast.error("Limit Reached", "You can upload up to 5 photos per listing.");
    }

    const availableSlots = 5 - localPreviews.length;
    const filesToAdd = files.slice(0, availableSlots);

    const newPreviews = filesToAdd.map((file) => ({
      url: URL.createObjectURL(file),
      file,
      cropSettings: { zoom: 1, x: 0, y: 0, aspect: "1:1" as const },
    }));

    setLocalPreviews((prev) => [...prev, ...newPreviews]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const updateActiveCrop = (updates: Partial<{ zoom: number; x: number; y: number; aspect: "1:1" | "4:5" | "original"; croppedAreaPixels?: any }>) => {
    setLocalPreviews((prev) => {
      const next = [...prev];
      if (next[selectedPreviewIndex]) {
        const currentSettings = next[selectedPreviewIndex].cropSettings || { zoom: 1, x: 0, y: 0, aspect: "1:1" as const };
        next[selectedPreviewIndex] = {
          ...next[selectedPreviewIndex],
          cropSettings: {
            ...currentSettings,
            ...updates,
          },
        };
      }
      return next;
    });
  };

  const removeImage = (idxToRemove: number) => {
    setLocalPreviews((prev) => prev.filter((_, i) => i !== idxToRemove));
    if (selectedPreviewIndex >= idxToRemove && selectedPreviewIndex > 0) {
      setSelectedPreviewIndex(selectedPreviewIndex - 1);
    }
  };

  const setCoverImage = (index: number) => {
    if (index === 0) return;
    setLocalPreviews((prev) => {
      const copy = [...prev];
      const item = copy[index];
      if (!item) return prev;
      copy.splice(index, 1);
      copy.unshift(item);
      return copy;
    });
    setSelectedPreviewIndex(0);
    toast.success("Cover Photo Set", "This photo will appear first on the customer storefront.");
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedItemIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === dropIndex) return;

    setLocalPreviews((prev) => {
      const next = [...prev];
      const item = next[draggedItemIndex];
      if (!item) return prev;
      next.splice(draggedItemIndex, 1);
      next.splice(dropIndex, 0, item);
      return next;
    });

    if (selectedPreviewIndex === draggedItemIndex) {
      setSelectedPreviewIndex(dropIndex);
    }
    setDraggedItemIndex(null);
  };

  const handleTileClick = (fileIndex: number) => {
    setSelectedPreviewIndex(fileIndex);
  };

  const handleApplyCrop = async () => {
    setCroppingInProgress(true);
    try {
      const croppedPreviews = await Promise.all(
        localPreviews.map(async (item) => {
          if (!item.file || !item.cropSettings || !item.cropSettings.croppedAreaPixels) {
            return item;
          }
          const croppedFile = await cropImage(item.url, item.cropSettings.croppedAreaPixels, item.file);
          const croppedUrl = URL.createObjectURL(croppedFile);
          return {
            ...item,
            file: croppedFile,
            url: croppedUrl,
          };
        })
      );
      setLocalPreviews(croppedPreviews);
      return true;
    } catch (err) {
      console.error(err);
      return true;
    } finally {
      setCroppingInProgress(false);
    }
  };

  // Size toggle & Stock change
  const toggleSize = (size: string) => {
    setSelectedSizes((prev) => {
      if (prev.includes(size)) {
        const next = prev.filter((s) => s !== size);
        const newStock = { ...stockBySize };
        delete newStock[size];
        setStockBySize(newStock);
        return next;
      } else {
        const next = [...prev, size];
        setStockBySize((s) => ({ ...s, [size]: s[size] || 1 }));
        return next;
      }
    });
  };

  const handleStockChange = (size: string, qty: number) => {
    setStockBySize((prev) => ({
      ...prev,
      [size]: Math.max(0, qty),
    }));
  };

  const incrementStock = (size: string) => {
    setStockBySize((prev) => ({
      ...prev,
      [size]: (prev[size] || 0) + 1,
    }));
  };

  const decrementStock = (size: string) => {
    setStockBySize((prev) => ({
      ...prev,
      [size]: Math.max(0, (prev[size] || 0) - 1),
    }));
  };

  // AI Stream Reader implementation
  const handleGenerateAI = async () => {
    const currentName = getValues("name");
    const currentCategory = selectedCategoryObj?.name || "garment";

    if (!currentName) {
      toast.error("Product Name Required", "Please enter a product name first in Step 2 to guide the AI writer.");
      return;
    }

    setGeneratingDesc(true);
    
    try {
      const currentDescription = getValues("description");
      const roughInput = currentDescription && currentDescription.trim() 
        ? `${currentName} - ${currentDescription.trim()}`
        : `${currentName} in category ${currentCategory}`;

      setValue("description", "", { shouldDirty: true, shouldValidate: true });

      const response = await fetch("/api/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roughText: roughInput,
          type: "description",
          style: "standard",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to call generation endpoint");
      }

      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let streamAccumulator = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunkText = decoder.decode(value);
          streamAccumulator += chunkText;
          setValue("description", streamAccumulator, { shouldDirty: true, shouldValidate: true });
        }
        toast.success("Description Generated", "Product description written and formatted.");
      } else {
        const text = await response.text();
        setValue("description", text, { shouldDirty: true, shouldValidate: true });
        toast.success("Description Generated", "Product description written and formatted.");
      }
    } catch (e: any) {
      console.error(e);
      toast.error("AI Generation Failed", "Couldn't generate copy right now. Please try again.");
    } finally {
      setGeneratingDesc(false);
    }
  };

  // Step transitions
  const handleStep1Next = async () => {
    if (localPreviews.length < 3) {
      toast.error("More Photos Needed", "Please upload at least 3 photos (up to 5) so buyers can inspect your product clearly.");
      return;
    }
    await handleApplyCrop();
    setCurrentStep(2);
    setMaxUnlockedStep((prev) => Math.max(prev, 2) as any);
  };

  const handleStep2Next = async () => {
    const valid = await trigger(["categoryId", "name", "color", "price"]);
    if (!valid) {
      toast.error("Missing Details", "Please fill in the category, product name, color, and price to continue.");
      return;
    }
    setCurrentStep(3);
    setMaxUnlockedStep((prev) => Math.max(prev, 3) as any);
  };

  const handleStep3Next = () => {
    if (selectedSizes.length === 0) {
      toast.error("Sizes Required", "Please select at least one size you have in stock.");
      return;
    }

    const unstockedSizes = selectedSizes.filter((sz) => !stockBySize[sz] || stockBySize[sz] <= 0);
    if (unstockedSizes.length > 0) {
      toast.error("Stock Quantity Required", `Please enter stock quantity (> 0) for all selected sizes (${unstockedSizes.join(", ")}).`);
      return;
    }

    setCurrentStep(4);
    setMaxUnlockedStep((prev) => Math.max(prev, 4) as any);
  };

  const onFormError = (errs: any) => {
    console.error("Form validation errors:", errs);
    if (errs.description) {
      toast.error("Description Required", "Please enter a product description in Step 4.");
    } else if (errs.materialType || errs.customMaterialType) {
      toast.error("Material Required", "Please select the garment material in Step 4.");
    } else if (errs.care || errs.customCare) {
      toast.error("Care Instructions Required", "Please select care instructions in Step 4.");
    } else {
      toast.error("Action Required", "Please fill in all mandatory fields before submitting.");
    }
  };

  const onFormSubmit = async (data: ProductFormValues) => {
    if (localPreviews.length < 3) {
      setCurrentStep(1);
      toast.error("Photos Required", "Please upload at least 3 photos for your listing.");
      return;
    }

    if (selectedSizes.length === 0) {
      setCurrentStep(3);
      toast.error("Sizes Required", "Please select at least one size.");
      return;
    }

    const unstockedSizes = selectedSizes.filter((sz) => !stockBySize[sz] || stockBySize[sz] <= 0);
    if (unstockedSizes.length > 0) {
      setCurrentStep(3);
      toast.error("Stock Required", `Please enter stock quantity (> 0) for all selected sizes (${unstockedSizes.join(", ")}).`);
      return;
    }

    setSubmitting(true);
    setUploadStatusText("Uploading photos...");

    try {
      let completedUploads = 0;
      const totalNewFiles = localPreviews.filter((p) => p.file).length;

      const uploadPromises = localPreviews.map(async (item) => {
        if (item.file) {
          const resolvedMime = inferMimeType(item.file);
          console.log("[ProductForm] Uploading file:", {
            name: item.file.name,
            rawType: item.file.type,
            resolvedMime,
            size: item.file.size,
          });

          const { presignedUrl, sessionId } = await generateUploadUrl({
            mimeType: resolvedMime,
            fileSize: item.file.size,
            ownerType: "boutique",
            ownerId: "products",
            context: "product_image",
          });

          console.log("[ProductForm] Got presigned URL, uploading to R2...");
          const uploadRes = await fetch(presignedUrl, {
            method: "PUT",
            headers: { "Content-Type": resolvedMime },
            body: item.file,
          });

          if (!uploadRes.ok) {
            console.error("[ProductForm] R2 upload failed:", uploadRes.status, uploadRes.statusText);
            throw new Error(`Image upload failed (${uploadRes.status}). Please check your connection and try again.`);
          }
          console.log("[ProductForm] R2 upload success, committing...");

          const finalizedAsset = await commitUpload({ sessionId });
          completedUploads++;
          if (totalNewFiles > 0) {
            setUploadStatusText(`Uploading photos (${completedUploads}/${totalNewFiles})...`);
          }
          return finalizedAsset;
        } else if (item.storageId) {
          return item.storageId;
        }
        return null;
      });

      const finalImages = (await Promise.all(uploadPromises)).filter(Boolean);

      setUploadStatusText(productToEdit ? "Updating listing..." : "Sending product to Hive...");

      const finalMaterial = data.materialType === "Other" 
        ? autoCorrectCapitalization(data.customMaterialType || "") 
        : (data.materialType || undefined);

      const finalCare = data.care === "Other" 
        ? autoCorrectCapitalization(data.customCare || "") 
        : (data.care || undefined);
      
      const primaryCatId = data.categoryId;
      const foundCategory = allCategoriesList.find((c: any) => c._id === primaryCatId || c.slug === primaryCatId || c.name?.toLowerCase() === primaryCatId?.toLowerCase());
      const resolvedCatId = foundCategory ? foundCategory._id : (allCategoriesList[0]?._id || primaryCatId);

      const finalDescription = data.description.trim();

      const payload = {
        name: data.name,
        description: finalDescription,
        categoryId: resolvedCatId as any,
        price: Math.round(parseFloat(data.price) * 100),
        mrp: data.mrp ? Math.round(parseFloat(data.mrp) * 100) : undefined,
        compareAtPrice: data.mrp ? Math.round(parseFloat(data.mrp) * 100) : undefined,
        discountPrice: data.discountPrice ? Math.round(parseFloat(data.discountPrice) * 100) : undefined,
        images: finalImages,
        sizes: selectedSizes,
        stockBySize,
        featured,
        active,
        story: data.story || "",
        materialType: finalMaterial,
        material: finalMaterial,
        care: finalCare,
        details: {
          ...(data.craft ? { craft: autoCorrectCapitalization(data.craft) } : {}),
          color: data.color || "",
          fabricContent: data.fabricContent || "",
          fabricDetail: data.fabricDetail || "",
          neckType: data.neckType || "",
          closure: data.closure || "",
          sleeve: data.sleeve || "",
          sleeveStyling: data.sleeveStyling || "",
          shape: data.shape || "",
          hemline: data.hemline || "",
          length: data.length || "",
          pattern: data.pattern || "",
          fabricFamily: data.fabricFamily || "",
        },
        fitRecommendation,
        silhouette,
        approvalStatus: (productToEdit?.approvalStatus === "approved" ? "approved" : "pending") as any,
      };

      if (productToEdit?._id) {
        await updateProduct({ id: productToEdit._id as any, ...payload });
        setIsPublishingComplete(true);
      } else {
        await createProduct(payload);
        setIsPublishingComplete(true);
      }
    } catch (e: any) {
      console.error("[ProductForm] Save failed:", e);
      console.error("[ProductForm] Error details:", JSON.stringify({
        message: e?.message,
        data: e?.data,
        code: e?.code,
      }));
      setSubmitting(false);
      setIsPublishingComplete(false);
      const detail = e?.data?.message || e?.message || "Unknown error";
      toast.error("Couldn't Save Product", detail.length > 120 ? detail.substring(0, 117) + "..." : detail);
    } finally {
      setUploadStatusText("");
    }
  };

  const toggleExtraField = (fieldName: string) => {
    setActiveExtraFields((prev) => {
      const next = new Set(prev);
      if (next.has(fieldName)) {
        next.delete(fieldName);
      } else {
        next.add(fieldName);
      }
      return next;
    });
  };

  // Real-time Commission & Payout Breakdown
  const basePriceNum = parseFloat(priceWatch || "0");
  const boutiquePricingTier = (myBoutiqueSafe as any)?.boutique?.pricingTier || "bronze";
  const pricingBreakdown = useMemo(() => {
    return calculatePricingBreakdown(basePriceNum, platformConfig, boutiquePricingTier);
  }, [basePriceNum, platformConfig, boutiquePricingTier]);

  // ───────────────────────────────────────────────────────────────────────────
  // STEP 1: 📸 ADD PHOTOS (Instagram Screen)
  // ───────────────────────────────────────────────────────────────────────────
  if (currentStep === 1) {
    const canGoNext = localPreviews.length >= 3;
    const activePreview = localPreviews[selectedPreviewIndex];
    const cropSettings = activePreview?.cropSettings || { zoom: 1, x: 0, y: 0, aspect: "1:1" as const };

    const getViewportHeight = () => {
      if (cropSettings.aspect === "4:5") return 500;
      if (cropSettings.aspect === "original" && imageNaturalSize.width > 0) {
        const aspect = imageNaturalSize.width / imageNaturalSize.height;
        return Math.round(400 / aspect);
      }
      return 400; // default 1:1
    };

    return (
      <div className="fixed inset-0 bg-white z-[100] flex flex-col font-sans overflow-hidden animate-in fade-in duration-200">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <button
            type="button"
            onClick={() => router.push("/boutique/products")}
            className="text-slate-400 hover:text-slate-900 transition-colors p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <span className="text-xs font-bold uppercase tracking-widest text-slate-900">New Product Post</span>
          <div className="w-8 h-8" />
        </div>

        {/* Viewport Container */}
        <div className="flex-1 overflow-y-auto bg-[#FBFBFA] flex flex-col">
          
          {/* Viewport Frame */}
          <div className="w-full bg-[#F3F3F1] flex justify-center items-center py-4 relative shrink-0">
            <div
              className="w-full relative bg-slate-950 overflow-hidden flex items-center justify-center rounded-xl shadow-inner select-none"
              style={{
                height: `${getViewportHeight()}px`,
                maxWidth: "400px"
              }}
            >
              {activePreview ? (
                <div className="absolute inset-0 touch-none">
                  <Cropper
                    image={activePreview.url}
                    crop={{ x: cropSettings.x || 0, y: cropSettings.y || 0 }}
                    zoom={cropSettings.zoom || 1}
                    aspect={cropSettings.aspect === "4:5" ? 4 / 5 : cropSettings.aspect === "original" ? (imageNaturalSize.width / imageNaturalSize.height || 1) : 1}
                    onCropChange={(crop) => updateActiveCrop({ x: crop.x, y: crop.y })}
                    onZoomChange={(zoom) => updateActiveCrop({ zoom })}
                    onCropComplete={(croppedArea, croppedAreaPixels) => updateActiveCrop({ croppedAreaPixels })}
                    onMediaLoaded={(mediaSize) => setImageNaturalSize({ width: mediaSize.naturalWidth, height: mediaSize.naturalHeight })}
                  />
                </div>
              ) : (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-full bg-[#F9FAFB] border border-slate-200/80 rounded-xl flex flex-col items-center justify-center text-center p-6 cursor-pointer hover:bg-slate-100/60 transition-colors"
                >
                  <ImageIcon className="w-8 h-8 stroke-[1.5] text-slate-500 mb-2.5" />
                  <span className="text-xs font-semibold text-slate-800 tracking-tight mb-0.5">
                    Select Product Photos
                  </span>
                  <span className="text-[11px] font-normal text-slate-400">
                    Upload 3 to 5 high-resolution images
                  </span>
                </div>
              )}

              {/* Aspect Ratio Button Overlay */}
              {activePreview && (
                <button
                  type="button"
                  onClick={() => {
                    const nextAspect = cropSettings.aspect === "1:1" ? "4:5" : cropSettings.aspect === "4:5" ? "original" : "1:1";
                    updateActiveCrop({ aspect: nextAspect, x: 0, y: 0 });
                  }}
                  className="absolute bottom-3 left-3 h-7 w-7 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-all cursor-pointer shadow-md select-none active:scale-95 border border-white/10"
                  title="Toggle Aspect Ratio"
                >
                  <span className="text-[9px] font-bold tracking-tighter uppercase">
                    {cropSettings.aspect === "1:1" ? "1:1" : cropSettings.aspect === "4:5" ? "4:5" : "Orig"}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Zoom Slider */}
          {activePreview && (
            <div className="px-6 py-2 bg-white border-y border-slate-100 flex items-center gap-3 shrink-0 select-none">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Zoom</span>
              <input
                type="range"
                min="1"
                max="3"
                step="0.01"
                value={cropSettings.zoom}
                onChange={(e) => updateActiveCrop({ zoom: parseFloat(e.target.value) })}
                className="flex-1 accent-slate-900 cursor-ew-resize h-1 bg-slate-100 rounded-lg appearance-none"
              />
              <span className="text-[10px] font-semibold text-slate-600 font-mono w-8 text-right">
                {Math.round(cropSettings.zoom * 100)}%
              </span>
            </div>
          )}

          {/* Recents Bar */}
          <div className="px-5 py-2.5 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between shrink-0 select-none">
            <div className="flex items-center gap-1 cursor-default">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Recents</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </div>

            <div className="flex items-center gap-3">
              {localPreviews.length > 0 && (
                <span className="text-[10px] font-medium text-slate-500">
                  {localPreviews.length} of 5 selected
                </span>
              )}
              <div className="bg-white border border-slate-200/80 px-2.5 py-0.5 rounded-full text-[10px] font-semibold text-slate-600 flex items-center gap-1.5 shadow-2xs">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-900" />
                Multi-Select
              </div>
            </div>
          </div>

          {/* Gallery Photo Grid */}
          <div className="p-4 bg-white flex-1 overflow-y-auto">
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5">
              
              {/* Upload Button Tile */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={localPreviews.length >= 5}
                className={cn(
                  "aspect-square rounded-xl border flex flex-col items-center justify-center gap-1 transition-all select-none",
                  localPreviews.length >= 5
                    ? "bg-slate-50 border-slate-200 cursor-not-allowed opacity-40"
                    : "bg-slate-50/60 hover:bg-slate-100/80 border-slate-200/80 active:scale-95 cursor-pointer"
                )}
              >
                <Plus className="w-4 h-4 text-slate-600 stroke-[2]" />
                <span className="text-[10px] font-medium text-slate-600">Add</span>
              </button>

              {/* Preview Selection Tiles */}
              {localPreviews.map((prev, idx) => {
                const isSelectedForPreview = idx === selectedPreviewIndex;
                return (
                  <div
                    key={idx}
                    onClick={() => handleTileClick(idx)}
                    draggable
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, idx)}
                    className={cn(
                      "aspect-square rounded-xl overflow-hidden border relative cursor-pointer group transition-all",
                      isSelectedForPreview 
                        ? "border-slate-900 ring-2 ring-slate-900/10 shadow-xs" 
                        : "border-slate-200 hover:border-slate-350",
                      draggedItemIndex === idx && "opacity-50 scale-95"
                    )}
                  >
                    <img src={prev.url} alt={`Thumb ${idx}`} className="w-full h-full object-cover pointer-events-none" />
                    
                    {/* Badge number */}
                    <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-slate-950/80 text-white flex items-center justify-center text-[9px] font-bold">
                      {idx + 1}
                    </div>

                    {/* Delete badge */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(idx);
                      }}
                      className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-red-600 transition-colors cursor-pointer"
                      title="Remove image"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    
                    {idx === 0 && (
                      <div className="absolute bottom-1 left-1 bg-slate-950/80 text-white text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider pointer-events-none">
                        Cover
                      </div>
                    )}

                    {idx > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCoverImage(idx);
                        }}
                        className="absolute bottom-1 left-1 bg-white/95 text-slate-900 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider hover:bg-slate-200 shadow-xs cursor-pointer z-10"
                      >
                        Set Cover
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Action Footer */}
        <div className="px-6 py-4 bg-white border-t border-slate-100 flex items-center justify-between shrink-0 z-20">
          <span className="text-xs font-medium text-slate-500 font-sans">
            {localPreviews.length} of 3 required photos selected
          </span>

          <button
            type="button"
            onClick={handleStep1Next}
            disabled={!canGoNext || croppingInProgress}
            className={cn(
              "text-xs font-bold uppercase tracking-wider px-6 py-2.5 rounded-xl transition-all flex items-center gap-2 select-none",
              canGoNext && !croppingInProgress
                ? "bg-slate-950 hover:bg-slate-900 text-white cursor-pointer active:scale-[0.98] shadow-xs" 
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            )}
          >
            <span>Continue</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          multiple
          accept="image/*"
          onChange={handleImageFileChange}
          className="hidden"
        />
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // STEPS 2, 3, 4: BESPOKE LUXURY WIZARD
  // ───────────────────────────────────────────────────────────────────────────
  const stepItems = [
    { step: 1, label: "Photos" },
    { step: 2, label: "Basic Info" },
    { step: 3, label: "Sizes & Stock" },
    { step: 4, label: "Details & Care" },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8 font-sans animate-in fade-in duration-200">
      
      {/* Top Header & Minimalist Linear Progress Stepper */}
      <div className="flex flex-col gap-6 border-b border-slate-100 pb-6 mb-8">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (currentStep === 2) setCurrentStep(1);
              else if (currentStep === 3) setCurrentStep(2);
              else if (currentStep === 4) setCurrentStep(3);
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>

          <span className="text-[11px] font-medium text-slate-400 tracking-wide uppercase">
            Step {currentStep} of 4 &bull; {stepItems[currentStep - 1]?.label}
          </span>

          <Button
            variant="ghost"
            onClick={() => router.push("/boutique/products")}
            className="text-xs font-semibold text-slate-500 hover:text-slate-900 p-0 h-auto"
          >
            Cancel
          </Button>
        </div>

        {/* Minimalist Segmented Line Stepper */}
        <div className="grid grid-cols-4 gap-2">
          {stepItems.map((s) => {
            const isCurrent = currentStep === s.step;
            const isCompleted = currentStep > s.step;
            const isAccessible = s.step <= maxUnlockedStep;

            return (
              <button
                key={s.step}
                type="button"
                disabled={!isAccessible}
                onClick={() => isAccessible && setCurrentStep(s.step as any)}
                className={cn(
                  "group flex flex-col gap-1.5 text-left select-none transition-all py-1",
                  isAccessible ? "cursor-pointer" : "cursor-not-allowed opacity-40"
                )}
              >
                <div className={cn(
                  "h-1 w-full rounded-full transition-all duration-300",
                  isCurrent
                    ? "bg-slate-950"
                    : isCompleted
                    ? "bg-slate-400"
                    : "bg-slate-100"
                )} />
                <span className={cn(
                  "text-[11px] font-medium transition-colors truncate",
                  isCurrent
                    ? "text-slate-950 font-bold"
                    : isCompleted
                    ? "text-slate-600"
                    : "text-slate-400"
                )}>
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit(onFormSubmit, onFormError)} className="flex flex-col gap-6">

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* STEP 2: 👗 BASIC DETAILS & FINANCIALS                              */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {currentStep === 2 && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-200">
            
            {/* Photos Summary Strip */}
            <div className="bg-slate-50/60 border border-slate-100 rounded-xl px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2 overflow-hidden">
                  {localPreviews.slice(0, 3).map((prev, idx) => (
                    <img key={idx} src={prev.url} alt="Thumb" className="w-8 h-8 rounded-lg object-cover border border-white shadow-2xs" />
                  ))}
                </div>
                <span className="text-xs font-medium text-slate-700">{localPreviews.length} Photos Selected</span>
              </div>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Change
              </button>
            </div>

            {/* Form Fields */}
            <div className="flex flex-col gap-5">
              
              {/* Category Picker */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Category *</label>
                <input type="hidden" {...register("categoryId")} />
                <button
                  type="button"
                  onClick={() => setIsCategoryPickerOpen(true)}
                  className={cn(
                    "w-full px-4 py-3 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-[13px] text-slate-800 flex items-center justify-between focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 text-left transition-all cursor-pointer",
                    errors.categoryId && "border-red-500"
                  )}
                >
                  <span className={selectedCategoryObj ? "font-semibold text-slate-900" : "text-slate-400 font-normal"}>
                    {selectedCategoryObj ? selectedCategoryObj.name : "Select category (e.g. Sarees, Kurtis, Lehengas...)"}
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>
                {errors.categoryId && <span className="text-red-500 text-xs font-medium">{errors.categoryId.message}</span>}

                {/* Category Selection Modal */}
                {isCategoryPickerOpen && (
                  <div className="fixed inset-0 z-[1000] flex items-end sm:items-center sm:justify-center animate-in fade-in duration-200">
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setIsCategoryPickerOpen(false)} />
                    <div className="relative w-full max-h-[85vh] bg-white rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl flex flex-col gap-4 animate-in slide-in-from-bottom duration-300 sm:max-w-md sm:m-4 overflow-hidden z-10 border border-slate-100 pb-safe">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-900">Select Category</span>
                        <button 
                          type="button"
                          onClick={() => setIsCategoryPickerOpen(false)}
                          className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-all cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-1 py-1 scrollbar-none">
                        {allCategoriesList.map((c) => {
                          const isSelected = categoryIdWatch === c._id;
                          return (
                            <button
                              key={c._id}
                              type="button"
                              onClick={() => {
                                setValue("categoryId", c._id, { shouldValidate: true });
                                setIsCategoryPickerOpen(false);
                              }}
                              className={cn(
                                "w-full px-4 py-2.5 rounded-xl text-left text-xs font-medium transition-all flex justify-between items-center cursor-pointer",
                                isSelected
                                  ? "bg-slate-950 text-white font-bold"
                                  : "text-slate-700 hover:bg-slate-50"
                              )}
                            >
                              <span>{c.name}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Product Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Product Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Floral Dream Tiered Midi Dress"
                  {...register("name")}
                  className="w-full px-4 py-3 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-[13px] font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all"
                />
                {errors.name && <span className="text-red-500 text-xs font-medium">{errors.name.message}</span>}
              </div>

              {/* Color & Price Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Color *</label>
                  <input
                    type="text"
                    placeholder="e.g. Crimson Red"
                    {...register("color")}
                    className="w-full px-4 py-3 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-[13px] font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all"
                  />
                  {errors.color && <span className="text-red-500 text-xs font-medium">{errors.color.message}</span>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Your Base Price (₹) *</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="1000"
                      {...register("price")}
                      className="w-full pl-8 pr-4 py-3 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-[13px] font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all"
                    />
                  </div>
                  {errors.price && <span className="text-red-500 text-xs font-medium">{errors.price.message}</span>}
                </div>
              </div>

              {/* MRP on Tag (Clean Optional) */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-slate-50/70 border border-slate-100 rounded-xl">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">Tag MRP</span>
                    <span className="text-[9px] text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded font-medium">Optional</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Original MRP printed on tag (used to calculate discount percentage).
                  </p>
                </div>
                <div className="w-full sm:w-36 shrink-0">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-medium">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="2499"
                      {...register("mrp")}
                      className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* BESPOKE FINANCIAL PANEL (Tier Slabs & Payout Breakdown) */}
              {pricingBreakdown && (
                <div className="border border-slate-200/90 rounded-2xl bg-white overflow-hidden shadow-xs">
                  {/* Top 2-Column Metrics */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                    
                    {/* Column 1: Storefront Customer Price */}
                    <div className="p-5 flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Storefront Customer Price
                        </span>
                        <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                          Customer Pays
                        </span>
                      </div>

                      <div className="flex items-baseline gap-1 my-1">
                        <span className="text-3xl font-bold tracking-tight text-slate-900 font-sans">
                          ₹{pricingBreakdown.storefrontPrice.toFixed(2)}
                        </span>
                      </div>

                      <span className="text-[11px] text-slate-400 font-normal mt-1">
                        Base ₹{basePriceNum.toFixed(0)} + Handling &amp; Platform Fee (all-inclusive)
                      </span>
                    </div>

                    {/* Column 2: Net Payout */}
                    <div className="p-5 flex flex-col justify-between bg-emerald-50/20">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900">
                            Your Net Payout
                          </span>
                          <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                            {pricingBreakdown.tierName} &bull; {pricingBreakdown.slabLabel}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                          Your Earnings
                        </span>
                      </div>

                      <div className="flex items-baseline gap-1 my-1">
                        <span className="text-3xl font-bold tracking-tight text-emerald-700 font-sans">
                          ₹{pricingBreakdown.netPayout.toFixed(2)}
                        </span>
                      </div>

                      <span className="text-[11px] text-slate-500 font-normal mt-1">
                        Base ₹{basePriceNum.toFixed(0)} − {pricingBreakdown.commissionPercent}% commission (−₹{pricingBreakdown.commissionAmount.toFixed(2)}) − GST (−₹{pricingBreakdown.gstOnCommission.toFixed(2)})
                      </span>
                    </div>

                  </div>

                  {/* Bottom Single-Line Calculation Formula */}
                  <div className="px-5 py-2.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                    <span className="truncate">
                      Base ₹{basePriceNum.toFixed(0)} &bull; {pricingBreakdown.tierName} Slab ({pricingBreakdown.slabLabel}): {pricingBreakdown.commissionPercent}% (-₹{pricingBreakdown.commissionAmount.toFixed(2)}) &bull; GST ({pricingBreakdown.gstRatePercent}%): -₹{pricingBreakdown.gstOnCommission.toFixed(2)}
                    </span>
                    <span className="text-emerald-700 font-bold font-mono shrink-0 ml-2">Net: ₹{pricingBreakdown.netPayout.toFixed(2)}</span>
                  </div>
                </div>
              )}


            </div>

            {/* Bottom Navigation */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              >
                ← Back to Photos
              </button>

              <button
                type="button"
                onClick={handleStep2Next}
                className="px-6 py-2.5 bg-slate-950 hover:bg-slate-900 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-xs cursor-pointer active:scale-[0.98] flex items-center gap-2"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* STEP 3: 📏 SIZES & STOCK (MANDATORY QUANTITY IN STOCK)              */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {currentStep === 3 && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-200">
            
            <div className="flex flex-col gap-6">
              
              {/* Saree Auto-Free Size Notice */}
              {isSareeCategory ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                  <Info className="w-4 h-4 text-slate-600 shrink-0" />
                  <p className="text-xs font-medium text-slate-700">
                    Sarees are automatically Free Size. Size &quot;Free&quot; has been selected for you.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Available Sizes *</label>
                    <span className="text-[10px] text-slate-400 font-medium">Select all sizes you have</span>
                  </div>
                  <div className="grid grid-cols-4 sm:flex sm:flex-wrap gap-2.5">
                    {SIZE_OPTIONS.map((sz) => {
                      const isSelected = selectedSizes.includes(sz);
                      return (
                        <button
                          type="button"
                          key={sz}
                          onClick={() => toggleSize(sz)}
                          className={cn(
                            "min-h-[48px] min-w-[56px] px-3 py-2.5 rounded-xl border text-sm font-bold transition-all flex items-center justify-center cursor-pointer select-none shrink-0 active:scale-95",
                            isSelected 
                              ? "bg-slate-950 text-white border-slate-950 shadow-xs" 
                              : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                          )}
                        >
                          {sz}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Per-Size Stock Inputs — Mandatory */}
              {selectedSizes.length > 0 && (
                <div className="flex flex-col gap-2 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                      Quantity in Stock (Units) *
                    </label>
                    <span className="text-[10px] text-red-500 font-semibold">Mandatory for each size</span>
                  </div>
                  
                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white">
                    {selectedSizes.map((sz) => {
                      const qty = stockBySize[sz] || 0;
                      const hasZero = qty <= 0;
                      return (
                        <div key={sz} className={cn(
                          "px-4 py-3 flex justify-between items-center transition-colors",
                          hasZero && "bg-red-50/20"
                        )}>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">{sz}</span>
                            {hasZero && (
                              <span className="text-[10px] text-red-500 font-medium">(Please enter quantity)</span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => decrementStock(sz)}
                              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0"
                            >
                              <Minus className="w-4 h-4 stroke-[2.5]" />
                            </button>
                            
                            <input
                              type="number"
                              min="1"
                              value={stockBySize[sz] || ""}
                              onChange={(e) => handleStockChange(sz, parseInt(e.target.value) || 0)}
                              className={cn(
                                "w-16 h-9 px-2 py-1 border rounded-xl text-sm font-bold text-center focus:border-slate-900 focus:outline-none",
                                hasZero ? "border-red-300 bg-red-50/40 text-red-700" : "border-slate-200 text-slate-900"
                              )}
                              placeholder="1"
                            />

                            <button
                              type="button"
                              onClick={() => incrementStock(sz)}
                              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0"
                            >
                              <Plus className="w-4 h-4 stroke-[2.5]" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <hr className="border-slate-100" />

              {/* Fit Recommendation */}
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Fit Sizing</label>
                <div className="grid grid-cols-3 gap-2 w-full max-w-sm">
                  {[
                    { val: "runs_small", label: "Runs Small" },
                    { val: "true_to_size", label: "True to Size" },
                    { val: "runs_large", label: "Runs Large" },
                  ].map((rec) => (
                    <button
                      key={rec.val}
                      type="button"
                      onClick={() => setFitRecommendation(rec.val as any)}
                      className={cn(
                        "min-h-[44px] py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer text-center select-none active:scale-95",
                        fitRecommendation === rec.val 
                          ? "bg-slate-950 text-white border-slate-950 font-bold shadow-2xs" 
                          : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                      )}
                    >
                      {rec.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Silhouette */}
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Silhouette</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full max-w-md">
                  {[
                    { val: "slim_fit", label: "Slim" },
                    { val: "regular_fit", label: "Regular" },
                    { val: "relaxed_fit", label: "Relaxed" },
                    { val: "oversized", label: "Oversized" },
                  ].map((sil) => (
                    <button
                      key={sil.val}
                      type="button"
                      onClick={() => setSilhouette(sil.val as any)}
                      className={cn(
                        "min-h-[44px] py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer text-center select-none active:scale-95",
                        silhouette === sil.val 
                          ? "bg-slate-950 text-white border-slate-950 font-bold shadow-2xs" 
                          : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                      )}
                    >
                      {sil.label}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Bottom Navigation */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              >
                ← Back to Basic Details
              </button>

              <button
                type="button"
                onClick={handleStep3Next}
                className="px-6 py-2.5 bg-slate-950 hover:bg-slate-900 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-xs cursor-pointer active:scale-[0.98] flex items-center gap-2"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* STEP 4: ✨ DETAILS & CARE (MANDATORY: DESCRIPTION, MATERIAL, CARE) */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {currentStep === 4 && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-200">
            
            <div className="flex flex-col gap-5">
              
              {/* Product Description — MANDATORY */}
              <div className="flex flex-col gap-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Product Description *</label>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={generatingDesc}
                      onClick={handleGenerateAI}
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1.5 select-none cursor-pointer shrink-0"
                    >
                      {generatingDesc ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin text-slate-500" />
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3 text-[#D9A71E]" />
                          <span>Auto-generate</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <textarea
                  placeholder="Describe the silhouette, fabric feel, work details, or occasion styling tips..."
                  {...register("description")}
                  rows={3}
                  className={cn(
                    "w-full px-4 py-3 bg-white border rounded-xl text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 font-sans leading-relaxed resize-none transition-all",
                    errors.description ? "border-red-500" : "border-slate-200 hover:border-slate-300"
                  )}
                />
                {errors.description && <span className="text-red-500 text-xs font-medium">{errors.description.message}</span>}
              </div>

              {/* Material & Care Instructions — ALWAYS VISIBLE & MANDATORY */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                
                {/* Material — MANDATORY */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Material *</label>
                  <input type="hidden" {...register("materialType")} />
                  <button
                    type="button"
                    onClick={() => setIsMaterialPickerOpen(true)}
                    className={cn(
                      "w-full px-4 py-3 bg-white border rounded-xl text-[13px] text-slate-900 flex items-center justify-between focus:outline-none focus:border-slate-900 cursor-pointer text-left transition-all",
                      errors.materialType ? "border-red-500" : "border-slate-200 hover:border-slate-300"
                    )}
                  >
                    <span className={materialTypeWatch ? "text-slate-900 font-medium" : "text-slate-400"}>
                      {materialTypeWatch || "Select Material (e.g. Silk, Cotton)..."}
                    </span>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </button>
                  {errors.materialType && <span className="text-red-500 text-xs font-medium">{errors.materialType.message}</span>}

                  {materialTypeWatch === "Other" && (
                    <div className="flex flex-col gap-1 mt-1">
                      <input
                        type="text"
                        placeholder="Specify custom material (e.g. Raw Chanderi Silk)..."
                        {...register("customMaterialType")}
                        className={cn(
                          "w-full px-4 py-2 bg-white border rounded-xl text-[12px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900",
                          errors.customMaterialType ? "border-red-500" : "border-slate-200"
                        )}
                      />
                      {errors.customMaterialType && <span className="text-red-500 text-xs font-medium">{errors.customMaterialType.message}</span>}
                    </div>
                  )}

                  {/* Material Picker Modal */}
                  {isMaterialPickerOpen && (
                    <div className="fixed inset-0 z-[1000] flex items-end sm:items-center sm:justify-center animate-in fade-in duration-200">
                      <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setIsMaterialPickerOpen(false)} />
                      <div className="relative w-full max-h-[85vh] bg-white rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl flex flex-col gap-4 animate-in slide-in-from-bottom duration-300 sm:max-w-md sm:m-4 overflow-hidden z-10 border border-slate-100 pb-safe">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                          <span className="text-xs font-bold uppercase tracking-widest text-slate-900">Select Material</span>
                          <button type="button" onClick={() => setIsMaterialPickerOpen(false)} className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-1 py-1 scrollbar-none">
                          {MATERIAL_OPTIONS.map((mat) => (
                            <button
                              key={mat}
                              type="button"
                              onClick={() => {
                                setValue("materialType", mat, { shouldValidate: true });
                                setIsMaterialPickerOpen(false);
                              }}
                              className={cn(
                                "w-full px-4 py-2.5 rounded-xl text-left text-xs font-medium transition-all flex justify-between items-center cursor-pointer",
                                materialTypeWatch === mat ? "bg-slate-950 text-white font-bold" : "hover:bg-slate-50 text-slate-700"
                              )}
                            >
                              <span>{mat}</span>
                              {materialTypeWatch === mat && <Check className="w-3.5 h-3.5 text-white" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Care Instructions — MANDATORY */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Care Instructions *</label>
                  <input type="hidden" {...register("care")} />
                  <button
                    type="button"
                    onClick={() => setIsCarePickerOpen(true)}
                    className={cn(
                      "w-full px-4 py-3 bg-white border rounded-xl text-[13px] text-slate-900 flex items-center justify-between focus:outline-none focus:border-slate-900 cursor-pointer text-left transition-all",
                      errors.care ? "border-red-500" : "border-slate-200 hover:border-slate-300"
                    )}
                  >
                    <span className={careWatch ? "text-slate-900 font-medium" : "text-slate-400"}>
                      {careWatch || "Select Care (e.g. Dry Clean Only)..."}
                    </span>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </button>
                  {errors.care && <span className="text-red-500 text-xs font-medium">{errors.care.message}</span>}

                  {careWatch === "Other" && (
                    <div className="flex flex-col gap-1 mt-1">
                      <input
                        type="text"
                        placeholder="Specify custom care (e.g. Dry clean first wash only)..."
                        {...register("customCare")}
                        className={cn(
                          "w-full px-4 py-2 bg-white border rounded-xl text-[12px] text-slate-900 mt-1 placeholder:text-slate-400 focus:outline-none focus:border-slate-900",
                          errors.customCare ? "border-red-500" : "border-slate-200"
                        )}
                      />
                      {errors.customCare && <span className="text-red-500 text-xs font-medium">{errors.customCare.message}</span>}
                    </div>
                  )}

                  {/* Care Picker Modal */}
                  {isCarePickerOpen && (
                    <div className="fixed inset-0 z-[1000] flex items-end sm:items-center sm:justify-center animate-in fade-in duration-200">
                      <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setIsCarePickerOpen(false)} />
                      <div className="relative w-full max-h-[85vh] bg-white rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl flex flex-col gap-4 animate-in slide-in-from-bottom duration-300 sm:max-w-md sm:m-4 overflow-hidden z-10 border border-slate-100 pb-safe">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                          <span className="text-xs font-bold uppercase tracking-widest text-slate-900">Select Care Instructions</span>
                          <button type="button" onClick={() => setIsCarePickerOpen(false)} className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-1 py-1 scrollbar-none">
                          {CARE_OPTIONS.map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => {
                                setValue("care", c, { shouldValidate: true });
                                setIsCarePickerOpen(false);
                              }}
                              className={cn(
                                "w-full px-4 py-2.5 rounded-xl text-left text-xs font-medium transition-all flex justify-between items-center cursor-pointer",
                                careWatch === c ? "bg-slate-950 text-white font-bold" : "hover:bg-slate-50 text-slate-700"
                              )}
                            >
                              <span>{c}</span>
                              {careWatch === c && <Check className="w-3.5 h-3.5 text-white" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* Progressive Disclosure: Additional Optional Specifications */}
              <div className="space-y-2.5 pt-3 border-t border-slate-100">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Add Optional Specifications
                </label>

                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: "craft", label: "+ Fabric / Weave" },
                    { id: "neckType", label: "+ Neck Type" },
                    { id: "pattern", label: "+ Pattern" },
                    { id: "sleeve", label: "+ Sleeve Length" },
                    { id: "sleeveStyling", label: "+ Sleeve Styling" },
                    { id: "shape", label: "+ Shape" },
                    { id: "hemline", label: "+ Hemline" },
                    { id: "length", label: "+ Length" },
                    { id: "fabricFamily", label: "+ Fabric Family" },
                  ].map((chip) => {
                    const isOpen = activeExtraFields.has(chip.id);
                    return (
                      <button
                        key={chip.id}
                        type="button"
                        onClick={() => toggleExtraField(chip.id)}
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

              {/* Expanded Detail Inputs */}
              {activeExtraFields.size > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 animate-in fade-in duration-200">
                  
                  {/* Fabric / Weave */}
                  {activeExtraFields.has("craft") && (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Fabric / Weave</label>
                        <button type="button" onClick={() => toggleExtraField("craft")} className="text-[11px] text-slate-400 hover:text-red-600 font-semibold cursor-pointer">Remove</button>
                      </div>
                      <input
                        type="text"
                        placeholder="e.g. Chikankari, Shibori, Banarasi"
                        {...register("craft")}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900"
                      />
                    </div>
                  )}

                  {/* Neck Type */}
                  {activeExtraFields.has("neckType") && (
                    <InlineDropdown
                      label="Neck Type"
                      options={NECK_TYPE_OPTIONS}
                      placeholder="Select neck type..."
                      value={neckTypeWatch || ""}
                      onChange={(val) => setValue("neckType", val)}
                      onRemove={() => {
                        setValue("neckType", "");
                        toggleExtraField("neckType");
                      }}
                    />
                  )}

                  {/* Pattern */}
                  {activeExtraFields.has("pattern") && (
                    <InlineDropdown
                      label="Pattern"
                      options={PATTERN_OPTIONS}
                      placeholder="Select pattern..."
                      value={patternWatch || ""}
                      onChange={(val) => setValue("pattern", val)}
                      onRemove={() => {
                        setValue("pattern", "");
                        toggleExtraField("pattern");
                      }}
                    />
                  )}

                  {/* Sleeve Length */}
                  {activeExtraFields.has("sleeve") && (
                    <InlineDropdown
                      label="Sleeve Length"
                      options={SLEEVE_LENGTH_OPTIONS}
                      placeholder="Select sleeve length..."
                      value={sleeveWatch || ""}
                      onChange={(val) => setValue("sleeve", val)}
                      onRemove={() => {
                        setValue("sleeve", "");
                        toggleExtraField("sleeve");
                      }}
                    />
                  )}

                  {/* Sleeve Styling */}
                  {activeExtraFields.has("sleeveStyling") && (
                    <InlineDropdown
                      label="Sleeve Styling"
                      options={SLEEVE_STYLING_OPTIONS}
                      placeholder="Select sleeve style..."
                      value={sleeveStylingWatch || ""}
                      onChange={(val) => setValue("sleeveStyling", val)}
                      onRemove={() => {
                        setValue("sleeveStyling", "");
                        toggleExtraField("sleeveStyling");
                      }}
                    />
                  )}

                  {/* Shape */}
                  {activeExtraFields.has("shape") && (
                    <InlineDropdown
                      label="Shape / Silhouette"
                      options={SHAPE_OPTIONS}
                      placeholder="Select shape..."
                      value={shapeWatch || ""}
                      onChange={(val) => setValue("shape", val)}
                      onRemove={() => {
                        setValue("shape", "");
                        toggleExtraField("shape");
                      }}
                    />
                  )}

                  {/* Hemline */}
                  {activeExtraFields.has("hemline") && (
                    <InlineDropdown
                      label="Hemline"
                      options={HEMLINE_OPTIONS}
                      placeholder="Select hemline..."
                      value={hemlineWatch || ""}
                      onChange={(val) => setValue("hemline", val)}
                      onRemove={() => {
                        setValue("hemline", "");
                        toggleExtraField("hemline");
                      }}
                    />
                  )}

                  {/* Garment Length */}
                  {activeExtraFields.has("length") && (
                    <InlineDropdown
                      label="Garment Length"
                      options={GARMENT_LENGTH_OPTIONS}
                      placeholder="Select garment length..."
                      value={lengthWatch || ""}
                      onChange={(val) => setValue("length", val)}
                      onRemove={() => {
                        setValue("length", "");
                        toggleExtraField("length");
                      }}
                    />
                  )}

                  {/* Fabric Family */}
                  {activeExtraFields.has("fabricFamily") && (
                    <InlineDropdown
                      label="Fabric Family"
                      options={FABRIC_FAMILY_OPTIONS}
                      placeholder="Select fabric family..."
                      value={fabricFamilyWatch || ""}
                      onChange={(val) => setValue("fabricFamily", val)}
                      onRemove={() => {
                        setValue("fabricFamily", "");
                        toggleExtraField("fabricFamily");
                      }}
                    />
                  )}

                </div>
              )}

            </div>

            {/* Bottom Navigation */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              >
                ← Back to Sizes & Stock
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="px-7 py-3 bg-slate-950 hover:bg-slate-900 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-xs cursor-pointer active:scale-[0.98] flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>{uploadStatusText || "Saving Listing..."}</span>
                  </>
                ) : (
                  <>
                    <span>Send to Hive</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

          </div>
        )}

      </form>

      {/* Hive Flying Bee Publishing & Celebration Overlay */}
      <HivePublishingOverlay
        isOpen={submitting}
        isComplete={isPublishingComplete}
        productName={getValues("name")}
        onFinished={() => {
          setSubmitting(false);
          router.push("/boutique/products");
        }}
      />
    </div>
  );
}
