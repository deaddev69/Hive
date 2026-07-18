"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Button, Card, CardContent } from "@hive/ui";
import { Plus, Edit3, Trash2, Loader2, Upload, Search, Image as ImageIcon, ChevronDown } from "lucide-react";
import CreateProductModal from "./CreateProductModal";

const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL", "Free"];

function CategoryFilterSelect({
  value,
  onChange,
  categories,
}: {
  value: string;
  onChange: (val: string) => void;
  categories: any[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const activeCategory = categories.find((c) => c._id === value);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full sm:w-48 font-sans" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white border border-[#E6D5B8]/30 px-4 py-3 rounded-2xl text-[12px] font-bold uppercase tracking-wider text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#C89653] shadow-sm flex items-center justify-between cursor-pointer select-none"
      >
        <span>{activeCategory ? activeCategory.name.toUpperCase() : "ALL CATEGORIES"}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-[102%] bg-white border border-[#E6D5B8]/30 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto py-1 animate-in fade-in slide-in-from-top-1">
          <button
            type="button"
            onClick={() => {
              onChange("all");
              setIsOpen(false);
            }}
            className={`w-full px-4 py-2.5 text-[12px] font-bold text-left hover:bg-slate-50 transition-colors uppercase tracking-wider ${
              value === "all" ? "bg-[#C89653]/10 text-[#C89653]" : "text-slate-700"
            }`}
          >
            ALL CATEGORIES
          </button>
          {categories.map((c) => (
            <button
              key={c._id}
              type="button"
              onClick={() => {
                onChange(c._id);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-2.5 text-[12px] font-bold text-left hover:bg-slate-50 transition-colors uppercase tracking-wider ${
                value === c._id ? "bg-[#C89653]/10 text-[#C89653]" : "text-slate-700"
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

export default function BoutiqueProducts() {
  const products = useQuery(api.products.getBoutiqueProducts);
  const categories = useQuery(api.categories.getCategories, { onlyActive: true });
  
  const deleteProduct = useMutation(api.products.deleteProduct);
  const toggleProductStatus = useMutation(api.products.toggleProductStatus);

  // Listing controls
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "live" | "pending" | "draft" | "low" | "missing_images">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const [isOpen, setIsOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [showMoreActions, setShowMoreActions] = useState(false);

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setIsOpen(true);
  };

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to permanently delete this product? All image files will be cleaned from storage.")) {
      try {
        await deleteProduct({ id: id as any });
      } catch (err: any) {
        alert("Failed to delete product: " + err.message);
      }
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await toggleProductStatus({ id: id as any, active: !currentStatus });
    } catch (err: any) {
      alert("Failed to change status: " + err.message);
    }
  };

  // Computations of metrics
  const stats = useMemo(() => {
    if (!products) return { all: 0, live: 0, pending: 0, draft: 0, low: 0, missingImages: 0 };
    let live = 0;
    let pending = 0;
    let draft = 0;
    let low = 0;
    let missingImages = 0;

    products.forEach((p: any) => {
      const isApproved = p.approvalStatus === "approved" || !p.approvalStatus;
      const isPending = p.approvalStatus === "pending";

      if (!p.active) {
        draft++;
      } else if (isApproved) {
        live++;
      } else if (isPending) {
        pending++;
      }

      const hasLowStock = Object.values(p.stockBySize).some((qty: any) => qty <= 2);
      if (hasLowStock) {
        low++;
      }

      if (!p.images || p.images.length === 0) {
        missingImages++;
      }
    });

    return { all: products.length, live, pending, draft, low, missingImages };
  }, [products]);

  // Filter listings
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter((prod: any) => {
      const matchesSearch = prod.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        prod.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === "all" || prod.categoryId === filterCategory;
      if (!matchesSearch || !matchesCategory) return false;

      const isApproved = prod.approvalStatus === "approved" || !prod.approvalStatus;
      const isPending = prod.approvalStatus === "pending";

      if (statusFilter === "live") return prod.active && isApproved;
      if (statusFilter === "pending") return prod.active && isPending;
      if (statusFilter === "draft") return !prod.active;
      if (statusFilter === "low") return Object.values(prod.stockBySize).some((qty: any) => qty <= 2);
      if (statusFilter === "missing_images") return !prod.images || prod.images.length === 0;

      return true;
    });
  }, [products, searchTerm, filterCategory, statusFilter]);

  // Paginated listings
  const totalPages = Math.ceil(filteredProducts.length / PAGE_SIZE);
  const paginatedProducts = useMemo(() => {
    return filteredProducts.slice(
      (currentPage - 1) * PAGE_SIZE,
      currentPage * PAGE_SIZE
    );
  }, [filteredProducts, currentPage]);

  if (products === undefined || categories === undefined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 bg-transparent font-sans">
        <Loader2 className="w-8 h-8 animate-spin text-hive-amber" />
        <p className="text-sm text-hive-text-muted font-medium">Loading products catalog...</p>
      </div>
    );
  }

  // Elegant client-side URL validation with console warning logs for bad references
  const getProductImage = (prod: any) => {
    if (!prod.images || prod.images.length === 0) return null;
    const first = prod.images[0];
    const url = typeof first === "object" ? first.url : first;
    if (url && (url.startsWith("http") || url.startsWith("/"))) {
      return url;
    }
    if (url && url.length > 0) {
      console.warn(
        `[Hive Product Catalog Warning] Product "${prod.name}" (${prod._id}) has an invalid or unresolved image source:`,
        first
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col gap-5 text-left h-full min-h-[calc(100vh-64px)] overflow-x-hidden bg-transparent -m-4 md:-m-10 p-4 md:p-10 font-sans">
      <div className="max-w-4xl mx-auto w-full flex flex-col gap-6 pt-2 pb-12">
        
        {/* Header Section (#10) */}
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-serif font-black text-[#2C261E] tracking-tight">Products</h1>
          <p className="text-sm font-medium text-[#8C806D]">
            Manage products, pricing and stocks.
          </p>
        </div>

        {/* Dashboard Bar + Attention Banner (#1, #11, & 'The biggest thing missing') */}
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-4 bg-[#FFFCF8] border border-[#EBE3D5]/80 rounded-2xl p-4 shadow-[0_4px_20px_-4px_rgba(168,154,126,0.08)]">
            <div className="flex flex-col items-center sm:items-start px-2 border-r border-[#EBE3D5]/60">
              <span className="text-[11px] font-semibold text-[#8C806D] uppercase tracking-wider">Total</span>
              <span className="text-xl sm:text-2xl font-black text-[#2C261E] font-mono leading-tight">{stats.all}</span>
            </div>
            <div className="flex flex-col items-center sm:items-start px-3 sm:px-4 border-r border-[#EBE3D5]/60">
              <span className="text-[11px] font-semibold text-[#8C806D] uppercase tracking-wider">Live</span>
              <span className="text-xl sm:text-2xl font-black text-[#10B981] font-mono leading-tight">{stats.live}</span>
            </div>
            <div className="flex flex-col items-center sm:items-start px-3 sm:px-4 border-r border-[#EBE3D5]/60">
              <span className="text-[11px] font-semibold text-[#8C806D] uppercase tracking-wider">Low Stock</span>
              <span className="text-xl sm:text-2xl font-black text-[#C89653] font-mono leading-tight">{stats.low}</span>
            </div>
            <div className="flex flex-col items-center sm:items-start px-2 sm:px-4">
              <span className="text-[11px] font-semibold text-[#8C806D] uppercase tracking-wider">Drafts</span>
              <span className="text-xl sm:text-2xl font-black text-[#7A6F5D] font-mono leading-tight">{stats.draft}</span>
            </div>
          </div>

          {(stats.low > 0 || stats.missingImages > 0) && (
            <div className="bg-[#FAF6F0] border border-[#C89653]/40 rounded-xl px-4 py-3 flex items-center justify-between text-[12px] text-[#2C261E] shadow-2xs select-none">
              <span className="flex items-center gap-2 font-semibold">
                <span className="text-[#C89653] font-bold">⚠</span>
                <span>
                  {stats.low + stats.missingImages} {stats.low + stats.missingImages === 1 ? "product needs" : "products need"} attention ({stats.low} low stock, {stats.missingImages} missing images)
                </span>
              </span>
              <button
                onClick={() => { setStatusFilter(stats.low > 0 ? "low" : "missing_images"); setCurrentPage(1); }}
                className="text-[#C89653] font-bold hover:underline tracking-wide uppercase text-[11px] shrink-0 ml-2 cursor-pointer"
              >
                View →
              </button>
            </div>
          )}
        </div>

        {/* Streamlined Tabs (#2) */}
        <div className="flex border-b border-[#EBE3D5] gap-6 text-[13px] font-bold font-sans mt-1 select-none overflow-x-auto no-scrollbar">
          {[
            { id: "all", label: "All", count: null },
            { id: "live", label: "Live", count: null },
            { id: "draft", label: "Drafts", count: stats.draft > 0 ? stats.draft : null },
            { id: "pending", label: "Review", count: stats.pending > 0 ? stats.pending : null, isAlert: stats.pending > 0 },
            { id: "low", label: "Low Stock", count: stats.low > 0 ? stats.low : null, isAlert: stats.low > 0 },
          ].map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setStatusFilter(tab.id as any); setCurrentPage(1); }}
                className={`pb-3 border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  isActive 
                    ? "border-[#C89653] text-[#2C261E]" 
                    : "border-transparent text-[#8C806D] hover:text-[#2C261E]"
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== null && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold leading-none ${
                    tab.isAlert ? "bg-rose-50 text-rose-600 border border-rose-200/50" : "bg-[#FAF6F0] text-[#7A6F5D] border border-[#EBE3D5]"
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search Input, Categories & Action Buttons (#3, #4, #12) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-1">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C806D] stroke-[1.75]" />
              <input
                type="text"
                placeholder="Search by product name"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-2.5 bg-[#FFFCF8] border border-[#EBE3D5] rounded-xl text-[13px] font-medium focus:outline-none focus:border-[#C89653] focus:ring-1 focus:ring-[#C89653] shadow-2xs placeholder:text-[#8C806D] text-[#2C261E] font-sans"
              />
            </div>
            
            <CategoryFilterSelect
              value={filterCategory}
              onChange={setFilterCategory}
              categories={categories}
            />
          </div>

          {/* Action Buttons (#4) */}
          <div className="flex items-center gap-2.5 shrink-0 relative">
            <button 
              onClick={handleOpenCreate}
              className="px-5 py-2.5 bg-[#C89653] hover:bg-[#B88643] active:bg-[#A67533] text-white font-extrabold text-[13px] rounded-xl shadow-[0_4px_14px_-3px_rgba(200,150,83,0.35)] flex items-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" /> Add Product
            </button>
            
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMoreActions(!showMoreActions)}
                className="px-3.5 py-2.5 bg-[#FFFCF8] hover:bg-[#FAF6F0] border border-[#EBE3D5] text-[#7A6F5D] font-bold text-[13px] rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-2xs select-none"
              >
                <span>⋯</span> More
              </button>
              
              {showMoreActions && (
                <div className="absolute right-0 top-[110%] bg-[#FFFCF8] border border-[#EBE3D5] rounded-xl shadow-lg z-50 w-44 py-1.5 animate-in fade-in slide-in-from-top-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreActions(false);
                      alert("Bulk upload / CSV import: Select your catalog file to ingest.");
                    }}
                    className="w-full px-4 py-2 text-[12px] font-bold text-left text-[#5C5346] hover:bg-[#FAF6F0] hover:text-[#2C261E] transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#8C806D] stroke-[1.75]" /> Bulk upload CSV
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Listings Grid (#6, #7, #9, Quick Actions) */}
        <div className="flex flex-col gap-3 mt-2">
          {paginatedProducts.length === 0 ? (
            <div className="text-center py-16 bg-[#FFFCF8] rounded-3xl border border-[#EBE3D5]/80 shadow-2xs flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-[#FAF6F0] rounded-full flex items-center justify-center mb-4 border border-[#EBE3D5]">
                <Search className="w-6 h-6 text-[#8C806D] stroke-[1.5]" />
              </div>
              <h3 className="text-base font-serif font-black text-[#2C261E] mb-1">No products found</h3>
              <p className="text-[13px] text-[#7A6F5D] max-w-xs leading-relaxed">
                Adjust your filters or click Add Product to build your catalog.
              </p>
            </div>
          ) : (
            paginatedProducts.map((prod: any) => {
              const isApproved = prod.approvalStatus === "approved" || !prod.approvalStatus;
              const isPending = prod.approvalStatus === "pending";
              const isChangesRequested = prod.approvalStatus === "changes_requested";

              const totalStock = Object.values(prod.stockBySize || {}).reduce((a: any, b: any) => a + (b || 0), 0) as number;

              return (
                <div 
                  key={prod._id} 
                  onClick={() => handleEdit(prod)}
                  className="p-4 sm:p-5 bg-[#FFFCF8] border border-[#EBE3D5]/80 shadow-[0_4px_20px_-4px_rgba(168,154,126,0.08)] rounded-2xl hover:shadow-[0_8px_24px_-4px_rgba(168,154,126,0.14)] transition-all cursor-pointer flex flex-col sm:flex-row gap-4 sm:items-center select-none"
                >
                  {/* Thumbnail Image (Restrained 56x56px POS Sizing) */}
                  <div className="w-[56px] h-[56px] shrink-0 bg-[#FAF6F0] rounded-[14px] overflow-hidden relative border border-[#EBE3D5] flex items-center justify-center shadow-2xs">
                    {getProductImage(prod) ? (
                      <img src={getProductImage(prod) || ""} alt={prod.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[#C89653] font-bold text-base font-serif leading-none select-none">
                        {prod.name ? prod.name.charAt(0).toUpperCase() : "H"}
                      </span>
                    )}
                    {!prod.active && (
                      <div className="absolute inset-0 bg-[#FFFCF8]/50 backdrop-blur-[1px]" />
                    )}
                  </div>

                  {/* Info (#7, #9) */}
                  <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0 font-sans">
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-[17px] font-extrabold text-[#2C261E] tracking-[-0.02em] truncate leading-tight">
                          {prod.name}
                        </h3>
                        {/* Live / Status Badge (#6) */}
                        {!prod.active ? (
                          <span className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#FAF6F0] text-[#7A6F5D] border border-[#EBE3D5]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#8C806D]" /> Draft
                          </span>
                        ) : isApproved ? (
                          <span className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#FAF6F0] text-[#2C261E] border border-[#EBE3D5]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" /> Live
                          </span>
                        ) : isPending ? (
                          <span className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#FAF6F0] text-[#B88643] border border-[#C89653]/40">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#C89653] animate-pulse" /> Review
                          </span>
                        ) : isChangesRequested ? (
                          <span className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" /> Changes req
                          </span>
                        ) : (
                          <span className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#FAF6F0] text-[#7A6F5D] border border-[#EBE3D5]">
                            Draft
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 text-[13px] font-sans mt-1 text-[#7A6F5D]">
                        <span className="font-bold text-[#2C261E] font-mono">₹{(prod.basePrice || prod.price).toLocaleString("en-IN")}</span>
                        <span className="w-1 h-1 rounded-full bg-[#EBE3D5]" />
                        <span className="font-medium text-[#8C806D] truncate max-w-[140px]">
                          {categories?.find((c: any) => c._id === prod.categoryId)?.name || "Boutique Item"}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-[#EBE3D5]" />
                        <span className="font-bold text-[#2C261E]">
                          {totalStock}{" "}
                          <span className="font-medium text-[#8C806D]">in stock</span>
                        </span>
                      </div>
                    </div>

                    {/* Quick Action Buttons ('One feature I would definitely add') */}
                    <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#EBE3D5]/60 justify-end sm:justify-start">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEdit(prod); }}
                        className="px-3 py-1.5 bg-[#FAF6F0] hover:bg-[#F3ECE1] border border-[#EBE3D5] rounded-xl text-[12px] font-bold text-[#2C261E] transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-[#8C806D] stroke-[1.75]" /> Edit
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEdit(prod); }}
                        className="px-3 py-1.5 bg-[#FAF6F0] hover:bg-[#F3ECE1] border border-[#EBE3D5] rounded-xl text-[12px] font-bold text-[#2C261E] transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <span>📦</span> Stock
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(prod._id); }}
                        className="p-1.5 bg-transparent hover:bg-rose-50 text-[#8C806D] hover:text-rose-600 rounded-xl transition-all cursor-pointer"
                        title="Delete Product"
                      >
                        <Trash2 className="w-4 h-4 stroke-[1.75]" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-6 font-sans">
            <Button
              variant="outline"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="rounded-xl border-slate-200 font-bold text-[11px] uppercase tracking-widest text-slate-600"
            >
              PREVIOUS
            </Button>
            <span className="text-xs font-bold text-slate-500 font-mono">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-xl border-slate-200 font-bold text-[11px] uppercase tracking-widest text-slate-600"
            >
              NEXT
            </Button>
          </div>
        )}

      </div>

      {isOpen && (
        <CreateProductModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          productToEdit={editingProduct}
          categories={categories}
        />
      )}
    </div>
  );
}
