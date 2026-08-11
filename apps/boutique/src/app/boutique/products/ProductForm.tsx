"use client";

import React, { useState, useEffect, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Button, Modal, cn, HivePublishingOverlay } from "@hive/ui";
import { toast } from "@hive/utils";
import { 
  Upload, X, ArrowLeft, ArrowRight, Check, AlertCircle, ChevronDown, 
  ChevronUp, ChevronLeft, ChevronRight, Loader2, Sparkles, Image as ImageIcon, Save, CheckCircle2, Search, Plus
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Cropper from "react-easy-crop";

// Constant arrays
const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL", "FREE"];
const MATERIAL_OPTIONS = [
  "Cotton", "Silk", "Linen", "Georgette", "Chiffon",
  "Velvet", "Rayon", "Satin", "Blend", "Other"
];
const CARE_OPTIONS = ["Dry Clean Only", "Machine Wash Cold", "Hand Wash", "Do Not Bleach", "Other"];

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

const ALLOWED_CATEGORIES = [
  "Sarees",
  "Lehengas",
  "Kurtis",
  "Salwar Sets",
  "Anarkalis",
  "Gowns",
  "Indo-Western",
  "Blouses",
  "Dupattas",
  "Co-ord Sets",
  "Fusion Wear",
  "Tops"
];

const DEFAULT_CATEGORY_TAGS = [
  { id: "sarees", name: "Sarees" },
  { id: "lehengas", name: "Lehengas" },
  { id: "kurtis", name: "Kurtis" },
  { id: "salwar-sets", name: "Salwar Sets" },
  { id: "anarkalis", name: "Anarkalis" },
  { id: "gowns", name: "Gowns" },
  { id: "indo-western", name: "Indo-Western" },
  { id: "blouses", name: "Blouses" },
  { id: "dupattas", name: "Dupattas" },
  { id: "co-ord-sets", name: "Co-ord Sets" },
  { id: "fusion-wear", name: "Fusion Wear" },
  { id: "tops", name: "Tops" },
];

function autoCorrectCapitalization(str: string): string {
  if (!str) return str;
  return str.replace(/\b([a-z])([a-z]*)\b/gi, (match, p1, p2) => {
    return p1.toUpperCase() + p2.toLowerCase();
  });
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
    <div className={`flex flex-col gap-1.5 relative w-full font-sans ${isOpen ? "z-[120]" : "z-10"}`} ref={containerRef}>
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-700">{label}</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-[13px] text-left text-slate-750 bg-white flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-[#E9B929] focus:border-[#E9B929] shadow-xs cursor-pointer select-none"
      >
        <span className={value ? "text-slate-800 font-semibold" : "text-slate-400 font-medium"}>
          {value || placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div ref={listRef} className="absolute left-0 right-0 top-[102%] bg-white border border-slate-200 rounded-xl shadow-2xl z-[120] max-h-56 overflow-y-auto py-1">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                onChange(opt);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-2.5 text-[13px] text-left hover:bg-slate-50 transition-colors ${
                value === opt ? "bg-amber-50/50 text-[#9E7606] font-bold" : "text-slate-700"
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

// Zod Validation Schema
const productFormSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  price: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Base price must be greater than ₹0",
  }),
  mrp: z.string().optional(),
  discountPrice: z.string().optional(),
  categoryId: z.string().min(1, "Category tag is required"),
  description: z.string().min(1, "Product description is required"),
  story: z.string().optional(),
  materialType: z.string().min(1, "Material type is required"),
  customMaterialType: z.string().optional(),
  care: z.string().min(1, "Care instructions are required"),
  customCare: z.string().optional(),
  craft: z.string().optional(),
  
  // Collapsible specifications
  color: z.string().min(1, "Color is required"),
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
}).refine(data => {
  if (data.materialType === "Other" && (!data.customMaterialType || !data.customMaterialType.trim())) {
    return false;
  }
  return true;
}, {
  message: "Custom material name is required when choosing Other",
  path: ["customMaterialType"]
}).refine(data => {
  if (data.care === "Other" && (!data.customCare || !data.customCare.trim())) {
    return false;
  }
  return true;
}, {
  message: "Custom care instructions are required when choosing Other",
  path: ["customCare"]
});

type ProductFormValues = z.infer<typeof productFormSchema>;

interface ProductFormProps {
  productToEdit?: any;
  categories: any[];
}

export default function ProductForm({ productToEdit, categories }: ProductFormProps) {
  const router = useRouter();
  const createProduct = useMutation(api.products.createProduct);
  const updateProduct = useMutation(api.products.updateProduct);
  const platformSettings = useQuery(api.adminSettings.getPlatformSettings);
  const generateUploadUrl = useAction(api.media.api.generateUploadUrl);
  const commitUpload = useAction(api.media.api.commitUpload);
  const myBoutiqueSafe = useQuery(api.boutiques.getMyBoutiqueSafe);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Layout and Specs UI toggles
  const [showSpecs, setShowSpecs] = useState(false);
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
  const [isMaterialPickerOpen, setIsMaterialPickerOpen] = useState(false);
  const [isCarePickerOpen, setIsCarePickerOpen] = useState(false);

  // Standard react states for values not fits inside text validation
  const [localPreviews, setLocalPreviews] = useState<{
    url: string;
    file?: File;
    storageId?: string;
    cropSettings?: { zoom: number; x: number; y: number; aspect: "1:1" | "4:5" | "original"; croppedAreaPixels?: any };
  }[]>([]);
  const [selectedPreviewIndex, setSelectedPreviewIndex] = useState<number>(0);
  const [isZoomModalOpen, setIsZoomModalOpen] = useState<boolean>(false);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [stockBySize, setStockBySize] = useState<Record<string, number>>({});
  const [fitRecommendation, setFitRecommendation] = useState<"runs_small" | "true_to_size" | "runs_large">("true_to_size");
  const [silhouette, setSilhouette] = useState<"slim_fit" | "regular_fit" | "relaxed_fit" | "oversized">("regular_fit");
  
  const [sameDayEligible, setSameDayEligible] = useState(false);
  const [returnsAccepted, setReturnsAccepted] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [active, setActive] = useState(true);
  const [isPublishingComplete, setIsPublishingComplete] = useState(false);

  // Wizard state (Instagram creation flow)
  const [wizardStep, setWizardStep] = useState<"select" | "crop" | "form">("select");
  const [croppingInProgress, setCroppingInProgress] = useState(false);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(true);

  // Specifications Dropdowns State
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

  // Uploading / Submitting status
  const [submitting, setSubmitting] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState("");
  const [draftSavedText, setDraftSavedText] = useState("");

  // AI Description states
  const [selectedStyle, setSelectedStyle] = useState<string>("casual");
  const [generatingDesc, setGeneratingDesc] = useState(false);

  // Drawer visibility state (default expanded for instant editing)
  const [openDrawers, setOpenDrawers] = useState({
    primary: true,
    sizing: true,
    story: true,
    specs: false,
  });

  const toggleDrawer = (drawerName: keyof typeof openDrawers) => {
    setOpenDrawers((prev) => ({
      ...prev,
      [drawerName]: !prev[drawerName],
    }));
  };

  // Categories helper list
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

  // Form hook definition
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    getValues,
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
  const descriptionWatch = watch("description");
  const materialTypeWatch = watch("materialType");
  const careWatch = watch("care");

  // Auto-expand drawer if errors are found inside them
  useEffect(() => {
    if (errors.name || errors.categoryId || errors.price || errors.color) {
      setOpenDrawers((prev) => ({ ...prev, primary: true }));
    }
    if (errors.description || errors.materialType || errors.care) {
      setOpenDrawers((prev) => ({ ...prev, story: true }));
    }
    if (
      errors.color || errors.fabricContent || errors.fabricDetail || 
      errors.neckType || errors.closure || errors.sleeve || 
      errors.sleeveStyling || errors.shape || errors.hemline || 
      errors.length || errors.pattern || errors.fabricFamily
    ) {
      setOpenDrawers((prev) => ({ ...prev, specs: true }));
    }
  }, [errors]);

  // Populate data on edit mode
  useEffect(() => {
    if (productToEdit) {
      setValue("name", productToEdit.name || "");
      const bp = productToEdit.basePrice ?? productToEdit.price;
      setValue("price", bp ? (bp / 100).toString() : "");
      const realMrp = (productToEdit as any).mrp ?? (productToEdit as any).compareAtPrice;
      setValue("mrp", realMrp ? (realMrp / 100).toString() : "");
      const dp = productToEdit.baseDiscountPrice ?? productToEdit.discountPrice;
      setValue("discountPrice", dp ? (dp / 100).toString() : "");
      
      const rawCatIds = productToEdit.details?.categoryIds
        ? productToEdit.details.categoryIds.split(",")
        : [productToEdit.categoryId];
      setValue("categoryId", rawCatIds[0] || productToEdit.categoryId || "");

      setValue("description", productToEdit.description || "");
      setValue("story", productToEdit.story || "");

      const existingMat = productToEdit.materialType || productToEdit.material || "";
      if (MATERIAL_OPTIONS.includes(existingMat) && existingMat !== "Other") {
        setValue("materialType", existingMat);
        setValue("customMaterialType", "");
      } else if (existingMat) {
        setValue("materialType", "Other");
        setValue("customMaterialType", autoCorrectCapitalization(existingMat));
      }

      const existingCare = productToEdit.care || "";
      if (CARE_OPTIONS.includes(existingCare) && existingCare !== "Other") {
        setValue("care", existingCare);
        setValue("customCare", "");
      } else if (existingCare) {
        setValue("care", "Other");
        setValue("customCare", autoCorrectCapitalization(existingCare));
      }

      setValue("craft", productToEdit.details?.craft ? autoCorrectCapitalization(productToEdit.details.craft) : "");

      if (productToEdit.details) {
        const cColor = autoCorrectCapitalization(productToEdit.details.color || "");
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

        setValue("color", cColor);
        setValue("fabricContent", cFabricContent);
        setValue("fabricDetail", cFabricDetail);
        setValue("neckType", cNeckType);
        setValue("closure", cClosure);
        setValue("sleeve", cSleeve);
        setValue("sleeveStyling", cSleeveStyling);
        setValue("shape", cShape);
        setValue("hemline", cHemline);
        setValue("length", cLength);
        setValue("pattern", cPattern);
        setValue("fabricFamily", cFabricFamily);

        const initSpec = (val: string, options: string[]) => {
          if (!val) return "";
          const found = options.find(o => o.toLowerCase() === val.toLowerCase());
          if (found && found !== "Other") return found;
          return "Other";
        };

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
      setSameDayEligible(productToEdit.sameDayEligible || false);
      setReturnsAccepted(productToEdit.returnsAccepted !== false);
      setFeatured(productToEdit.featured || false);
      setActive(productToEdit.active !== false);

      const rawStorageIds = productToEdit.imageStorageIds || [];
      const previews = rawStorageIds.map((imgId: string, idx: number) => ({
        url: productToEdit.images?.[idx] || imgId,
        storageId: imgId
      }));
      setLocalPreviews(previews);
      setWizardStep("form");
    } else {
      // Check for local storage drafts
      const savedDraft = localStorage.getItem("hive_product_draft");
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          setValue("name", parsed.name || "");
          setValue("price", parsed.price || "");
          setValue("categoryId", parsed.categoryId || "");
          setValue("description", parsed.description || "");
          setValue("story", parsed.story || "");
          setValue("materialType", parsed.materialType || "");
          setValue("customMaterialType", parsed.customMaterialType || "");
          setValue("care", parsed.care || "");
          setValue("customCare", parsed.customCare || "");
          setValue("craft", parsed.craft || "");
          toast.success("Draft Restored", "Picked up right where you left off.");
        } catch (e) {}
      }
    }
  }, [productToEdit, setValue]);

  // Debounced client-side autosave (1.5 seconds)
  useEffect(() => {
    if (productToEdit) return; // Do not autosave when editing

    const delayDebounce = setTimeout(() => {
      const values = getValues();
      const draftPayload = {
        name: values.name,
        price: values.price,
        categoryId: values.categoryId,
        description: values.description,
        story: values.story,
        materialType: values.materialType,
        customMaterialType: values.customMaterialType,
        care: values.care,
        customCare: values.customCare,
        craft: values.craft,
      };

      if (draftPayload.name || draftPayload.price || draftPayload.description) {
        localStorage.setItem("hive_product_draft", JSON.stringify(draftPayload));
        setDraftSavedText("Draft saved locally");
        setTimeout(() => setDraftSavedText(""), 3000);
      }
    }, 1500);

    return () => clearTimeout(delayDebounce);
  }, [nameWatch, priceWatch, descriptionWatch, getValues, productToEdit]);

  // Auto-set FREE size for Saree category
  const isSareeCategory = React.useMemo(() => {
    if (!categoryIdWatch) return false;
    const found = allCategoriesList.find((c) => c._id === categoryIdWatch || c.name.toLowerCase() === categoryIdWatch.toLowerCase());
    if (!found) return false;
    const lower = found.name.toLowerCase();
    return lower.includes("saree") || lower.includes("sarree");
  }, [categoryIdWatch, allCategoriesList]);

  useEffect(() => {
    if (isSareeCategory) {
      setSelectedSizes(["FREE"]);
      setStockBySize((prev) => {
        if (prev["FREE"] !== undefined) return prev;
        return { ...prev, FREE: 5 };
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

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newPreviews = files.map((file) => ({
      url: URL.createObjectURL(file),
      file,
      cropSettings: { zoom: 1, x: 0, y: 0, aspect: "1:1" as const }
    }));
    setLocalPreviews((prev) => [...prev, ...newPreviews].slice(0, 5));
  };

  const removeImage = (idx: number) => {
    setLocalPreviews((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      setSelectedPreviewIndex((cur) => {
        if (cur >= next.length) {
          return Math.max(0, next.length - 1);
        }
        return cur;
      });
      return next;
    });
  };

  const setCoverImage = (idx: number) => {
    const arr = [...localPreviews];
    const item = arr.splice(idx, 1)[0];
    if (item) {
      arr.unshift(item);
    }
    setLocalPreviews(arr);
    setSelectedPreviewIndex(0);
  };

  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedItemIndex(index);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      // This is required for Firefox to allow dragging
      e.dataTransfer.setData("text/plain", index.toString());
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // necessary to allow dropping
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "move";
    }
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === dropIndex) {
      setDraggedItemIndex(null);
      return;
    }
    
    setLocalPreviews((prev) => {
      const arr = [...prev];
      const draggedItem = arr[draggedItemIndex];
      arr.splice(draggedItemIndex, 1);
      arr.splice(dropIndex, 0, draggedItem!);
      return arr;
    });

    if (selectedPreviewIndex === draggedItemIndex) {
      setSelectedPreviewIndex(dropIndex);
    } else if (
      selectedPreviewIndex > draggedItemIndex && selectedPreviewIndex <= dropIndex
    ) {
      setSelectedPreviewIndex(selectedPreviewIndex - 1);
    } else if (
      selectedPreviewIndex < draggedItemIndex && selectedPreviewIndex >= dropIndex
    ) {
      setSelectedPreviewIndex(selectedPreviewIndex + 1);
    }
    setDraggedItemIndex(null);
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

  const handleStockChange = (size: string, qty: number) => {
    setStockBySize((prev) => ({
      ...prev,
      [size]: Math.max(0, qty),
    }));
  };

  // AI Stream Reader implementation
  const handleGenerateAI = async () => {
    const currentName = getValues("name");
    const currentCategory = getValues("categoryId");

    if (!currentName) {
      toast.error("Product Name Required", "Please enter a product name first to guide the AI writer.");
      return;
    }

    setGeneratingDesc(true);
    
    try {
      const currentDescription = getValues("description");
      const roughInput = currentDescription && currentDescription.trim() 
        ? `${currentName} - ${currentDescription.trim()}`
        : `${currentName} in category ${currentCategory || "clothing"}`;

      setValue("description", "", { shouldDirty: true, shouldValidate: true });

      const response = await fetch("/api/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roughText: roughInput,
          type: "description",
          style: selectedStyle,
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
        toast.success("Copy Refined with AI", "Your product description has been polished.");
      } else {
        const text = await response.text();
        setValue("description", text, { shouldDirty: true, shouldValidate: true });
        toast.success("Copy Refined with AI", "Your product description has been polished.");
      }
    } catch (e: any) {
      console.error(e);
      toast.error("AI Generation Failed", "Couldn't generate copy right now. Please try again.");
    } finally {
      setGeneratingDesc(false);
    }
  };

  const onFormError = (errors: any) => {
    toast.error("Action Required", "Please review the highlighted fields before submitting.");
  };

  const onFormSubmit = async (data: ProductFormValues) => {
    if (localPreviews.length < 3) {
      toast.error("More Photos Needed", "Please upload at least 3 high-resolution photos so buyers can inspect your product clearly.");
      return;
    }

    if (selectedSizes.length === 0) {
      setOpenDrawers((prev) => ({ ...prev, sizing: true }));
      toast.error("Sizing Required", "Please select at least one active size for your product.");
      return;
    }

    const hasZeroStock = selectedSizes.every((sz) => !stockBySize[sz] || stockBySize[sz] <= 0);
    if (hasZeroStock) {
      setOpenDrawers((prev) => ({ ...prev, sizing: true }));
      toast.error("Stock Quantity Required", "At least one selected size must have a stock quantity greater than 0.");
      return;
    }

    setSubmitting(true);
    setUploadStatusText("Uploading images...");

    try {
      let completedUploads = 0;
      const totalNewFiles = localPreviews.filter((p) => p.file).length;

      // Async/parallel uploads
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

      setUploadStatusText(productToEdit ? "Updating product record..." : "Submitting product for approval...");

      const finalMaterial = data.materialType === "Other" ? autoCorrectCapitalization(data.customMaterialType || "") : data.materialType;
      const finalCare = data.care === "Other" ? autoCorrectCapitalization(data.customCare || "") : data.care;
      
      const primaryCatId = data.categoryId;
      const foundCategory = allCategoriesList.find((c: any) => c._id === primaryCatId || c.slug === primaryCatId || c.name?.toLowerCase() === primaryCatId?.toLowerCase());
      const resolvedCatId = foundCategory ? foundCategory._id : (allCategoriesList[0]?._id || primaryCatId);

      const payload = {
        name: data.name,
        description: data.description,
        categoryId: resolvedCatId as any,
        price: Math.round(parseFloat(data.price) * 100),
        mrp: data.mrp ? Math.round(parseFloat(data.mrp) * 100) : undefined,
        compareAtPrice: data.mrp ? Math.round(parseFloat(data.mrp) * 100) : undefined,
        discountPrice: data.discountPrice ? Math.round(parseFloat(data.discountPrice) * 100) : undefined,
        images: finalImages,
        sizes: selectedSizes,
        stockBySize,
        sameDayEligible,
        returnsAccepted,
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
        approvalStatus: (productToEdit?.approvalStatus === "approved" ? "approved" : "pending") as any, // Verification State
      };

      if (productToEdit?._id) {
        await updateProduct({ id: productToEdit._id as any, ...payload });
        setIsPublishingComplete(true);
      } else {
        await createProduct(payload);
        setIsPublishingComplete(true);
        localStorage.removeItem("hive_product_draft"); // clear draft
      }
    } catch (e: any) {
      console.error(e);
      setSubmitting(false);
      setIsPublishingComplete(false);
      toast.error("Couldn't Save Product", "Something went wrong while saving your product. Please try again.");
    } finally {
      setUploadStatusText("");
    }
  };

  const [imageNaturalSize, setImageNaturalSize] = useState({ width: 1, height: 1 });

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
            cropSettings: undefined,
          };
        })
      );
      setLocalPreviews(croppedPreviews);
      setSelectedPreviewIndex(0);
      setWizardStep("form");
      toast.success("Cloth detail zoom cropping applied!");
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to crop images: " + e.message);
    } finally {
      setCroppingInProgress(false);
    }
  };

  const handleTileClick = (fileIndex: number) => {
    setSelectedPreviewIndex(fileIndex);
  };  if (wizardStep === "select") {
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
            className="text-slate-500 hover:text-slate-800 transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
          <span className="text-sm font-black uppercase tracking-widest text-slate-800">New product post</span>
          <div className="w-5 h-5" />
        </div>

        {/* Viewport & Grid Splitter Container */}
        <div className="flex-1 overflow-y-auto bg-slate-50/50 flex flex-col">
          
          {/* Top Interactive Viewport Frame */}
          <div className="w-full bg-slate-100 flex justify-center items-center py-4 relative shrink-0">
            <div
              className="w-full relative bg-slate-950 overflow-hidden flex items-center justify-center rounded-2xl shadow-inner select-none"
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
                  className="w-full h-full bg-[#F9FAFB] border border-slate-200/80 rounded-2xl flex flex-col items-center justify-center text-center p-6 cursor-pointer hover:bg-slate-100/60 transition-colors"
                >
                  <ImageIcon className="w-9 h-9 stroke-[1.5] text-slate-600 mb-2.5" />
                  <span className="text-xs font-bold text-slate-800 tracking-tight mb-0.5">
                    Select Product Photos
                  </span>
                  <span className="text-[11px] font-medium text-slate-500">
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
                  className="absolute bottom-3 left-3 h-8 w-8 rounded-full bg-black/65 hover:bg-black/85 text-white flex items-center justify-center transition-all cursor-pointer shadow-md select-none active:scale-95 border border-white/10"
                  title="Toggle Aspect Ratio"
                >
                  <span className="text-[9px] font-black tracking-tighter uppercase">
                    {cropSettings.aspect === "1:1" ? "1:1" : cropSettings.aspect === "4:5" ? "4:5" : "Orig"}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Zoom Slider Overlay */}
          {activePreview && (
            <div className="px-6 py-2.5 bg-white border-y border-slate-100 flex items-center gap-3 shrink-0 select-none">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Zoom</span>
              <input
                type="range"
                min="1"
                max="3"
                step="0.01"
                value={cropSettings.zoom}
                onChange={(e) => updateActiveCrop({ zoom: parseFloat(e.target.value) })}
                className="flex-1 accent-[#E9B929] cursor-ew-resize h-1 bg-slate-100 rounded-lg appearance-none"
              />
              <span className="text-[10px] font-black text-slate-700 font-mono w-8 text-right">
                {Math.round(cropSettings.zoom * 100)}%
              </span>
            </div>
          )}

          {/* Recents & Selection Toolbar */}
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0 select-none">
            <div className="flex items-center gap-1 cursor-default">
              <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider">Recents</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </div>

            <div className="flex items-center gap-3">
              {localPreviews.length > 0 && (
                <span className="text-[10px] font-bold text-slate-500">
                  {localPreviews.length} of 5 selected
                </span>
              )}
              <div className="bg-white border border-slate-200 px-3 py-1 rounded-full shadow-2xs text-[10px] font-black uppercase text-slate-700 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#E9B929]" />
                Select Multiple
              </div>
            </div>
          </div>

          {/* Gallery Photo Grid */}
          <div className="p-4 bg-white flex-1 overflow-y-auto">
            <div className="grid grid-cols-4 gap-2">
              
              {/* Upload Button Grid Tile */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={localPreviews.length >= 5}
                className={cn(
                  "aspect-square rounded-xl border flex flex-col items-center justify-center gap-1 transition-colors select-none",
                  localPreviews.length >= 5
                    ? "bg-slate-50 border-slate-200 cursor-not-allowed opacity-40"
                    : "bg-slate-50 hover:bg-slate-100 border-slate-200 cursor-pointer"
                )}
              >
                <Plus className="w-5 h-5 text-slate-600 stroke-[2]" />
                <span className="text-[10px] font-semibold text-slate-600">Add Photo</span>
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
                        ? "border-[#E9B929] ring-2 ring-[#E9B929]/20 shadow-xs" 
                        : "border-slate-200 hover:border-slate-350",
                      draggedItemIndex === idx && "opacity-50 scale-95"
                    )}
                  >
                    <img src={prev.url} alt={`Thumb ${idx}`} className="w-full h-full object-cover pointer-events-none" />
                    
                    {/* Badge number */}
                    <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#E9B929] text-slate-900 flex items-center justify-center text-[10px] font-black shadow-sm">
                      {idx + 1}
                    </div>

                    {/* Delete badge */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(idx);
                      }}
                      className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-red-650 transition-colors shadow-sm cursor-pointer"
                      title="Remove image"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    
                    {idx === 0 && (
                      <div className="absolute bottom-1 left-1 bg-[#E9B929]/90 text-slate-900 text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider pointer-events-none">
                        Cover
                      </div>
                    )}

                    {idx > 0 && isSelectedForPreview && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCoverImage(idx);
                        }}
                        className="absolute bottom-1 left-1 bg-white/95 text-slate-900 text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider hover:bg-slate-100 shadow-xs"
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

      {/* Bottom Action Footer with Next Button at Bottom Right */}
        <div className="px-6 py-4 bg-white border-t border-slate-100 flex items-center justify-between shrink-0 shadow-sm z-20">
          <span className="text-xs font-semibold text-slate-500 font-sans">
            {localPreviews.length} of 3 photos selected
          </span>

          <button
            type="button"
            onClick={handleApplyCrop}
            disabled={!canGoNext}
            className={cn(
              "text-xs font-bold uppercase tracking-wider px-6 py-2.5 rounded-xl transition-all flex items-center gap-2 select-none",
              canGoNext 
                ? "bg-[#F5C22B] hover:bg-[#d9a71e] text-slate-950 font-black shadow-xs cursor-pointer active:scale-95" 
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            )}
          >
            <span>Next</span>
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

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 font-sans animate-in fade-in duration-200">
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-5 mb-8 gap-4">
        <div>
          <Link href="/boutique/products" className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors uppercase tracking-wider mb-2">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Products
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {productToEdit ? "Edit Product Listing" : "Create New Product"}
            </h1>
            {draftSavedText && (
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Check className="w-2.5 h-2.5" />
                {draftSavedText}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => router.push("/boutique/products")}
            className="rounded-xl border-slate-200 text-xs font-bold uppercase tracking-wider hidden md:inline-flex"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit(onFormSubmit, onFormError)}
            disabled={submitting}
            className="rounded-xl bg-[#E9B929] hover:bg-[#d6a51d] text-slate-900 text-xs font-black uppercase tracking-wider hidden md:flex items-center gap-2 px-5 py-2.5 border border-[#E9B929]"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {uploadStatusText || "Saving..."}
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                {productToEdit ? "Update Listing" : "Submit for Verification"}
              </>
            )}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onFormSubmit, onFormError)} className="max-w-3xl mx-auto flex flex-col gap-6">
        
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <div className="flex flex-col gap-0.5">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">Product Images</h3>
              <p className="text-[11px] text-slate-500 font-medium">These cropped images will be published with the listing.</p>
            </div>
            <button
              type="button"
              onClick={() => setWizardStep("select")}
              className="text-[11px] font-black uppercase text-[#E9B929] hover:text-[#d6a51d] tracking-wider transition-colors cursor-pointer"
            >
              Edit Photos
            </button>
          </div>
          <div className="flex flex-wrap gap-3">
            {localPreviews.map((prev, idx) => (
              <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-100 shadow-2xs">
                <img src={prev.url} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                {idx === 0 && (
                  <div className="absolute top-1 left-1 bg-[#E9B929] text-slate-900 font-black text-[8px] px-1 py-0.5 rounded uppercase tracking-wider">
                    Cover
                  </div>
                )}
                <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-slate-900/50 text-white flex items-center justify-center text-[8px] font-black">
                  {idx + 1}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-50">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">1. Primary Product Info</h3>
          </div>

          <div className="px-6 pb-6 pt-5 flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-700">Product Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Silk Zari Saree"
                  {...register("name")}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#E9B929] focus:border-[#E9B929] shadow-xs"
                />
                {errors.name && <span className="text-red-500 text-xs font-bold">{errors.name.message}</span>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-700">Category Tag *</label>
                  <input type="hidden" {...register("categoryId")} />
                  <button
                    type="button"
                    onClick={() => setIsCategoryPickerOpen(true)}
                    className={cn(
                      "w-full px-4 py-3 border border-slate-200 rounded-xl text-[13px] text-slate-800 bg-white flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-[#E9B929] focus:border-[#E9B929] shadow-xs cursor-pointer text-left transition-all",
                      errors.categoryId && "border-red-500 ring-1 ring-red-500"
                    )}
                  >
                    <span>{allCategoriesList.find(c => c._id === categoryIdWatch)?.name || "Select Category..."}</span>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </button>
                  {errors.categoryId && <span className="text-red-500 text-xs font-bold">{errors.categoryId.message}</span>}

                  {isCategoryPickerOpen && (
                    <div className="fixed inset-0 z-[1000] flex items-end sm:items-center sm:justify-center animate-in fade-in duration-200">
                      <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setIsCategoryPickerOpen(false)} />
                      <div className="relative w-full max-h-[85vh] bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl flex flex-col gap-4 animate-in slide-in-from-bottom duration-300 sm:max-w-md sm:m-4 overflow-hidden z-10 border border-slate-100 pb-safe">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                          <span className="text-xs font-black uppercase tracking-widest text-slate-800">Select Category</span>
                          <button 
                            type="button"
                            onClick={() => setIsCategoryPickerOpen(false)}
                            className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-all cursor-pointer"
                            aria-label="Close picker"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-1.5 py-1 scrollbar-none">
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
                                  "w-full px-4 py-3 rounded-xl text-left text-xs font-extrabold transition-all flex justify-between items-center border cursor-pointer",
                                  isSelected
                                    ? "bg-amber-50/70 border-amber-200 text-amber-700"
                                    : "bg-white border-slate-100 hover:border-slate-200 text-slate-600 hover:bg-slate-50"
                                )}
                              >
                                <span>{c.name}</span>
                                {isSelected && <Check className="w-4 h-4 text-amber-600" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-700">Base Price (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    {...register("price")}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#E9B929] focus:border-[#E9B929] shadow-xs"
                  />
                  {errors.price && <span className="text-red-500 text-xs font-bold">{errors.price.message}</span>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-700">Color *</label>
                  <input
                    type="text"
                    placeholder="e.g. Crimson Red"
                    {...register("color")}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#E9B929] focus:border-[#E9B929] shadow-xs"
                  />
                  {errors.color && <span className="text-red-500 text-xs font-bold">{errors.color.message}</span>}
                </div>
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
                    {...register("mrp")}
                    className="w-full px-3.5 py-2.5 bg-white border border-amber-200 rounded-lg text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#E9B929] focus:border-[#E9B929] shadow-2xs font-semibold"
                  />
                </div>
              </div>

              {priceWatch && platformSettings && (() => {
                const baseVal = parseFloat(priceWatch);
                if (isNaN(baseVal) || baseVal < 0) return null;
                
                let rate = platformSettings.markupRate;
                if (platformSettings.markupType === "tiered" && Array.isArray(platformSettings.markupTiers)) {
                  const tier = platformSettings.markupTiers.find((t: any) => {
                    const minMatch = baseVal >= t.min_price;
                    const maxMatch = t.max_price === null || t.max_price === undefined || baseVal <= t.max_price;
                    return minMatch && maxMatch;
                  });
                  if (tier) {
                    rate = tier.rate / 100;
                  }
                }
                
                const markupAmount = baseVal * rate;
                const preGstPrice = baseVal + markupAmount + 7;
                const feeRate = platformSettings.platformFeeRate ?? 0.02;
                const feeAmount = baseVal * feeRate;
                const platformRevenue = markupAmount + feeAmount + 7;
                const gstAmount = platformRevenue * 0.18;
                const allInRaw = preGstPrice + gstAmount;
                const custPrice = Math.ceil(allInRaw / 10) * 10 - 1;
                const netPayout = baseVal - feeAmount;

                return (
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-xs font-bold text-slate-600 flex flex-col gap-2">
                    <div className="flex justify-between flex-wrap gap-2 text-sm font-extrabold text-slate-900">
                      <span>Customer Price:</span>
                      <span className="font-mono">₹{custPrice}</span>
                    </div>
                    
                    <div className="border-t border-slate-100 pt-2 flex flex-col gap-1.5 text-[11px] text-slate-500 font-normal">
                      <div className="flex justify-between flex-wrap">
                        <span>Base price entered:</span>
                        <span className="font-mono">₹{baseVal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between flex-wrap">
                        <span>Hive Markup ({(rate * 100).toFixed(0)}%):</span>
                        <span className="font-mono">₹{markupAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between flex-wrap">
                        <span>Platform Fee:</span>
                        <span className="font-mono">₹7.00</span>
                      </div>
                      <div className="flex justify-between flex-wrap">
                        <span>GST (18%):</span>
                        <span className="font-mono">₹{gstAmount.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="flex justify-between flex-wrap border-t border-slate-100 pt-2 text-[#020617] font-bold">
                      <span>Estimated payout per sale:</span>
                      <span className="font-mono text-emerald-600">₹{netPayout.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })()}
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-visible">
          <button
            type="button"
            onClick={() => toggleDrawer("story")}
            className="w-full px-6 py-5 flex items-center justify-between hover:bg-slate-50 transition-colors focus:outline-none cursor-pointer"
          >
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">2. Product Details & Narrative</h3>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${openDrawers.story ? "rotate-180" : ""}`} />
          </button>

          {openDrawers.story && (
            <div className="px-6 pb-6 border-t border-slate-50 pt-5 flex flex-col gap-5 animate-in fade-in slide-in-from-top-2 duration-200 overflow-visible">
              
              <div className="flex flex-col gap-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-700">Product Description *</label>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Aesthetics:</span>
                    <select
                      value={selectedStyle}
                      onChange={(e) => setSelectedStyle(e.target.value)}
                      className="px-2.5 py-1.5 text-[11px] border border-slate-200 bg-white rounded-xl text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-[#E9B929]"
                    >
                      <option value="casual">Casual / Work</option>
                      <option value="elegant">Premium / Regal</option>
                      <option value="poetic">Traditional / Storytelling</option>
                    </select>

                    <button
                      type="button"
                      disabled={generatingDesc}
                      onClick={handleGenerateAI}
                      className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100/80 border border-amber-200/90 rounded-xl text-[11px] font-black text-amber-800 transition-all flex items-center gap-1.5 select-none cursor-pointer shadow-2xs shrink-0"
                    >
                      {generatingDesc ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                          <span>Writing...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                          <span>✨ Auto-Write</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <textarea
                  placeholder="Provide a detailed description of fabrics, stitching style, design aesthetics..."
                  {...register("description")}
                  rows={4}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#E9B929] focus:border-[#E9B929] shadow-xs font-sans leading-relaxed resize-none"
                />
                {errors.description && <span className="text-red-500 text-xs font-bold">{errors.description.message}</span>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-1">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-700">Material *</label>
                  <input type="hidden" {...register("materialType")} />
                  <button
                    type="button"
                    onClick={() => setIsMaterialPickerOpen(true)}
                    className={cn(
                      "w-full px-3 py-2.5 border border-slate-200 rounded-xl text-[13px] text-slate-800 bg-white flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-[#E9B929] focus:border-[#E9B929] cursor-pointer min-h-[44px] text-left transition-all",
                      errors.materialType && "border-red-500 ring-1 ring-red-500"
                    )}
                  >
                    <span>{materialTypeWatch || "Select Material..."}</span>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </button>
                  {errors.materialType && <span className="text-red-500 text-xs font-bold">{errors.materialType.message}</span>}

                  {materialTypeWatch === "Other" && (
                    <div className="flex flex-col gap-1.5 mt-2 animate-in fade-in duration-200">
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Custom Material Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Raw Silk"
                        {...register("customMaterialType")}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-[12px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#E9B929] focus:border-[#E9B929] min-h-[38px]"
                      />
                      {errors.customMaterialType && <span className="text-red-500 text-xs font-bold">{errors.customMaterialType.message}</span>}
                    </div>
                  )}

                  {isMaterialPickerOpen && (
                    <div className="fixed inset-0 z-[1000] flex items-end sm:items-center sm:justify-center animate-in fade-in duration-200">
                      <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setIsMaterialPickerOpen(false)} />
                      <div className="relative w-full max-h-[85vh] bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl flex flex-col gap-4 animate-in slide-in-from-bottom duration-300 sm:max-w-md sm:m-4 overflow-hidden z-10 border border-slate-100 pb-safe">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                          <span className="text-xs font-black uppercase tracking-widest text-slate-800">Select Material</span>
                          <button 
                            type="button"
                            onClick={() => setIsMaterialPickerOpen(false)}
                            className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-all cursor-pointer"
                            aria-label="Close picker"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-1.5 py-1 scrollbar-none">
                          {MATERIAL_OPTIONS.map((mat) => {
                            const isSelected = materialTypeWatch === mat;
                            return (
                              <button
                                key={mat}
                                type="button"
                                onClick={() => {
                                  setValue("materialType", mat, { shouldValidate: true });
                                  setIsMaterialPickerOpen(false);
                                }}
                                className={cn(
                                  "w-full px-4 py-3 rounded-xl text-left text-xs font-extrabold transition-all flex justify-between items-center border cursor-pointer",
                                  isSelected
                                    ? "bg-amber-50/70 border-amber-200 text-amber-700"
                                    : "bg-white border-slate-100 hover:border-slate-200 text-slate-600 hover:bg-slate-50"
                                )}
                              >
                                <span>{mat}</span>
                                {isSelected && <Check className="w-4 h-4 text-amber-600" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-700">Care Instruction *</label>
                  <input type="hidden" {...register("care")} />
                  <button
                    type="button"
                    onClick={() => setIsCarePickerOpen(true)}
                    className={cn(
                      "w-full px-3 py-2.5 border border-slate-200 rounded-xl text-[13px] text-slate-800 bg-white flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-[#E9B929] focus:border-[#E9B929] cursor-pointer min-h-[44px] text-left transition-all",
                      errors.care && "border-red-500 ring-1 ring-red-500"
                    )}
                  >
                    <span>{careWatch || "Select Care..."}</span>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </button>
                  {errors.care && <span className="text-red-500 text-xs font-bold">{errors.care.message}</span>}

                  {careWatch === "Other" && (
                    <div className="flex flex-col gap-1.5 mt-2 animate-in fade-in duration-200">
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Custom Care Instruction *</label>
                      <input
                        type="text"
                        placeholder="e.g. Dry clean first wash"
                        {...register("customCare")}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-[12px] text-slate-850 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#E9B929] focus:border-[#E9B929] min-h-[38px]"
                      />
                      {errors.customCare && <span className="text-red-500 text-xs font-bold">{errors.customCare.message}</span>}
                    </div>
                  )}

                  {isCarePickerOpen && (
                    <div className="fixed inset-0 z-[1000] flex items-end sm:items-center sm:justify-center animate-in fade-in duration-200">
                      <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setIsCarePickerOpen(false)} />
                      <div className="relative w-full max-h-[85vh] bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl flex flex-col gap-4 animate-in slide-in-from-bottom duration-300 sm:max-w-md sm:m-4 overflow-hidden z-10 border border-slate-100 pb-safe">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                          <span className="text-xs font-black uppercase tracking-widest text-slate-800">Select Care</span>
                          <button 
                            type="button"
                            onClick={() => setIsCarePickerOpen(false)}
                            className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-all cursor-pointer"
                            aria-label="Close picker"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-1.5 py-1 scrollbar-none">
                          {CARE_OPTIONS.map((c) => {
                            const isSelected = careWatch === c;
                            return (
                              <button
                                key={c}
                                type="button"
                                onClick={() => {
                                  setValue("care", c, { shouldValidate: true });
                                  setIsCarePickerOpen(false);
                                }}
                                className={cn(
                                  "w-full px-4 py-3 rounded-xl text-left text-xs font-extrabold transition-all flex justify-between items-center border cursor-pointer",
                                  isSelected
                                    ? "bg-amber-50/70 border-amber-200 text-amber-700"
                                    : "bg-white border-slate-100 hover:border-slate-200 text-slate-600 hover:bg-slate-50"
                                )}
                              >
                                  <span>{c}</span>
                                  {isSelected && <Check className="w-4 h-4 text-amber-600" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-700">Craft / Weave Type</label>
                  <input
                    type="text"
                    placeholder="e.g. Chikankari, Shibori"
                    {...register("craft")}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#E9B929] focus:border-[#E9B929] min-h-[44px]"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-visible">
          <button
            type="button"
            onClick={() => toggleDrawer("sizing")}
            className="w-full px-6 py-5 flex items-center justify-between hover:bg-slate-50 transition-colors focus:outline-none cursor-pointer"
          >
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">3. Sizing & Stock Availability</h3>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${openDrawers.sizing ? "rotate-180" : ""}`} />
          </button>

          {openDrawers.sizing && (
            <div className="px-6 pb-6 border-t border-slate-50 pt-5 flex flex-col gap-6 animate-in fade-in slide-in-from-top-2 duration-200">
              {isSareeCategory ? (
                <div className="flex flex-col gap-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-700">Product Size</label>
                  <div className="text-xs font-semibold text-slate-800 flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#E9B929]" />
                    Sarees are Free Size. Size "FREE" has been automatically set for this product.
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-700">Select Sizes *</label>
                  <div className="flex flex-wrap gap-2">
                    {SIZE_OPTIONS.map((sz) => {
                      const isSelected = selectedSizes.includes(sz);
                      return (
                        <button
                          type="button"
                          key={sz}
                          onClick={() => toggleSize(sz)}
                          className={`h-12 w-12 sm:h-14 sm:w-14 rounded-xl border font-black text-xs transition-colors flex items-center justify-center cursor-pointer ${
                            isSelected 
                              ? "bg-slate-900 text-white border-slate-900 shadow-sm" 
                              : "bg-white text-slate-800 border-slate-200 hover:border-[#E9B929]"
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
                <div className="flex flex-col gap-2 animate-in fade-in duration-200">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#9E7606]">Stock Quantity Per Size</label>
                  <div className="border border-slate-100 rounded-xl overflow-hidden shadow-2xs">
                    <div className="bg-slate-50 px-4 py-2.5 flex justify-between border-b border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      <span>Size</span>
                      <span>Stock</span>
                    </div>
                    {selectedSizes.map((sz) => (
                      <div key={sz} className="bg-white px-4 py-2.5 flex justify-between items-center border-b border-slate-100 last:border-0">
                        <span className="text-xs font-black text-slate-800">{sz}</span>
                        <input
                          type="number"
                          min="0"
                          value={stockBySize[sz] || ""}
                          onChange={(e) => handleStockChange(sz, parseInt(e.target.value) || 0)}
                          className="w-24 px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-right focus:ring-1 focus:ring-[#E9B929]"
                          placeholder="0"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <hr className="border-slate-100" />

              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-600">Compared to standard size, how does this fit?</label>
                <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200 gap-1 max-w-sm">
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
                        "flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all cursor-pointer",
                        fitRecommendation === rec.val 
                          ? "bg-white text-slate-800 border border-slate-200/50 shadow-2xs" 
                          : "text-slate-400 hover:text-slate-650"
                      )}
                    >
                      {rec.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-600">Garment Fit Category</label>
                <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200 gap-1 flex-wrap max-w-md">
                  {[
                    { val: "slim_fit", label: "Slim Fit" },
                    { val: "regular_fit", label: "Regular Fit" },
                    { val: "relaxed_fit", label: "Relaxed Fit" },
                    { val: "oversized", label: "Oversized" },
                  ].map((sil) => (
                    <button
                      key={sil.val}
                      type="button"
                      onClick={() => setSilhouette(sil.val as any)}
                      className={cn(
                        "px-3 py-2 text-[10px] font-black uppercase rounded-lg transition-all cursor-pointer",
                        silhouette === sil.val 
                          ? "bg-white text-slate-800 border border-slate-200/50 shadow-2xs" 
                          : "text-slate-400 hover:text-slate-650"
                      )}
                    >
                      {sil.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-visible relative z-20">
          <button
            type="button"
            onClick={() => toggleDrawer("specs")}
            className="w-full px-6 py-5 flex items-center justify-between hover:bg-slate-50 transition-colors focus:outline-none cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">4. Additional Specifications</h3>
              <span className="text-[8px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase">Optional</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${openDrawers.specs ? "rotate-180" : ""}`} />
          </button>

          {openDrawers.specs && (
            <div className="px-6 pb-8 border-t border-slate-50 pt-5 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-visible relative z-20 animate-in fade-in slide-in-from-top-2 duration-200">
              
              <div className="flex flex-col gap-1">
                <InlineDropdown
                  label="Fabric Content"
                  options={FABRIC_CONTENT_OPTIONS}
                  placeholder="Select fabric content..."
                  value={specDropdowns.fabricContent}
                  onChange={(val) => {
                    setSpecDropdowns(prev => ({ ...prev, fabricContent: val }));
                    if (val !== "Other") {
                      setValue("fabricContent", val);
                    } else {
                      setValue("fabricContent", "");
                    }
                  }}
                />
                {specDropdowns.fabricContent === "Other" && (
                  <input
                    type="text"
                    placeholder="Enter custom fabric content..."
                    {...register("fabricContent")}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-[12px] text-slate-800 mt-1 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#E9B929] focus:border-[#E9B929]"
                  />
                )}
              </div>

              <div className="flex flex-col gap-1">
                <InlineDropdown
                  label="Fabric Detail"
                  options={FABRIC_DETAIL_OPTIONS}
                  placeholder="Select fabric detail..."
                  value={specDropdowns.fabricDetail}
                  onChange={(val) => {
                    setSpecDropdowns(prev => ({ ...prev, fabricDetail: val }));
                    if (val !== "Other") {
                      setValue("fabricDetail", val);
                    } else {
                      setValue("fabricDetail", "");
                    }
                  }}
                />
                {specDropdowns.fabricDetail === "Other" && (
                  <input
                    type="text"
                    placeholder="Enter custom fabric detail..."
                    {...register("fabricDetail")}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-[12px] text-slate-800 mt-1 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#E9B929] focus:border-[#E9B929]"
                  />
                )}
              </div>

              <div className="flex flex-col gap-1">
                <InlineDropdown
                  label="Neck Type"
                  options={NECK_TYPE_OPTIONS}
                  placeholder="Select neck type..."
                  value={specDropdowns.neckType}
                  onChange={(val) => {
                    setSpecDropdowns(prev => ({ ...prev, neckType: val }));
                    if (val !== "Other") {
                      setValue("neckType", val);
                    } else {
                      setValue("neckType", "");
                    }
                  }}
                />
                {specDropdowns.neckType === "Other" && (
                  <input
                    type="text"
                    placeholder="Enter custom neck type..."
                    {...register("neckType")}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-[12px] text-slate-800 mt-1 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#E9B929] focus:border-[#E9B929]"
                  />
                )}
              </div>

              <div className="flex flex-col gap-1">
                <InlineDropdown
                  label="Closure"
                  options={CLOSURE_OPTIONS}
                  placeholder="Select closure..."
                  value={specDropdowns.closure}
                  onChange={(val) => {
                    setSpecDropdowns(prev => ({ ...prev, closure: val }));
                    if (val !== "Other") {
                      setValue("closure", val);
                    } else {
                      setValue("closure", "");
                    }
                  }}
                />
                {specDropdowns.closure === "Other" && (
                  <input
                    type="text"
                    placeholder="Enter custom closure..."
                    {...register("closure")}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-[12px] text-slate-800 mt-1 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#E9B929] focus:border-[#E9B929]"
                  />
                )}
              </div>

              <div className="flex flex-col gap-1">
                <InlineDropdown
                  label="Sleeve Length"
                  options={SLEEVE_LENGTH_OPTIONS}
                  placeholder="Select sleeve length..."
                  value={specDropdowns.sleeve}
                  onChange={(val) => {
                    setSpecDropdowns(prev => ({ ...prev, sleeve: val }));
                    if (val !== "Other") {
                      setValue("sleeve", val);
                    } else {
                      setValue("sleeve", "");
                    }
                  }}
                />
                {specDropdowns.sleeve === "Other" && (
                  <input
                    type="text"
                    placeholder="Enter custom sleeve length..."
                    {...register("sleeve")}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-[12px] text-slate-800 mt-1 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#E9B929] focus:border-[#E9B929]"
                  />
                )}
              </div>

              <div className="flex flex-col gap-1">
                <InlineDropdown
                  label="Sleeve Styling"
                  options={SLEEVE_STYLING_OPTIONS}
                  placeholder="Select sleeve styling..."
                  value={specDropdowns.sleeveStyling}
                  onChange={(val) => {
                    setSpecDropdowns(prev => ({ ...prev, sleeveStyling: val }));
                    if (val !== "Other") {
                      setValue("sleeveStyling", val);
                    } else {
                      setValue("sleeveStyling", "");
                    }
                  }}
                />
                {specDropdowns.sleeveStyling === "Other" && (
                  <input
                    type="text"
                    placeholder="Enter custom sleeve styling..."
                    {...register("sleeveStyling")}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-[12px] text-slate-800 mt-1 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#E9B929] focus:border-[#E9B929]"
                  />
                )}
              </div>

              <div className="flex flex-col gap-1">
                <InlineDropdown
                  label="Shape"
                  options={SHAPE_OPTIONS}
                  placeholder="Select shape..."
                  value={specDropdowns.shape}
                  onChange={(val) => {
                    setSpecDropdowns(prev => ({ ...prev, shape: val }));
                    if (val !== "Other") {
                      setValue("shape", val);
                    } else {
                      setValue("shape", "");
                    }
                  }}
                />
                {specDropdowns.shape === "Other" && (
                  <input
                    type="text"
                    placeholder="Enter custom shape..."
                    {...register("shape")}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-[12px] text-slate-800 mt-1 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#E9B929] focus:border-[#E9B929]"
                  />
                )}
              </div>

              <div className="flex flex-col gap-1">
                <InlineDropdown
                  label="Hemline"
                  options={HEMLINE_OPTIONS}
                  placeholder="Select hemline..."
                  value={specDropdowns.hemline}
                  onChange={(val) => {
                    setSpecDropdowns(prev => ({ ...prev, hemline: val }));
                    if (val !== "Other") {
                      setValue("hemline", val);
                    } else {
                      setValue("hemline", "");
                    }
                  }}
                />
                {specDropdowns.hemline === "Other" && (
                  <input
                    type="text"
                    placeholder="Enter custom hemline..."
                    {...register("hemline")}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-[12px] text-slate-800 mt-1 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#E9B929] focus:border-[#E9B929]"
                  />
                )}
              </div>

              <div className="flex flex-col gap-1">
                <InlineDropdown
                  label="Garment Length"
                  options={GARMENT_LENGTH_OPTIONS}
                  placeholder="Select garment length..."
                  value={specDropdowns.length}
                  onChange={(val) => {
                    setSpecDropdowns(prev => ({ ...prev, length: val }));
                    if (val !== "Other") {
                      setValue("length", val);
                    } else {
                      setValue("length", "");
                    }
                  }}
                />
                {specDropdowns.length === "Other" && (
                  <input
                    type="text"
                    placeholder="Enter custom garment length..."
                    {...register("length")}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-[12px] text-slate-800 mt-1 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#E9B929] focus:border-[#E9B929]"
                  />
                )}
              </div>

              <div className="flex flex-col gap-1">
                <InlineDropdown
                  label="Pattern"
                  options={PATTERN_OPTIONS}
                  placeholder="Select pattern..."
                  value={specDropdowns.pattern}
                  onChange={(val) => {
                    setSpecDropdowns(prev => ({ ...prev, pattern: val }));
                    if (val !== "Other") {
                      setValue("pattern", val);
                    } else {
                      setValue("pattern", "");
                    }
                  }}
                />
                {specDropdowns.pattern === "Other" && (
                  <input
                    type="text"
                    placeholder="Enter custom pattern..."
                    {...register("pattern")}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-[12px] text-slate-800 mt-1 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#E9B929] focus:border-[#E9B929]"
                  />
                )}
              </div>

            </div>
          )}
        </div>
      </form>

      <div className="h-16 md:h-0" />

      {/* Mobile Fixed Sticky Action Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200 z-[90] flex items-center justify-between gap-3 shadow-lg">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/boutique/products")}
          className="w-1/3 h-11 text-xs font-bold uppercase tracking-wider border-slate-200 rounded-xl"
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleSubmit(onFormSubmit, onFormError)}
          disabled={submitting}
          className="w-2/3 h-11 bg-[#E9B929] hover:bg-[#d6a51d] text-slate-900 text-xs font-black uppercase tracking-wider rounded-xl border border-[#E9B929] flex items-center justify-center gap-2 shadow-sm"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {uploadStatusText || "Saving..."}
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              {productToEdit ? "Update Listing" : "Submit for Verification"}
            </>
          )}
        </Button>
      </div>

      {isZoomModalOpen && localPreviews[selectedPreviewIndex] && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsZoomModalOpen(false)}
        >
          <button
            type="button"
            onClick={() => setIsZoomModalOpen(false)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer z-50"
            aria-label="Close zoom preview"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div 
            className="max-w-4xl max-h-[85vh] w-full h-full flex items-center justify-center relative"
            onClick={(e) => e.stopPropagation()}
          >
            <img 
              src={localPreviews[selectedPreviewIndex].url} 
              alt="Zoomed Preview" 
              className="max-w-full max-h-full object-contain rounded-lg animate-in zoom-in-95 duration-300" 
            />
          </div>
          
          <p className="text-white/60 text-xs mt-4 select-none font-medium">
            Tap anywhere outside to close
          </p>
        </div>
      )}

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
