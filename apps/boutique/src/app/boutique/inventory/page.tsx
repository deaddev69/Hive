"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import {
  Loader2,
  Search,
  Check,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";

export default function BoutiqueInventory() {
  const products = useQuery(api.products.getBoutiqueProducts);
  const orders = useQuery(api.orders.getBoutiqueOrders);
  const history = useQuery(api.products.getInventoryHistory, { paginationOpts: { numItems: 50, cursor: null } });

  const updateInventory = useMutation(api.products.updateInventory);
  const verifyProducts = useMutation(api.products.verifyProducts);
  const bulkRestock = useMutation(api.products.bulkRestock);

  // Local modified stock: productId -> size -> quantity
  const [localStock, setLocalStock] = useState<Record<string, Record<string, number>>>({});
  // Local custom sizes list per product: productId -> sizes[]
  const [localSizes, setLocalSizes] = useState<Record<string, string[]>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "attention" | "low" | "out">("all");
  const [expandedProductIds, setExpandedProductIds] = useState<Set<string>>(new Set());
  const [hasInitializedExpansion, setHasInitializedExpansion] = useState(false);
  const [saving, setSaving] = useState(false);

  // Size addition fields: productId -> { label, qty }
  const [addSizeFields, setAddSizeFields] = useState<Record<string, { label: string; qty: string }>>({});

  // Bulk Restock Modal state
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkRestockNotes, setBulkRestockNotes] = useState("");
  const [bulkRestockAdjustments, setBulkRestockAdjustments] = useState<Record<string, Record<string, string>>>({});

  // Button success states
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [verifySuccess, setVerifySuccess] = useState(false);

  // In-app custom toast overlay
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Sync state when products resolve, loading from localStorage draft if exists
  useEffect(() => {
    if (products) {
      const initialStockMap: Record<string, Record<string, number>> = {};
      const initialSizesMap: Record<string, string[]> = {};
      products.forEach((prod: any) => {
        initialStockMap[prod._id] = { ...prod.stockBySize };
        initialSizesMap[prod._id] = [...(prod.sizes || [])];
      });

      // Try to load draft from localStorage
      const draft = localStorage.getItem("hive_inventory_draft");
      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          const validatedDraft: Record<string, Record<string, number>> = { ...initialStockMap };
          Object.keys(parsed).forEach((prodId) => {
            if (initialStockMap[prodId]) {
              validatedDraft[prodId] = { ...initialStockMap[prodId], ...parsed[prodId] };
              // Ensure custom-added sizes in draft are loaded into localSizes map
              const draftSizes = Object.keys(parsed[prodId]);
              const mergedSizes = Array.from(new Set([...(initialSizesMap[prodId] || []), ...draftSizes]));
              initialSizesMap[prodId] = mergedSizes;
            }
          });
          setLocalStock(validatedDraft);
        } catch (e) {
          setLocalStock(initialStockMap);
        }
      } else {
        setLocalStock(initialStockMap);
      }
      setLocalSizes(initialSizesMap);
    }
  }, [products]);

  // Auto-expand any product row that has a size with low (<= 2) or out of stock (0) on initial load
  useEffect(() => {
    if (products && !hasInitializedExpansion) {
      const autoExpanded = new Set<string>();
      products.forEach((prod: any) => {
        const hasRisk = prod.sizes.some((sz: string) => {
          const stock = prod.stockBySize[sz] ?? 0;
          return stock <= 2;
        });
        if (hasRisk) {
          autoExpanded.add(prod._id);
        }
      });
      setExpandedProductIds(autoExpanded);
      setHasInitializedExpansion(true);
    }
  }, [products, hasInitializedExpansion]);

  const getChangedProducts = () => {
    if (!products) return [];
    return products.filter((prod: any) => {
      const localProdStock = localStock[prod._id];
      const localProdSizes = localSizes[prod._id];
      if (!localProdStock || !localProdSizes) return false;

      const sizesMismatch = localProdSizes.length !== prod.sizes.length ||
        localProdSizes.some((sz) => !prod.sizes.includes(sz));
      
      if (sizesMismatch) return true;

      return prod.sizes.some((sz: string) => (localProdStock[sz] ?? 0) !== (prod.stockBySize[sz] ?? 0));
    });
  };

  const changedProducts = useMemo(() => getChangedProducts(), [products, localStock, localSizes]);
  const isDirty = changedProducts.length > 0;

  useEffect(() => {
    if (isDirty && Object.keys(localStock).length > 0) {
      localStorage.setItem("hive_inventory_draft", JSON.stringify(localStock));
    } else if (!isDirty) {
      localStorage.removeItem("hive_inventory_draft");
    }
  }, [localStock, isDirty]);

  const handleStockChange = (productId: string, size: string, newValue: number) => {
    setLocalStock((prev) => {
      const copy = { ...prev };
      if (!copy[productId]) copy[productId] = {};
      copy[productId][size] = Math.max(0, newValue);
      return copy;
    });
  };

  const handleAddSizeChange = (productId: string, field: "label" | "qty", value: string) => {
    setAddSizeFields((prev) => ({
      ...prev,
      [productId]: {
        label: prev[productId]?.label ?? "",
        qty: prev[productId]?.qty ?? "0",
        [field]: value,
      },
    }));
  };

  const handleAddSizeSubmit = (productId: string) => {
    const fields = addSizeFields[productId];
    if (!fields || !fields.label.trim()) {
      showToast("Size label cannot be empty", "error");
      return;
    }
    const cleanLabel = fields.label.trim().toUpperCase();
    const initQty = parseInt(fields.qty) || 0;

    const currentProdSizes = localSizes[productId] || [];
    if (currentProdSizes.includes(cleanLabel)) {
      showToast(`Size ${cleanLabel} already exists`, "error");
      return;
    }

    setLocalSizes((prev) => ({
      ...prev,
      [productId]: [...(prev[productId] || []), cleanLabel],
    }));

    setLocalStock((prev) => ({
      ...prev,
      [productId]: {
        ...(prev[productId] || {}),
        [cleanLabel]: initQty,
      },
    }));

    setAddSizeFields((prev) => ({
      ...prev,
      [productId]: { label: "", qty: "0" },
    }));

    showToast(`Added size ${cleanLabel}`);
  };

  const handleSave = async () => {
    if (!products) return;
    setSaving(true);
    try {
      for (const prod of changedProducts) {
        const localProdStock = localStock[prod._id];
        if (localProdStock) {
          await updateInventory({
            productId: prod._id as any,
            stockBySize: localProdStock,
          });
        }
      }
      localStorage.removeItem("hive_inventory_draft");
      setSaveSuccess(true);
      showToast("Stock levels updated");
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err: any) {
      showToast("Failed to update inventory: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (!products) return;
    if (confirm("Discard all pending local changes?")) {
      const stockMap: Record<string, Record<string, number>> = {};
      const sizesMap: Record<string, string[]> = {};
      products.forEach((prod: any) => {
        stockMap[prod._id] = { ...prod.stockBySize };
        sizesMap[prod._id] = [...(prod.sizes || [])];
      });
      setLocalStock(stockMap);
      setLocalSizes(sizesMap);
      localStorage.removeItem("hive_inventory_draft");
    }
  };

  const handleBulkAdjustmentChange = (productId: string, size: string, value: string) => {
    setBulkRestockAdjustments((prev) => ({
      ...prev,
      [productId]: {
        ...(prev[productId] || {}),
        [size]: value,
      },
    }));
  };

  const handleBulkRestockSubmit = async () => {
    if (!products) return;
    setSaving(true);
    try {
      const items: any[] = [];
      Object.entries(bulkRestockAdjustments).forEach(([prodId, sizeAdjustments]) => {
        const adjustments: Record<string, number> = {};
        Object.entries(sizeAdjustments).forEach(([size, qtyStr]) => {
          const qty = parseInt(qtyStr) || 0;
          if (qty > 0) {
            adjustments[size] = qty;
          }
        });
        if (Object.keys(adjustments).length > 0) {
          items.push({ productId: prodId, adjustments });
        }
      });

      if (items.length === 0) {
        showToast("Please enter at least one positive quantity to restock", "error");
        setSaving(false);
        return;
      }

      await bulkRestock({
        items,
        notes: bulkRestockNotes.trim() || undefined,
      });

      setBulkRestockAdjustments({});
      setBulkRestockNotes("");
      setIsBulkModalOpen(false);
      showToast("Bulk restock completed");
    } catch (err: any) {
      showToast("Failed to bulk restock: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  // Helpers for timestamps & dates
  const isVerifiedToday = (prod: any) => {
    if (!prod.lastVerifiedAt) return false;
    const date = new Date(prod.lastVerifiedAt);
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const formatLastUpdatedTime = (prodList: any[]) => {
    const timestamps = prodList
      .map((p: any) => Math.max(p.lastVerifiedAt || 0, p.updatedAt || 0))
      .filter((t) => t > 0);
    if (timestamps.length === 0) return "Never";
    const maxTime = Math.max(...timestamps);
    const date = new Date(maxTime);
    const today = new Date();
    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
    
    if (isToday) {
      return `Today ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
    }
    return `Yesterday ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  };

  // Computations
  const stats = useMemo(() => {
    if (!products) return { lowStock: 0, outOfStock: 0, totalSkus: 0, verifiedToday: 0 };
    let lowStock = 0;
    let outOfStock = 0;
    let totalSkus = 0;
    let verifiedToday = 0;

    products.forEach((p: any) => {
      if (isVerifiedToday(p)) {
        verifiedToday++;
      }

      const localProdSizes = localSizes[p._id] ?? p.sizes ?? [];
      localProdSizes.forEach((sz: string) => {
        const stock = localStock[p._id]?.[sz] ?? p.stockBySize[sz] ?? 0;
        totalSkus++;
        if (stock === 0) {
          outOfStock++;
        } else if (stock <= 2) {
          lowStock++;
        }
      });
    });

    return { lowStock, outOfStock, totalSkus, verifiedToday };
  }, [products, localStock, localSizes]);

  // Determine if stock verification attestation is done for today (all items must be verified)
  const isStockVerifiedToday = useMemo(() => {
    if (!products || products.length === 0) return false;
    return products.every((prod: any) => isVerifiedToday(prod));
  }, [products]);

  // Calculate the verification timestamp to display in the header status
  const lastVerifiedTimeStr = useMemo(() => {
    if (!products || products.length === 0) return "";
    const timestamps = products.map((p: any) => p.lastVerifiedAt || 0).filter((t: any) => t > 0);
    if (timestamps.length === 0) return "";
    const maxTime = Math.max(...timestamps);
    const date = new Date(maxTime);
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }, [products]);

  const handleGlobalVerify = async () => {
    if (!products || products.length === 0) return;
    setSaving(true);
    try {
      const productIds = products.map((p: any) => p._id);
      await verifyProducts({
        productIds: productIds as any,
      });
      setVerifySuccess(true);
      showToast("Shelf check complete");
      setTimeout(() => setVerifySuccess(false), 2000);
    } catch (err: any) {
      showToast("Failed to verify stock: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleExpandProduct = (productId: string) => {
    setExpandedProductIds((prev) => {
      const copy = new Set(prev);
      if (copy.has(productId)) copy.delete(productId);
      else copy.add(productId);
      return copy;
    });
  };

  // Filtered products list
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter((prod: any) => {
      const matchesSearch =
        prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (prod.categoryName && prod.categoryName.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      let hasLowStock = false;
      let hasOutOfStock = false;
      const localProdSizes = localSizes[prod._id] ?? prod.sizes ?? [];
      localProdSizes.forEach((sz: string) => {
        const stock = localStock[prod._id]?.[sz] ?? prod.stockBySize[sz] ?? 0;
        if (stock === 0) hasOutOfStock = true;
        else if (stock <= 2) hasLowStock = true;
      });

      if (filterMode === "attention") return hasLowStock || hasOutOfStock;
      if (filterMode === "low") return hasLowStock;
      if (filterMode === "out") return hasOutOfStock;

      return true;
    });
  }, [products, localStock, localSizes, searchQuery, filterMode]);

  if (products === undefined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 bg-transparent">
        <Loader2 className="w-8 h-8 animate-spin text-[#C89653]" />
        <p className="text-xs text-slate-400 font-medium font-manrope">Loading...</p>
      </div>
    );
  }

  const getProductImage = (prod: any) => {
    if (!prod.images || prod.images.length === 0) return null;
    const first = prod.images[0];
    const url = typeof first === "object" ? first.url : first;
    if (url && (url.startsWith("http") || url.startsWith("/"))) {
      return url;
    }
    return null;
  };

  const hasAttentionAlerts = stats.outOfStock > 0 || stats.lowStock > 0;

  return (
    <div className="flex flex-col gap-4 text-left pb-36 max-w-2xl mx-auto px-4 font-manrope bg-transparent relative">
      
      {/* Branded Premium Toast Overlay (Frosted glass designer style) */}
      {toast && (
        <div className="fixed top-20 md:top-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3 px-5 py-3 rounded-full bg-[#FAF6F0]/95 backdrop-blur-md text-slate-800 shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-[#E6D5B8] select-none">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${
              toast.type === "error" 
                ? "bg-red-50 border-red-200 text-red-500" 
                : "bg-emerald-50 border-emerald-200 text-emerald-600"
            }`}>
              {toast.type === "error" ? (
                <X className="w-3 h-3 stroke-[3]" />
              ) : (
                <Check className="w-3 h-3 stroke-[3]" />
              )}
            </div>
            <span className="text-[11px] font-bold tracking-wider uppercase text-slate-700 font-sans">
              {toast.message}
            </span>
          </div>
        </div>
      )}

      {/* Brand-Aligned Title Section */}
      <div className="flex items-end justify-between border-b border-[#E6D5B8]/30 pb-3 pt-3">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight text-[#1A1D1D] font-manrope leading-none">
            Stock Operations
          </h1>
          <p className="text-[11px] text-slate-400 mt-2 font-medium font-manrope">
            Last checked {formatLastUpdatedTime(products)} • {stats.verifiedToday} of {products.length} products confirmed
          </p>
        </div>

        <div className="flex items-center gap-2.5 font-manrope">
          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="bg-white border border-[#C89653]/40 text-[#C89653] hover:bg-[#C89653]/5 px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all select-none active:scale-95 shadow-sm font-manrope"
          >
            Bulk Restock
          </button>

          {isStockVerifiedToday ? (
            <span className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 select-none font-manrope">
              <Check className="w-3.5 h-3.5 text-[#C89653] stroke-[3]" />
              Shelf check complete {lastVerifiedTimeStr && `• ${lastVerifiedTimeStr}`}
            </span>
          ) : (
            <button
              onClick={handleGlobalVerify}
              disabled={saving || verifySuccess}
              className={`bg-white border border-[#C89653]/40 text-[#C89653] hover:bg-[#C89653]/5 px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all select-none active:scale-95 shadow-sm font-manrope`}
            >
              {saving ? "VERIFYING..." : verifySuccess ? "✓ VERIFIED" : "CONFIRM SHELF"}
            </button>
          )}
        </div>
      </div>

      {/* Needs Attention Warning Bar */}
      {hasAttentionAlerts && (
        <div className="flex items-center justify-between text-xs py-1.5 border-b border-[#E6D5B8]/20 font-manrope">
          <div className="flex items-center gap-2 text-slate-600 font-medium">
            <span className="inline-flex items-center gap-1.5 text-[#D93025] font-semibold text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D93025] animate-pulse" /> 
              {stats.outOfStock + stats.lowStock} SKUs need attention
            </span>
          </div>
          {/* Action chip: FILTER */}
          <button
            onClick={() => setFilterMode(filterMode === "attention" ? "all" : "attention")}
            className="bg-[#FAF9F5] border border-[#C89653]/40 text-[#C89653] hover:bg-[#C89653]/5 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all select-none"
          >
            {filterMode === "attention" ? "SHOW ALL" : "FILTER"}
          </button>
        </div>
      )}

      {/* Search & Filters Segment Control */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-[9px] w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search catalog..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-[#E6D5B8]/30 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#C89653] font-manrope text-slate-800 placeholder:text-slate-400"
          />
        </div>

        <div className="flex bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold shrink-0">
          {[
            { id: "all", label: "ALL" },
            { id: "attention", label: "LOW/OUT" }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setFilterMode(t.id as any)}
              className={`px-2.5 py-1 rounded-md transition-all select-none ${
                filterMode === t.id ? "bg-white text-[#1A1D1D] shadow-sm" : "text-slate-500"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Product List */}
      <div className="flex flex-col border-t border-[#E6D5B8]/20 divide-y divide-slate-100 mt-1">
        {filteredProducts.map((prod: any) => {
          const isExpanded = expandedProductIds.has(prod._id);
          const localProdSizes = localSizes[prod._id] ?? prod.sizes ?? [];
          const hasUnsavedChanges = products && localStock[prod._id] && 
            localProdSizes.some((sz: string) => (localStock[prod._id]?.[sz] ?? 0) !== (prod.stockBySize[sz] ?? 0));

          // First size inline
          const firstSize = localProdSizes[0];
          const firstStock = firstSize ? (localStock[prod._id]?.[firstSize] ?? prod.stockBySize[firstSize] ?? 0) : 0;
          const isFirstOut = firstStock === 0;
          const isFirstLow = firstStock > 0 && firstStock <= 2;

          // Check if product has any size with stock <= 2
          const hasAnyRiskSize = localProdSizes.some((sz: string) => {
            const stock = localStock[prod._id]?.[sz] ?? prod.stockBySize[sz] ?? 0;
            return stock <= 2;
          });

          return (
            <div 
              key={prod._id} 
              className={`py-1.5 transition-all ${
                isExpanded ? "bg-[#FAF9F5]/40 rounded-xl px-2.5 -mx-2.5 mt-1 pb-3" : ""
              }`}
            >
              {/* Product Core Row */}
              <div className="flex items-center gap-3 py-1.5 h-[62px]">
                {/* Thumbnail Image / Monogram Placeholder */}
                <div className="w-8 h-10 shrink-0 bg-[#FAF9F5] rounded overflow-hidden relative border border-[#E6D5B8]/30 flex items-center justify-center">
                  {getProductImage(prod) ? (
                    <img src={getProductImage(prod) || ""} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[#C89653] font-bold text-xs font-serif leading-none select-none">
                      {prod.name ? prod.name.charAt(0).toUpperCase() : "H"}
                    </span>
                  )}
                </div>

                {/* Title and Metadata */}
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="text-[15px] font-bold text-[#1A1D1D] uppercase tracking-tight whitespace-normal break-words line-clamp-2 leading-tight font-manrope">
                      {prod.name}
                    </h3>
                    {hasUnsavedChanges && (
                      <span className="bg-[#FAF9F5] border border-[#C89653]/30 text-[#C89653] text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider leading-none select-none">
                        Edited
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-manrope mt-1 leading-none">
                    <span className="font-semibold">{prod.categoryName}</span>
                  </div>
                </div>

                {/* First Size controls inline */}
                {firstSize && (
                  <div className="flex items-center rounded-lg p-0.5 shrink-0 bg-[#FAF9F5] border border-[#E6D5B8]/20">
                    <span className={`px-2 text-[10px] font-bold uppercase select-none ${isFirstOut ? "text-[#D93025]" : isFirstLow ? "text-[#E68A00]" : "text-slate-500"}`}>
                      {firstSize}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleStockChange(prod._id, firstSize, firstStock - 1)}
                      className="w-7 h-7 rounded hover:bg-white text-slate-500 hover:text-slate-800 flex items-center justify-center font-bold text-xs active:scale-90"
                    >
                      -
                    </button>
                    <span className={`w-6 text-center font-mono font-bold text-[13px] select-all leading-none ${isFirstOut ? "text-[#D93025]" : isFirstLow ? "text-[#E68A00]" : "text-slate-800"}`}>
                      {firstStock}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleStockChange(prod._id, firstSize, firstStock + 1)}
                      className="w-7 h-7 rounded hover:bg-white text-slate-500 hover:text-slate-800 flex items-center justify-center font-bold text-xs active:scale-90"
                    >
                      +
                    </button>
                  </div>
                )}

                {/* Trailing Chevron Column (Always visible for size addition) */}
                <button
                  onClick={() => toggleExpandProduct(prod._id)}
                  className={`p-1.5 shrink-0 transition-all active:scale-95 ${
                    hasAnyRiskSize 
                      ? "text-[#E68A00] hover:text-[#b08143]" 
                      : "text-slate-400 hover:text-[#1A1D1D]"
                  }`}
                >
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>

              {/* Visually grouped child size list and add size options */}
              {isExpanded && (
                <div className="mt-1 ml-11 pl-3 border-l-2 border-[#C89653]/30 space-y-2.5 animate-in fade-in duration-100">
                  {localProdSizes.slice(1).map((sz: string) => {
                    const stock = localStock[prod._id]?.[sz] ?? prod.stockBySize[sz] ?? 0;
                    const isOut = stock === 0;
                    const isLow = stock > 0 && stock <= 2;

                    return (
                      <div key={sz} className="flex items-center justify-between py-1 pr-1.5">
                        {/* Left Column: size label */}
                        <span className="text-[12px] font-bold text-slate-500 font-manrope select-none">
                          Size {sz}
                        </span>
                        
                        {/* Right Column: stepper pill */}
                        <div className="flex items-center rounded-lg p-0.5 bg-white border border-[#E6D5B8]/20 shrink-0">
                          <span className={`px-2 text-[10px] font-bold uppercase select-none ${isOut ? "text-[#D93025]" : isLow ? "text-[#E68A00]" : "text-slate-500"}`}>
                            {sz}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleStockChange(prod._id, sz, stock - 1)}
                            className="w-7 h-7 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center font-bold text-xs active:scale-90"
                          >
                            -
                          </button>
                          <span className={`w-6 text-center font-mono font-bold text-[13px] select-all leading-none ${isOut ? "text-[#D93025]" : isLow ? "text-[#E68A00]" : "text-slate-800"}`}>
                            {stock}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleStockChange(prod._id, sz, stock + 1)}
                            className="w-7 h-7 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center font-bold text-xs active:scale-90"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Inline Form to Add a Size */}
                  <div className="flex items-center gap-2 pt-2 border-t border-[#E6D5B8]/20 mt-1 flex-wrap">
                    <input
                      type="text"
                      placeholder="Add Size (e.g. XL)"
                      value={addSizeFields[prod._id]?.label || ""}
                      onChange={(e) => handleAddSizeChange(prod._id, "label", e.target.value)}
                      className="flex-1 min-w-[120px] px-2.5 py-1.5 bg-white border border-[#E6D5B8]/30 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#C89653] font-manrope text-slate-800 placeholder:text-slate-400"
                    />
                    <div className="flex items-center rounded-lg bg-white border border-[#E6D5B8]/20">
                      <span className="px-2 text-[10px] font-bold uppercase text-slate-400 select-none">Qty</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={addSizeFields[prod._id]?.qty || "0"}
                        onChange={(e) => handleAddSizeChange(prod._id, "qty", e.target.value)}
                        className="w-12 text-center font-mono font-bold text-xs bg-transparent border-0 focus:outline-none focus:ring-0 text-slate-800"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddSizeSubmit(prod._id)}
                      className="bg-[#C89653] hover:bg-[#b08143] text-white px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all select-none active:scale-95 shadow-sm"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredProducts.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl border border-slate-100 shadow-sm flex flex-col items-center justify-center mt-3">
            <span className="text-2xl mb-2 select-none">🎉</span>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-700 mb-1">Everything looks good</h3>
            <p className="text-[10px] text-slate-400 max-w-[200px] leading-relaxed">
              No products require attention under the current filter selection. All stock levels are healthy!
            </p>
          </div>
        )}
      </div>

      {/* Floating Save/Discard edits action bar */}
      {isDirty && (
        <div className="fixed bottom-16 md:bottom-0 md:left-64 left-0 right-0 bg-white border-t border-[#E6D5B8]/30 px-4 py-3 flex items-center justify-between z-50 h-[56px] shadow-[0_-4px_12px_rgba(0,0,0,0.03)] font-manrope animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Premium Count chip */}
          <span className="bg-[#FAF9F5] border border-[#E6D5B8]/40 text-[#C89653] rounded-lg px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider font-mono">
            {changedProducts.length} Product{changedProducts.length > 1 ? "s" : ""} Updated
          </span>
          <div className="flex items-center gap-3">
            {/* Action chip: DISCARD */}
            <button
              onClick={handleDiscard}
              disabled={saving}
              className="bg-white border border-slate-200 text-slate-500 hover:text-[#1A1D1D] px-2.5 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all select-none font-manrope"
            >
              DISCARD
            </button>
            {/* Action chip: SAVE */}
            <button
              onClick={handleSave}
              disabled={saving || saveSuccess}
              className={`px-3.5 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all shadow-sm active:scale-95 font-manrope ${
                saveSuccess
                  ? "bg-[#FAF9F5] border border-[#E6D5B8]/30 text-[#0F9D58]"
                  : "bg-[#C89653] hover:bg-[#b08143] text-white"
              }`}
            >
              {saving ? "SAVING..." : saveSuccess ? "✓ Saved" : "SAVE CHANGES"}
            </button>
          </div>
        </div>
      )}

      {/* Bulk Restock Modal Overlay */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#C89653]/30 shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 font-manrope">
            {/* Header */}
            <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-800 font-manrope uppercase tracking-tight">Bulk Restock</h2>
                <p className="text-[10px] text-slate-400 font-medium font-manrope mt-1">Specify restocking quantities to add to current stock levels</p>
              </div>
              <button 
                onClick={() => setIsBulkModalOpen(false)} 
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-all active:scale-90"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Products List */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {products.map((prod: any) => {
                const localProdSizes = localSizes[prod._id] ?? prod.sizes ?? [];
                
                return (
                  <div key={prod._id} className="p-3 bg-slate-50/50 border border-slate-100 rounded-2xl flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      {/* Image Thumbnail */}
                      <div className="w-8 h-10 shrink-0 bg-white border border-[#E6D5B8]/20 rounded overflow-hidden flex items-center justify-center relative">
                        {getProductImage(prod) ? (
                          <img src={getProductImage(prod) || ""} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[#C89653] font-bold text-xs font-serif leading-none">
                            {prod.name ? prod.name.charAt(0).toUpperCase() : "H"}
                          </span>
                        )}
                      </div>
                      
                      {/* Product Name */}
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-tight line-clamp-1 leading-tight">
                          {prod.name}
                        </h4>
                        <p className="text-[9px] text-slate-400 uppercase font-semibold leading-none mt-1">
                          {prod.categoryName}
                        </p>
                      </div>
                    </div>

                    {/* Size Adjustments inputs */}
                    <div className="grid grid-cols-2 gap-2 mt-0.5">
                      {localProdSizes.map((sz: string) => {
                        const currentStock = localStock[prod._id]?.[sz] ?? prod.stockBySize[sz] ?? 0;
                        const restockVal = bulkRestockAdjustments[prod._id]?.[sz] || "";
                        
                        return (
                          <div key={sz} className="flex items-center justify-between bg-white border border-slate-200/60 rounded-xl px-2.5 py-1">
                            <div className="flex flex-col text-left">
                              <span className="text-[10px] font-bold text-slate-600 font-manrope">Size {sz}</span>
                              <span className="text-[8px] text-slate-400 font-semibold mt-0.5">Stock: {currentStock}</span>
                            </div>
                            <input
                              type="number"
                              min="0"
                              placeholder="+0"
                              value={restockVal}
                              onChange={(e) => handleBulkAdjustmentChange(prod._id, sz, e.target.value)}
                              className="w-12 px-1.5 py-1 text-center font-mono font-bold text-xs border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#C89653] rounded-lg text-slate-800"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer with Notes & Action buttons */}
            <div className="p-6 border-t border-slate-100 flex flex-col gap-4 bg-white shrink-0">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-manrope">Restock Notes</label>
                <textarea
                  rows={2}
                  placeholder="Optional notes (e.g. Received shipment from warehouse)"
                  value={bulkRestockNotes}
                  onChange={(e) => setBulkRestockNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#C89653] rounded-xl text-slate-800 placeholder:text-slate-400 font-manrope resize-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsBulkModalOpen(false)}
                  disabled={saving}
                  className="flex-1 bg-white border border-slate-200 text-slate-500 hover:text-slate-800 py-3 rounded-2xl text-[10px] font-extrabold uppercase tracking-wider transition-all select-none active:scale-95 font-manrope"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkRestockSubmit}
                  disabled={saving}
                  className="flex-1 bg-[#C89653] hover:bg-[#b08143] text-white py-3 rounded-2xl text-[10px] font-extrabold uppercase tracking-wider transition-all select-none active:scale-95 shadow-md flex items-center justify-center gap-2 font-manrope"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Submit Restock"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
