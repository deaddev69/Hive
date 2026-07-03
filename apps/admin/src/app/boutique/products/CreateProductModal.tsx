"use client";

import React, { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Button, Modal } from "@hive/ui";
import { Upload, X, ArrowRight, ArrowLeft, Check, ImageIcon, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";

const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL", "FREE"];
const MATERIAL_OPTIONS = ["Cotton", "Silk", "Linen", "Polyester", "Blend", "Crepe", "Georgette", "Chiffon"];
const CARE_OPTIONS = ["Dry Clean Only", "Machine Wash Cold", "Hand Wash", "Do Not Bleach"];
const OCCASION_OPTIONS = ["Casual", "Festive", "Wedding", "Workwear", "Party"];

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
        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-[13px] text-left text-slate-700 bg-white shadow-sm flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-[#C89653] select-none"
      >
        <span className={value ? "text-slate-800 font-medium" : "text-slate-400 font-medium"}>
          {value || placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-[102%] bg-white border border-[#E6D5B8]/30 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto py-1 animate-in fade-in slide-in-from-top-1">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                onChange(opt);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-2.5 text-[13px] text-left hover:bg-slate-50 transition-colors ${
                value === opt ? "bg-[#C89653]/10 text-[#C89653] font-bold" : "text-slate-700"
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

function CategorySelect({
  value,
  onChange,
  categories,
}: {
  value: string;
  onChange: (val: string) => void;
  categories: any[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeCategory = categories.find((c) => c._id === value);

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
      <label className="text-[11px] font-black uppercase tracking-widest text-slate-600">
        CATEGORY TAG <span className="text-red-500">*</span>
      </label>
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-[13px] text-left text-slate-700 bg-white shadow-sm flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-[#C89653] select-none"
      >
        <span className={activeCategory ? "text-slate-800 font-medium" : "text-slate-400 font-medium"}>
          {activeCategory ? activeCategory.name : "Select category..."}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-[102%] bg-white border border-[#E6D5B8]/30 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto py-1 animate-in fade-in slide-in-from-top-1">
          {categories.map((c) => (
            <button
              key={c._id}
              type="button"
              onClick={() => {
                onChange(c._id);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-2.5 text-[13px] text-left hover:bg-slate-50 transition-colors ${
                value === c._id ? "bg-[#C89653]/10 text-[#C89653] font-bold" : "text-slate-700"
              }`}
            >
              {c.name}
            </button>
          ))}
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
  const generateUploadUrl = useMutation(api.products.generateBoutiqueUploadUrl);

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
  const [categoryId, setCategoryId] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [localPreviews, setLocalPreviews] = useState<{ url: string; file?: File; storageId?: string }[]>([]);
  
  const [description, setDescription] = useState("");
  const [story, setStory] = useState("");
  const [materialType, setMaterialType] = useState("");
  const [care, setCare] = useState("");
  const [occasion, setOccasion] = useState("");
  const [craft, setCraft] = useState("");
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

  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [stockBySize, setStockBySize] = useState<Record<string, number>>({});
  const [fitRecommendation, setFitRecommendation] = useState<"runs_small" | "true_to_size" | "runs_large">("true_to_size");
  const [silhouette, setSilhouette] = useState<"slim_fit" | "regular_fit" | "relaxed_fit" | "oversized">("regular_fit");

  const [price, setPrice] = useState("");
  const [discountPrice, setDiscountPrice] = useState("");
  const [sameDayEligible, setSameDayEligible] = useState(false);
  const [featured, setFeatured] = useState(false);
  const [active, setActive] = useState(true);

  const [uploadingImages, setUploadingImages] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      if (productToEdit) {
        setName(productToEdit.name || "");
        setCategoryId(productToEdit.categoryId || (categories?.[0]?._id || ""));
        setDescription(productToEdit.description || "");
        setStory(productToEdit.story || "");
        setMaterialType(productToEdit.materialType || "");
        setCare(productToEdit.care || "");
        setOccasion(productToEdit.occasion || "");
        setCraft(productToEdit.details?.craft || "");
        
        if (productToEdit.details) {
          setSpecs({
            color: productToEdit.details.color || "",
            fabricContent: productToEdit.details.fabricContent || "",
            fabricDetail: productToEdit.details.fabricDetail || "",
            neckType: productToEdit.details.neckType || "",
            closure: productToEdit.details.closure || "",
            sleeve: productToEdit.details.sleeve || "",
            sleeveStyling: productToEdit.details.sleeveStyling || "",
            shape: productToEdit.details.shape || "",
            hemline: productToEdit.details.hemline || "",
            length: productToEdit.details.length || "",
            pattern: productToEdit.details.pattern || "",
            fabricFamily: productToEdit.details.fabricFamily || ""
          });
        }
        
        setSelectedSizes(productToEdit.sizes || []);
        setStockBySize(productToEdit.stockBySize || {});
        setFitRecommendation(productToEdit.fitRecommendation || "true_to_size");
        setSilhouette(productToEdit.silhouette || "regular_fit");
        
        setPrice(productToEdit.price ? productToEdit.price.toString() : "");
        setDiscountPrice(productToEdit.discountPrice ? productToEdit.discountPrice.toString() : "");
        setSameDayEligible(productToEdit.sameDayEligible || false);
        setFeatured(productToEdit.featured || false);
        setActive(productToEdit.active !== false);

        setImages(productToEdit.images || []);
        const previews = (productToEdit.images || []).map((imgId: string, idx: number) => ({
          url: productToEdit.imageUrls?.[idx] || imgId,
          storageId: imgId
        }));
        setLocalPreviews(previews);
      } else {
        // Reset form
        setName("");
        setCategoryId(categories?.[0]?._id || "");
        setDescription("");
        setStory("");
        setMaterialType("");
        setCare("");
        setOccasion("");
        setCraft("");
        setStep2Error("");
        setSpecs({
          color: "", fabricContent: "", fabricDetail: "", neckType: "",
          closure: "", sleeve: "", sleeveStyling: "", shape: "",
          hemline: "", length: "", pattern: "", fabricFamily: ""
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
  }, [isOpen, productToEdit, categories]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Step 1 Validation
    if (step === 1) {
      if (!price) {
        alert("Please enter a price for your product.");
        return;
      }
      if (discountPrice && parseFloat(discountPrice) >= parseFloat(price)) {
        alert("Discount price must be less than the regular price.");
        return;
      }
      if (localPreviews.length < 3) {
        alert("Please upload at least 3 high-resolution images for your product.");
        return;
      }
    }

    // Step 2 Validation
    if (step === 2) {
      if (!description.trim()) {
        setStep2Error("Please enter a product description.");
        return;
      }
      if (selectedSizes.length === 0) {
        setStep2Error("Please select at least one size.");
        return;
      }
      setStep2Error("");
    }

    // Step 3 Validation
    if (step === 3) {
      // Just basic check for at least one core detail
      if (!specs.color) {
        alert("Please provide at least a color for the product.");
        return;
      }
    }

    if (step < totalSteps) {
      setStep(step + 1);
      return;
    }

    if (!name || !price || !categoryId) {
      alert("Please fill required fields (Name, Price, Category).");
      return;
    }
    if (selectedSizes.length === 0) {
      alert("Please select at least one size.");
      return;
    }
    if (localPreviews.length < 3) {
      alert("Please upload at least 3 high-resolution images for your product.");
      return;
    }

    setSubmitting(true);
    setUploadingImages(true);

    try {
      const finalImageStorageIds: string[] = [];
      for (const item of localPreviews) {
        if (item.file) {
          const uploadUrl = await generateUploadUrl();
          const result = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": item.file.type },
            body: item.file,
          });
          const { storageId } = await result.json();
          finalImageStorageIds.push(storageId);
        } else if (item.storageId) {
          finalImageStorageIds.push(item.storageId);
        }
      }

      setUploadingImages(false);

      const payload = {
        name,
        description,
        categoryId: categoryId as any,
        price: parseFloat(price),
        discountPrice: discountPrice ? parseFloat(discountPrice) : undefined,
        images: finalImageStorageIds,
        sizes: selectedSizes,
        stockBySize,
        sameDayEligible,
        featured,
        active,
        story,
        materialType,
        care,
        occasion,
        details: { ...(craft ? { craft } : {}), ...specs },
        fitRecommendation,
        silhouette,
      };

      if (productToEdit?._id) {
        await updateProduct({ id: productToEdit._id as any, ...payload });
        alert("Product updated successfully!");
      } else {
        await createProduct(payload);
        alert("Product created successfully!");
      }
      onClose();
    } catch (err: any) {
      alert("Failed to save product: " + err.message);
    } finally {
      setSubmitting(false);
      setUploadingImages(false);
    }
  };

  const renderStepIndicator = () => {
    const titles = ["PHOTOS & INFO", "DETAILS & SIZES", "SPECIFICATIONS"];
    return (
      <div className="flex flex-col mb-8">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-black tracking-widest text-[#C89653] uppercase">STEP {step} OF 3</span>
          <span className="text-[11px] font-black tracking-widest text-slate-800 uppercase">{titles[step - 1]}</span>
        </div>
        <div className="flex gap-2 w-full mb-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`h-1 rounded-full flex-1 ${i <= step ? "bg-[#C89653]" : "bg-[#F0F0F0]"}`} />
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
              <span className="text-[#C89653] cursor-pointer text-[10px] uppercase tracking-widest">▼ VIEW CHECKLIST</span>
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
              <p className="text-[13px] text-slate-500 font-medium">Specify your product name and select its main category.</p>
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

            <CategorySelect
              value={categoryId}
              onChange={setCategoryId}
              categories={categories}
            />

            <div className="grid grid-cols-2 gap-4 mt-1">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-600">PRICE (₹) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-[13px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#C89653] shadow-sm"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-600">DISCOUNT PRICE (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Optional"
                  value={discountPrice}
                  onChange={(e) => setDiscountPrice(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-[13px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#C89653] shadow-sm"
                />
              </div>
            </div>

            <hr className="border-slate-100 my-4" />

            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">PRODUCT PHOTOS</h3>
              <p className="text-[13px] text-slate-500 font-medium leading-relaxed">Upload high-resolution images of your product (3 to 5 photos).<br/>Click "Set Cover" to select a primary cover image.</p>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 border-[1.5px] border-dashed border-[#C89653] bg-[#FCFAF7] rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-amber-50/50 transition-colors"
            >
              <Upload className="w-5 h-5 text-[#C89653] mb-2" />
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
                      <div className="absolute top-2 left-2 bg-[#C89653] text-white text-[9px] font-black uppercase px-2 py-1 rounded-full shadow flex items-center gap-1"><span className="text-[8px]">✨</span> COVER</div>
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
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-700">PRODUCT DESCRIPTION <span className="text-red-500">*</span></label>
              <textarea
                placeholder="Provide a detailed description of fabrics, stitching style, design aesthetics..."
                value={description}
                onChange={(e) => { setDescription(e.target.value); setStep2Error(""); }}
                rows={3}
                className={`w-full px-4 py-3 border ${step2Error ? "border-red-400 ring-1 ring-red-400" : "border-slate-200"} rounded-xl text-[13px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#C89653] shadow-sm resize-none`}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-700">DESIGN STORY</label>
              <textarea
                placeholder="Tell customers about the inspiration, craftsmanship, or what makes this piece special..."
                value={story}
                onChange={(e) => setStory(e.target.value)}
                rows={2}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-[13px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#C89653] shadow-sm resize-none"
              />
            </div>

            <CustomSelect
              label="MATERIAL TYPE"
              value={materialType}
              onChange={setMaterialType}
              options={MATERIAL_OPTIONS}
              placeholder="Select material..."
              required
            />

            <CustomSelect
              label="CARE INSTRUCTIONS"
              value={care}
              onChange={setCare}
              options={CARE_OPTIONS}
              placeholder="Select care instructions..."
              required
            />

            <CustomSelect
              label="OCCASION"
              value={occasion}
              onChange={setOccasion}
              options={OCCASION_OPTIONS}
              placeholder="Select occasion..."
              required
            />

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-700">CRAFT</label>
              <input
                type="text"
                placeholder="e.g. Handloom Kasavu, Chikankari, Shibori"
                value={craft}
                onChange={(e) => setCraft(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-[13px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#C89653] shadow-sm"
              />
            </div>



            <hr className="border-slate-100 -my-3" />

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
                      className={`h-12 w-12 sm:h-14 sm:w-14 rounded-2xl border font-black text-xs transition-colors flex items-center justify-center ${
                        isSelected ? "bg-[#252323] text-white border-[#252323]" : "bg-white text-slate-800 border-slate-200 hover:border-[#C89653]"
                      }`}
                    >
                      {sz}
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedSizes.length > 0 && (
              <div className="flex flex-col gap-1 animate-in fade-in zoom-in-95 mt-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#C89653]">STOCK PER SIZE</label>
                <div className="border border-[#F2EFEA] rounded-2xl overflow-hidden">
                  <div className="bg-[#FAF9F7] px-4 py-3 flex justify-between border-b border-[#F2EFEA]">
                    <span className="text-[10px] font-black tracking-widest text-slate-500">SIZE</span>
                    <span className="text-[10px] font-black tracking-widest text-slate-500">STOCK</span>
                  </div>
                  {selectedSizes.map((sz) => (
                    <div key={sz} className="bg-white px-4 py-3 flex justify-between items-center border-b border-[#F2EFEA] last:border-0">
                      <span className="text-sm font-black text-slate-800">{sz}</span>
                      <input
                        type="number"
                        min="0"
                        value={stockBySize[sz] || ""}
                        onChange={(e) => setStockBySize({ ...stockBySize, [sz]: parseInt(e.target.value) || 0 })}
                        className="w-20 px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-right focus:outline-none focus:ring-1 focus:ring-[#C89653]"
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <hr className="border-slate-100 -my-3" />

            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-600">1. COMPARED TO A STANDARD SIZE, HOW DOES THIS PRODUCT FIT?</label>
              <div className="flex bg-[#FCFAF7] p-1.5 rounded-2xl border border-[#F2EFEA] gap-1">
                <button
                  type="button"
                  onClick={() => setFitRecommendation("runs_small")}
                  className={`flex-1 py-3 flex flex-col sm:flex-row items-center justify-center gap-1.5 rounded-xl transition-all ${fitRecommendation === "runs_small" ? "bg-white shadow-sm border border-[#F2EFEA] text-slate-800" : "text-slate-400 hover:text-slate-600"}`}
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-black tracking-widest uppercase text-center leading-tight">RUNS<br/>SMALL</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFitRecommendation("true_to_size")}
                  className={`flex-1 py-3 flex flex-col sm:flex-row items-center justify-center gap-1.5 rounded-xl transition-all ${fitRecommendation === "true_to_size" ? "bg-white shadow-sm border border-[#F2EFEA] text-[#C89653]" : "text-slate-400 hover:text-slate-600"}`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-black tracking-widest uppercase text-center leading-tight text-slate-800">TRUE TO<br/>SIZE</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFitRecommendation("runs_large")}
                  className={`flex-1 py-3 flex flex-col sm:flex-row items-center justify-center gap-1.5 rounded-xl transition-all ${fitRecommendation === "runs_large" ? "bg-white shadow-sm border border-[#F2EFEA] text-slate-800" : "text-slate-400 hover:text-slate-600"}`}
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-black tracking-widest uppercase text-center leading-tight">RUNS<br/>LARGE</span>
                </button>
              </div>
              <span className="text-[9px] font-medium text-slate-500">Based on your experience helping customers choose sizes for this product.</span>
            </div>

            <div className="flex flex-col gap-2 mt-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-600">2. OVERALL FIT OF THE GARMENT</label>
              <div className="flex bg-[#FCFAF7] p-1.5 rounded-2xl border border-[#F2EFEA] gap-1">
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
                    className={`flex-1 py-3 text-[9px] font-black tracking-widest rounded-xl transition-all ${silhouette === opt.value ? "bg-white shadow-sm border border-[#F2EFEA] text-slate-800" : "text-slate-500 hover:text-slate-600"}`}
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
                <input type="text" value={specs.color} onChange={e => setSpecs({...specs, color: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-[13px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#C89653] shadow-sm" placeholder="e.g. White" />
              </div>
              
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-700">FABRIC CONTENT</label>
                <input type="text" value={specs.fabricContent} onChange={e => setSpecs({...specs, fabricContent: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-[13px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#C89653] shadow-sm" placeholder="e.g. 100% Cotton" />
              </div>
              
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-700">FABRIC DETAIL</label>
                <input type="text" value={specs.fabricDetail} onChange={e => setSpecs({...specs, fabricDetail: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-[13px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#C89653] shadow-sm" placeholder="e.g. Pure Cotton" />
              </div>
              
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-700">NECK TYPE</label>
                <input type="text" value={specs.neckType} onChange={e => setSpecs({...specs, neckType: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-[13px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#C89653] shadow-sm" placeholder="e.g. Mandarin Collar" />
              </div>
              
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-700">CLOSURE</label>
                <input type="text" value={specs.closure} onChange={e => setSpecs({...specs, closure: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-[13px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#C89653] shadow-sm" placeholder="e.g. Slip on" />
              </div>
              
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-700">SLEEVE</label>
                <input type="text" value={specs.sleeve} onChange={e => setSpecs({...specs, sleeve: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-[13px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#C89653] shadow-sm" placeholder="e.g. Three-Quarter" />
              </div>
              
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-700">SLEEVE STYLING</label>
                <input type="text" value={specs.sleeveStyling} onChange={e => setSpecs({...specs, sleeveStyling: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-[13px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#C89653] shadow-sm" placeholder="e.g. Regular" />
              </div>
              
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-700">SHAPE</label>
                <input type="text" value={specs.shape} onChange={e => setSpecs({...specs, shape: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-[13px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#C89653] shadow-sm" placeholder="e.g. Straight" />
              </div>
              
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-700">HEMLINE</label>
                <input type="text" value={specs.hemline} onChange={e => setSpecs({...specs, hemline: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-[13px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#C89653] shadow-sm" placeholder="e.g. Straight" />
              </div>
              
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-700">LENGTH</label>
                <input type="text" value={specs.length} onChange={e => setSpecs({...specs, length: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-[13px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#C89653] shadow-sm" placeholder="e.g. Calf Length" />
              </div>
              
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-700">PATTERN</label>
                <input type="text" value={specs.pattern} onChange={e => setSpecs({...specs, pattern: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-[13px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#C89653] shadow-sm" placeholder="e.g. Floral Print" />
              </div>
              
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-700">FABRIC FAMILY</label>
              <input type="text" value={specs.fabricFamily} onChange={e => setSpecs({...specs, fabricFamily: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-[13px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#C89653] shadow-sm" placeholder="e.g. Pure Cotton" />
              </div>

            </div>
          </div>
        )}

        {/* Footer Navigation */}
        <div className="mt-8 flex justify-between items-center pt-6 border-t border-slate-100">
          <div className="flex flex-col">
            {step === 2 && selectedSizes.length > 0 && (
              <span className="text-[10px] font-black tracking-widest uppercase text-slate-400">
                {selectedSizes.length} SIZES ACTIVE
              </span>
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
              className="px-8 py-3 bg-[#C89653] hover:bg-[#b08143] text-white rounded-2xl text-[12px] font-bold uppercase tracking-wider shadow-md transition-all active:scale-95 duration-150 flex items-center gap-2 disabled:opacity-50 select-none"
            >
              <span className="flex items-center gap-2 relative z-10">
                {submitting || uploadingImages ? "Saving..." : (
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
