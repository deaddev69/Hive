"use client";

import React, { useState, useEffect, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Button, Modal, cn } from "@hive/ui";
import { toast } from "@hive/utils";
import { 
  Upload, X, ArrowLeft, Check, AlertCircle, ChevronDown, 
  ChevronUp, Loader2, Sparkles, Image as ImageIcon, Save, CheckCircle2, Search
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Constant arrays
const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL", "FREE"];
const MATERIAL_OPTIONS = [
  "Cotton", "Silk", "Linen", "Georgette", "Chiffon",
  "Velvet", "Rayon", "Satin", "Blend", "Other"
];
const CARE_OPTIONS = ["Dry Clean Only", "Machine Wash Cold", "Hand Wash", "Do Not Bleach", "Other"];

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

// Zod Validation Schema
const productFormSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  price: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Base price must be greater than ₹0",
  }),
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
  const [localPreviews, setLocalPreviews] = useState<{ url: string; file?: File; storageId?: string }[]>([]);
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

  // Uploading / Submitting status
  const [submitting, setSubmitting] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState("");
  const [draftSavedText, setDraftSavedText] = useState("");

  // AI Description states
  const [selectedStyle, setSelectedStyle] = useState<string>("casual");
  const [generatingDesc, setGeneratingDesc] = useState(false);

  // Drawer visibility state (mobile-first collapsing)
  const [openDrawers, setOpenDrawers] = useState({
    primary: true,
    sizing: false,
    story: false,
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

    (categories || []).forEach((c) => {
      let mappedName = c.name;
      // Auto-map "Tops & Tunics" or variations of "tops" to "Tops"
      if (mappedName.toLowerCase().includes("tops")) {
        mappedName = "Tops";
      }

      const match = ALLOWED_CATEGORIES.find(
        (name) => name.toLowerCase() === mappedName.toLowerCase()
      );
      if (match) {
        list.push({ _id: c._id, name: match });
      }
    });

    const dbNames = new Set(list.map((c) => c.name.toLowerCase()));
    DEFAULT_CATEGORY_TAGS.forEach((tag) => {
      if (!dbNames.has(tag.name.toLowerCase())) {
        list.push({ _id: tag.id, name: tag.name });
      }
    });

    // Sort according to ALLOWED_CATEGORIES order
    list.sort((a, b) => {
      const indexA = ALLOWED_CATEGORIES.findIndex(name => name.toLowerCase() === a.name.toLowerCase());
      const indexB = ALLOWED_CATEGORIES.findIndex(name => name.toLowerCase() === b.name.toLowerCase());
      return indexA - indexB;
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
      setValue("price", productToEdit.basePrice?.toString() || productToEdit.price?.toString() || "");
      setValue("discountPrice", productToEdit.baseDiscountPrice?.toString() || productToEdit.discountPrice?.toString() || "");
      
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
        setValue("color", autoCorrectCapitalization(productToEdit.details.color || ""));
        setValue("fabricContent", autoCorrectCapitalization(productToEdit.details.fabricContent || ""));
        setValue("fabricDetail", autoCorrectCapitalization(productToEdit.details.fabricDetail || ""));
        setValue("neckType", autoCorrectCapitalization(productToEdit.details.neckType || ""));
        setValue("closure", autoCorrectCapitalization(productToEdit.details.closure || ""));
        setValue("sleeve", autoCorrectCapitalization(productToEdit.details.sleeve || ""));
        setValue("sleeveStyling", autoCorrectCapitalization(productToEdit.details.sleeveStyling || ""));
        setValue("shape", autoCorrectCapitalization(productToEdit.details.shape || ""));
        setValue("hemline", autoCorrectCapitalization(productToEdit.details.hemline || ""));
        setValue("length", autoCorrectCapitalization(productToEdit.details.length || ""));
        setValue("pattern", autoCorrectCapitalization(productToEdit.details.pattern || ""));
        setValue("fabricFamily", autoCorrectCapitalization(productToEdit.details.fabricFamily || ""));
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
          toast.success("Restored your unfinished product draft.");
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
      toast.error("Please enter a product name first to guide the AI writer.");
      return;
    }

    setGeneratingDesc(true);
    setValue("description", "", { shouldDirty: true, shouldValidate: true });

    try {
      const response = await fetch("/api/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roughText: `${currentName} in category ${currentCategory || "clothing"}`,
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
        toast.success("Product description generated.");
      } else {
        const text = await response.text();
        setValue("description", text, { shouldDirty: true, shouldValidate: true });
        toast.success("Product description generated.");
      }
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to generate description: " + e.message);
    } finally {
      setGeneratingDesc(false);
    }
  };

  const onFormError = (errors: any) => {
    toast.error("Please review the highlighted errors before submitting.");
  };

  const onFormSubmit = async (data: ProductFormValues) => {
    if (localPreviews.length < 3) {
      toast.error("Please upload at least 3 high-resolution images.");
      return;
    }

    if (selectedSizes.length === 0) {
      setOpenDrawers((prev) => ({ ...prev, sizing: true }));
      toast.error("Please select at least one active size.");
      return;
    }

    const hasZeroStock = selectedSizes.every((sz) => !stockBySize[sz] || stockBySize[sz] <= 0);
    if (hasZeroStock) {
      setOpenDrawers((prev) => ({ ...prev, sizing: true }));
      toast.error("At least one selected size must have a stock quantity greater than 0.");
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
      const foundCategory = allCategoriesList.find((c) => c._id === primaryCatId);
      const categoryTagName = foundCategory ? foundCategory.name : primaryCatId;

      const payload = {
        name: data.name,
        description: data.description,
        categoryId: primaryCatId as any,
        price: parseFloat(data.price),
        discountPrice: data.discountPrice ? parseFloat(data.discountPrice) : undefined,
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
          categoryIds: primaryCatId,
          categoryNames: categoryTagName,
        },
        fitRecommendation,
        silhouette,
        approvalStatus: (productToEdit?.approvalStatus === "approved" ? "approved" : "pending") as any, // Verification State
      };

      if (productToEdit?._id) {
        await updateProduct({ id: productToEdit._id as any, ...payload });
        toast.success("Product updated successfully.");
      } else {
        await createProduct(payload);
        localStorage.removeItem("hive_product_draft"); // clear draft
        toast.success("Product created. Verification pending by administrator.");
      }

      router.push("/boutique/products");
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to save product: " + e.message);
    } finally {
      setSubmitting(false);
      setUploadStatusText("");
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 font-sans">
      
      {/* Upper header */}
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

      <form className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT PANEL: Media Hub (Drag / Drop Grid) */}
        <div className="lg:col-span-5 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col gap-5 sticky top-6">
          <div className="flex flex-col gap-1">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">Visual Media Hub</h3>
            <p className="text-[12px] text-slate-500 font-medium">Upload 3 to 5 images. Tap a thumbnail to preview. Set as Cover to change order.</p>
          </div>

          {/* Primary Preview Frame */}
          <div className="w-full aspect-square bg-slate-50 rounded-2xl overflow-hidden border border-slate-100 flex items-center justify-center relative group">
            {localPreviews[selectedPreviewIndex] ? (
              <>
                <img src={localPreviews[selectedPreviewIndex].url} alt="Cover Preview" className="w-full h-full object-cover" />
                
                {selectedPreviewIndex === 0 ? (
                  <span className="absolute left-3 top-3 bg-slate-900/80 backdrop-blur-md text-[9px] font-black tracking-widest text-white px-2.5 py-1 rounded-full uppercase select-none">
                    Cover Photo
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setCoverImage(selectedPreviewIndex)}
                    className="absolute left-3 top-3 bg-[#E9B929] hover:bg-[#d6a51d] text-slate-900 text-[9px] font-black tracking-widest px-2.5 py-1 rounded-full uppercase transition-all shadow-md active:scale-95 cursor-pointer z-10"
                  >
                    Set as Cover
                  </button>
                )}

                {/* Full-Screen Zoom Button */}
                <button
                  type="button"
                  onClick={() => setIsZoomModalOpen(true)}
                  className="absolute left-3 bottom-3 w-8 h-8 bg-white/90 hover:bg-white text-slate-700 rounded-full flex items-center justify-center shadow-md transition-all active:scale-95 cursor-pointer z-10"
                  title="Inspect Image"
                >
                  <Search className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => removeImage(selectedPreviewIndex)}
                  className="absolute right-3 top-3 w-9 h-9 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-full flex items-center justify-center shadow-md transition-all active:scale-95 hover:text-red-500 z-10"
                  title="Remove Image"
                >
                  <X className="w-4.5 h-4.5 stroke-[2.5]" />
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-400 gap-2">
                <ImageIcon className="w-10 h-10 stroke-[1.25]" />
                <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400">No Image Uploaded</span>
              </div>
            )}
          </div>

          {/* Thumbnail Strip with reorder triggers */}
          <div className="grid grid-cols-5 gap-2.5">
            {localPreviews.map((prev, idx) => (
              <div 
                key={idx} 
                className={`aspect-square rounded-xl overflow-hidden border relative cursor-pointer group shadow-xs transition-all ${
                  idx === 0 
                    ? "border-[#E9B929] ring-2 ring-[#E9B929]/20 shadow-sm" 
                    : idx === selectedPreviewIndex
                      ? "border-slate-400 ring-2 ring-slate-400/20"
                      : "border-slate-200 hover:border-slate-350"
                }`}
                onClick={() => setSelectedPreviewIndex(idx)}
              >
                <img src={prev.url} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
              </div>
            ))}
            
            {localPreviews.length < 5 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square bg-slate-50 hover:bg-slate-100/50 border border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4 text-slate-400" />
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wide">Add</span>
              </button>
            )}
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

        {/* RIGHT PANEL: Scrollable Form Details */}
        <div className="lg:col-span-7 flex flex-col gap-6">

          {/* CARD 1: Primary Details */}
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

                    {/* Custom Bottom Sheet / Drawer Category Picker */}
                    {isCategoryPickerOpen && (
                      <div className="fixed inset-0 z-[1000] flex items-end sm:items-center sm:justify-center animate-in fade-in duration-200">
                        {/* Backdrop */}
                        <div 
                          className="fixed inset-0 bg-black/40 backdrop-blur-xs"
                          onClick={() => setIsCategoryPickerOpen(false)}
                        />
                        
                        {/* Drawer content */}
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
                  
                  const custPrice = Math.ceil((baseVal * (1 + rate)) / 10) * 10 - 1;
                  const netPayout = baseVal * 0.98;
                  const feeAmount = baseVal * 0.02;
                  return (
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-xs font-bold text-slate-600 flex flex-col gap-2">
                      <div className="flex justify-between flex-wrap gap-2">
                        <span>Estimated Storefront Price:</span>
                        <span className="font-extrabold text-slate-900 font-mono text-sm">₹{custPrice}</span>
                      </div>
                      <div className="flex justify-between flex-wrap border-t border-slate-100 pt-2 text-[11px] text-slate-500 font-normal">
                        <span>Base price entered:</span>
                        <span className="font-mono">₹{baseVal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between flex-wrap text-[11px] text-slate-500 font-normal">
                        <span>Platform Fee (2%):</span>
                        <span className="font-mono text-red-500">-₹{feeAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between flex-wrap border-t border-slate-200/50 pt-2 text-emerald-700 font-extrabold">
                        <span>Your Net Payout:</span>
                        <span className="font-mono text-slate-900 text-sm">₹{netPayout.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

          {/* CARD 2: Sizes & Fit */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-50">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">2. Sizing & Stock</h3>
            </div>

            <div className="px-6 pb-6 pt-5 flex flex-col gap-5">
                {/* Size Pills */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-700">Select Active Sizes *</label>
                  <div className="flex flex-wrap gap-2.5">
                    {SIZE_OPTIONS.map((sz) => {
                      const isSelected = selectedSizes.includes(sz);
                      return (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => toggleSize(sz)}
                          className={`min-h-[48px] px-5 py-2.5 border rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                            isSelected 
                              ? "bg-[#E9B929] border-[#E9B929] text-slate-900 animate-scale-up" 
                              : "bg-white border-slate-200 text-slate-600 hover:border-slate-400"
                          }`}
                        >
                          {sz}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Stock inputs by size */}
                {selectedSizes.length > 0 && (
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col gap-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Define Stock Quantities</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {selectedSizes.map((sz) => (
                        <div key={sz} className="flex flex-col gap-1 bg-white border border-slate-200/60 rounded-xl p-2.5">
                          <span className="text-xs font-black text-slate-700">{sz} Stock</span>
                          <input
                            type="number"
                            min="0"
                            value={stockBySize[sz] !== undefined ? stockBySize[sz] : ""}
                            onChange={(e) => handleStockChange(sz, parseInt(e.target.value) || 0)}
                            placeholder="0"
                            className="w-full min-h-[36px] text-xs font-bold text-slate-800 focus:outline-none border-b border-transparent focus:border-slate-400 mt-1"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Segmented Toggles for Fit */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-700">Runs Compared to Standard</label>
                    <div className="grid grid-cols-3 bg-slate-50 border border-slate-200/50 rounded-xl p-1">
                      {(["runs_small", "true_to_size", "runs_large"] as const).map((fit) => (
                        <button
                          key={fit}
                          type="button"
                          onClick={() => setFitRecommendation(fit)}
                          className={`min-h-[40px] py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                            fitRecommendation === fit 
                              ? "bg-white text-slate-900 shadow-xs font-extrabold" 
                              : "text-slate-400 hover:text-slate-600"
                          }`}
                        >
                          {fit.replace(/_/g, " ")}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-700">Overall Fit Style</label>
                    <div className="grid grid-cols-4 bg-slate-50 border border-slate-200/50 rounded-xl p-1">
                      {(["slim_fit", "regular_fit", "relaxed_fit", "oversized"] as const).map((sil) => (
                        <button
                          key={sil}
                          type="button"
                          onClick={() => setSilhouette(sil)}
                          className={`min-h-[40px] py-1.5 text-[8px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                            silhouette === sil 
                              ? "bg-white text-slate-900 shadow-xs font-extrabold" 
                              : "text-slate-400 hover:text-slate-600"
                          }`}
                        >
                          {sil.replace(/_/g, " ")}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
          </div>

          {/* CARD 3: Description, AI Assistant, & Story */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-50">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">3. Storytelling & Details</h3>
            </div>

            <div className="px-6 pb-6 pt-5 flex flex-col gap-5">
                {/* AI description generator textarea */}
                <div className="flex flex-col gap-2 relative">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-700">Product Description *</label>
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedStyle}
                        onChange={(e) => setSelectedStyle(e.target.value)}
                        className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none cursor-pointer min-h-[36px]"
                      >
                        <option value="casual">Casual Style</option>
                        <option value="elegant">Elegant Style</option>
                        <option value="minimalist">Minimalist Style</option>
                        <option value="festive">Festive Style</option>
                        <option value="artistic">Artistic Style</option>
                      </select>
                      <button
                        type="button"
                        onClick={handleGenerateAI}
                        disabled={generatingDesc}
                        className="text-[10px] font-black uppercase tracking-wider text-[#d6a51d] hover:text-[#b08714] bg-[#E9B929]/10 border border-[#E9B929]/30 rounded-lg px-3 py-1.5 flex items-center gap-1 transition-all disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-200 cursor-pointer min-h-[36px]"
                      >
                        {generatingDesc ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Writing...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3 text-[#E9B929]" />
                            Auto-Write
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

                {/* Design Story (Manual, NO AI) */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-700">Design Story (Manual Only)</label>
                  <textarea
                    placeholder="Tell customers about the inspiration, craftsmanship, or what makes this piece special..."
                    {...register("story")}
                    rows={3}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#E9B929] focus:border-[#E9B929] shadow-xs font-sans leading-relaxed resize-none"
                  />
                </div>

                {/* Material & Care selections */}
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

                    {/* Conditional manual writing input if Other is selected */}
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

                    {/* Custom Material Picker Drawer */}
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

                    {/* Conditional manual writing input if Other is selected */}
                    {careWatch === "Other" && (
                      <div className="flex flex-col gap-1.5 mt-2 animate-in fade-in duration-200">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Custom Care Instruction *</label>
                        <input
                          type="text"
                          placeholder="e.g. Dry clean first wash"
                          {...register("customCare")}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-[12px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#E9B929] focus:border-[#E9B929] min-h-[38px]"
                        />
                        {errors.customCare && <span className="text-red-500 text-xs font-bold">{errors.customCare.message}</span>}
                      </div>
                    )}

                    {/* Custom Care Picker Drawer */}
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
          </div>

          {/* CARD 4: Collapsible Accordion (12+ Specs) */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
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
              <div className="px-6 pb-6 border-t border-slate-50 pt-5 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Fabric Content</label>
                  <input type="text" placeholder="e.g. 100% Organic Silk" {...register("fabricContent")} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-[12px] text-slate-850" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Fabric Detail</label>
                  <input type="text" placeholder="e.g. Plain Weave" {...register("fabricDetail")} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-[12px] text-slate-850" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Neck Type</label>
                  <input type="text" placeholder="e.g. Boat Neck" {...register("neckType")} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-[12px] text-slate-850" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Closure</label>
                  <input type="text" placeholder="e.g. Hook and Eye" {...register("closure")} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-[12px] text-slate-850" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Sleeve Length</label>
                  <input type="text" placeholder="e.g. Three-Quarter Sleeve" {...register("sleeve")} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-[12px] text-slate-850" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Sleeve Styling</label>
                  <input type="text" placeholder="e.g. Puff Sleeve" {...register("sleeveStyling")} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-[12px] text-slate-850" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Shape</label>
                  <input type="text" placeholder="e.g. A-Line, Straight" {...register("shape")} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-[12px] text-slate-850" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Hemline</label>
                  <input type="text" placeholder="e.g. Flared, Asymmetric" {...register("hemline")} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-[12px] text-slate-850" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Garment Length</label>
                  <input type="text" placeholder="e.g. Calf Length" {...register("length")} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-[12px] text-slate-850" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Pattern</label>
                  <input type="text" placeholder="e.g. Floral Print" {...register("pattern")} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-[12px] text-slate-850" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Fabric Family</label>
                  <input type="text" placeholder="e.g. Silk, Banarasi" {...register("fabricFamily")} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-[12px] text-slate-850" />
                </div>
              </div>
            )}
          </div>
        </div>
      </form>

      {/* Spacer to prevent fixed footer block overlap */}
      <div className="h-24 md:h-0" />

      {/* Sticky Bottom Action Bar for Mobile Viewports */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-100 p-4 z-40 flex items-center justify-between gap-3 shadow-lg md:hidden animate-in slide-in-from-bottom duration-300">
        <Button
          variant="outline"
          onClick={() => router.push("/boutique/products")}
          className="flex-1 rounded-xl border-slate-200 text-xs font-bold uppercase tracking-wider py-3 h-12"
          type="button"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit(onFormSubmit, onFormError)}
          disabled={submitting}
          className="flex-1 rounded-xl bg-[#E9B929] hover:bg-[#d6a51d] text-slate-900 text-xs font-black uppercase tracking-wider h-12 flex items-center justify-center gap-2 border border-[#E9B929]"
          type="button"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              {productToEdit ? "Update" : "Publish"}
            </>
          )}
        </Button>
      </div>

      {/* Seller Image Zoom Preview Lightbox overlay */}
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
    </div>
  );
}
