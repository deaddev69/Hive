"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Button, Card, CardContent, AnimatedBackground, LoadingState } from "@hive/ui";
import { Plus, Edit3, Trash2, Loader2, Upload, Search, Image as ImageIcon, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";

const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL", "Free"];

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
    <div className="relative w-[130px] sm:w-44 shrink-0 font-sans" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white border border-[#f1f5f9] px-3.5 py-2.5 rounded-[16px] text-[13px] font-bold text-[#0f172a] focus:outline-none focus:border-[#F5C22B] focus:ring-1 focus:ring-[#F5C22B] shadow-2xs flex items-center justify-between cursor-pointer select-none transition-colors"
      >
        <span className="truncate pr-1">{activeCategory ? activeCategory.name : "All Categories"}</span>
        <ChevronDown className={`w-4 h-4 text-[#64748b] transition-transform duration-200 shrink-0 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-[106%] bg-[#ffffff] border border-[#f1f5f9] rounded-[16px] shadow-lg z-50 max-h-48 overflow-y-auto py-1 animate-in fade-in slide-in-from-top-1">
          <button
            type="button"
            onClick={() => {
              onChange("all");
              setIsOpen(false);
            }}
            className={`w-full px-4 py-2.5 text-[13px] font-bold text-left hover:bg-slate-50 transition-colors ${
              value === "all" ? "text-[#D9A71E]" : "text-[#0f172a]"
            }`}
          >
            All Categories
          </button>
          {categories.map((c) => (
            <button
              key={c._id}
              type="button"
              onClick={() => {
                onChange(c._id);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-2.5 text-[13px] font-bold text-left hover:bg-slate-50 transition-colors truncate ${
                value === c._id ? "text-[#D9A71E]" : "text-[#0f172a]"
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
  const router = useRouter();
  const products = useQuery(api.products.getBoutiqueProducts);
  const categories = useQuery(api.categories.getCategories, { onlyActive: true });

  const filteredCategories = useMemo(() => {
    if (!categories) return [];
    
    return categories.map((c: any) => {
      let cleanName = c.name;
      // Auto-correct typo from legacy DB entries if present
      if (cleanName.toLowerCase() === "ethnic wer") {
        cleanName = "Ethnic Wear";
      }
      return { ...c, name: cleanName };
    });
  }, [categories]);
  
  const deleteProduct = useMutation(api.products.deleteProduct);
  const toggleProductStatus = useMutation(api.products.toggleProductStatus);

  // Listing controls
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "live" | "pending" | "draft" | "low" | "missing_images">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const [showMoreActions, setShowMoreActions] = useState(false);
  
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleOpenCreate = () => {
    router.push("/boutique/products/new");
  };

  const handleEdit = (product: any) => {
    router.push(`/boutique/products/edit/${product._id}`);
  };

  const handleDelete = (id: string) => {
    setDeletingProductId(id);
  };

  const confirmDelete = async () => {
    if (!deletingProductId) return;
    setIsDeleting(true);
    try {
      await deleteProduct({ id: deletingProductId as any });
      setDeletingProductId(null);
    } catch (err: any) {
      alert("Failed to delete product: " + err.message);
    } finally {
      setIsDeleting(false);
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

      const totalStock = Object.values(p.stockBySize || {}).reduce((a: any, b: any) => a + (b || 0), 0) as number;
      const hasLowStock = totalStock > 0 && totalStock <= 5;
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
      if (statusFilter === "low") {
        const totalStock = Object.values(prod.stockBySize || {}).reduce((a: any, b: any) => a + (b || 0), 0) as number;
        return totalStock > 0 && totalStock <= 5;
      }
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
      <LoadingState message="Loading catalog..." variant="full" />
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
      <div className="max-w-4xl mx-auto w-full flex flex-col gap-4 pt-2 pb-12">
        
        {/* Header Section (#10) */}
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-serif font-black text-[#0f172a] tracking-tight">Products</h1>
          <p className="text-sm font-medium text-[#64748b]">
            Manage products, pricing and stocks.
          </p>
        </div>

        {/* Short, Direct Attention Banner (#8 & #1 - no stats box container!) */}
        {(stats.low > 0 || stats.missingImages > 0) && (
          <div className="bg-slate-50 border border-[#F5C22B]/40 rounded-[14px] px-4 py-2.5 flex items-center justify-between text-[13px] text-[#0f172a] shadow-2xs select-none">
            <span className="flex items-center gap-2 font-semibold">
              <span className="text-[#D9A71E] font-bold">⚠</span>
              <span>
                {stats.low + stats.missingImages} {stats.low + stats.missingImages === 1 ? "product needs" : "products need"} attention
              </span>
            </span>
            <button
              onClick={() => { setStatusFilter(stats.low > 0 ? "low" : "missing_images"); setCurrentPage(1); }}
              className="text-[#D9A71E] font-bold hover:underline tracking-wide uppercase text-[11px] shrink-0 ml-2 cursor-pointer"
            >
              View →
            </button>
          </div>
        )}

        {/* Streamlined Animated Tabs */}
        <div className="overflow-x-auto no-scrollbar py-1">
          <AnimatedBackground
            value={statusFilter}
            onValueChange={(val) => {
              if (val) {
                setStatusFilter(val as any);
                setCurrentPage(1);
              }
            }}
            className="p-1 rounded-2xl bg-slate-100/90 border border-slate-200/80 overflow-hidden"
            activeClassName="bg-[#F5C22B] text-slate-950 ring-1 ring-[#D9A71E]/50 shadow-2xs"
          >
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
                  data-id={tab.id}
                  type="button"
                  className={`h-8 px-4 text-[13px] rounded-xl flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors ${
                    isActive ? "font-extrabold text-slate-950" : "font-semibold text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count !== null && (
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold leading-none transition-colors ${
                      isActive
                        ? "bg-slate-950/15 text-slate-950"
                        : tab.isAlert
                        ? "bg-amber-50 text-amber-700 border border-amber-200/70"
                        : "bg-slate-200 text-slate-700"
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </AnimatedBackground>
        </div>

        {/* Streamlined Toolbar: Search, Category Dropdown, Add Product Hero, & More Icon (#3 & #4) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 mt-0.5">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748b] stroke-[1.75]" />
              <input
                type="text"
                placeholder="Search by product name..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#f1f5f9] rounded-[16px] text-[13px] font-medium focus:outline-none focus:border-[#F5C22B] focus:ring-1 focus:ring-[#F5C22B] shadow-2xs placeholder:text-[#64748b] text-[#0f172a] font-sans transition-colors"
              />
            </div>
            
            <CategoryFilterSelect
              value={filterCategory}
              onChange={setFilterCategory}
              categories={filteredCategories}
            />
          </div>

          <div className="flex items-center gap-2 shrink-0 relative">
            <button 
              onClick={handleOpenCreate}
              className="px-5 py-2.5 bg-[#F5C22B] hover:bg-[#E0B024] active:bg-[#D9A71E] text-slate-900 font-extrabold font-extrabold text-[13px] rounded-[14px] shadow-[0_4px_14px_-3px_rgba(200,150,83,0.35)] flex items-center gap-2 transition-all cursor-pointer select-none"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" /> Add Product
            </button>
            
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMoreActions(!showMoreActions)}
                className="w-10 h-10 bg-white hover:bg-slate-50 border border-[#f1f5f9] text-[#64748b] hover:text-[#0f172a] rounded-[14px] font-bold text-base transition-all cursor-pointer flex items-center justify-center shadow-2xs select-none"
                title="More options"
              >
                ⋯
              </button>
              
              {showMoreActions && (
                <div className="absolute right-0 top-[110%] bg-[#ffffff] border border-[#f1f5f9] rounded-[16px] shadow-lg z-50 w-44 py-1.5 animate-in fade-in slide-in-from-top-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreActions(false);
                      alert("Bulk upload / CSV import: Select your catalog file to ingest.");
                    }}
                    className="w-full px-4 py-2.5 text-[12px] font-bold text-left text-[#334155] hover:bg-slate-50 hover:text-[#0f172a] transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#64748b] stroke-[1.75]" /> Bulk upload CSV
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Listings Grid (#5, #6, #7, #10) */}
        <div className="flex flex-col gap-2.5 mt-1">
          {paginatedProducts.length === 0 ? (
            <div className="text-center py-16 bg-[#ffffff] rounded-[20px] border border-[#f1f5f9] shadow-2xs flex flex-col items-center justify-center">
              <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mb-3 border border-[#f1f5f9]">
                <Search className="w-5 h-5 text-[#64748b] stroke-[1.5]" />
              </div>
              <h3 className="text-base font-serif font-black text-[#0f172a] mb-1">No products found</h3>
              <p className="text-[13px] text-[#64748b] max-w-xs leading-relaxed">
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
                  className="p-4 bg-white border border-slate-200/80 shadow-[0_4px_16px_-4px_rgba(168,154,126,0.08)] rounded-2xl hover:shadow-[0_8px_24px_-4px_rgba(168,154,126,0.14)] transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 select-none"
                >
                  {/* Left: 3:4 Fashion Portrait Thumbnail & Core Info */}
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div className="w-16 h-20 shrink-0 bg-slate-100 rounded-xl overflow-hidden relative border border-slate-200/80 flex items-center justify-center shadow-2xs">
                      {getProductImage(prod) ? (
                        <img src={getProductImage(prod) || ""} alt={prod.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[#D9A71E] font-bold text-lg font-serif leading-none select-none">
                          {prod.name ? prod.name.charAt(0).toUpperCase() : "H"}
                        </span>
                      )}
                      {!prod.active && (
                        <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px]" />
                      )}
                    </div>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-[15.5px] font-extrabold text-slate-900 tracking-tight truncate leading-tight">
                          {prod.name}
                        </h3>
                        {/* Soft Capsule Status Badge */}
                        {!prod.active ? (
                          <span className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Draft
                          </span>
                        ) : isApproved ? (
                          <span className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-500/25">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Live
                          </span>
                        ) : isPending ? (
                          <span className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#F5C22B]/15 text-[#9E7606] border border-[#F5C22B]/35">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#D9A71E] animate-pulse" /> Review
                          </span>
                        ) : isChangesRequested ? (
                          <span className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" /> Changes req
                          </span>
                        ) : (
                          <span className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                            Draft
                          </span>
                        )}
                      </div>
                      
                      <span className="text-[13px] font-medium text-slate-500 truncate mt-0.5">
                        {categories?.find((c: any) => c._id === prod.categoryId)?.name || "Boutique Item"}
                      </span>

                      {/* Stock Badge & Price Tag */}
                      <div className="flex items-center gap-2 text-[13px] font-sans mt-1.5 flex-wrap">
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md ${
                          totalStock === 0 ? "bg-rose-50 text-rose-600 border border-rose-200/60" :
                          totalStock <= 5 ? "bg-amber-50 text-amber-700 border border-amber-200/60 font-mono" :
                          "bg-slate-100 text-slate-700 border border-slate-200/60 font-mono"
                        }`}>
                          {totalStock === 0 ? "Out of stock" : `${totalStock} in stock`}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-slate-200" />
                        <span className="font-extrabold text-slate-900 font-mono text-[14.5px]">₹{((prod.basePrice || prod.price) / 100).toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Clean, Tactile Action Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0 ml-auto sm:ml-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 sm:border-transparent w-full sm:w-auto justify-end">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEdit(prod); }}
                      className="px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-bold text-slate-800 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-slate-500 stroke-[1.75]" /> Edit
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(prod._id); }}
                      className="w-8 h-8 flex items-center justify-center bg-transparent hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all cursor-pointer active:scale-95"
                      title="Delete Product"
                    >
                      <Trash2 className="w-4 h-4 stroke-[1.75]" />
                    </button>
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

      {deletingProductId && (
        <div className="fixed inset-0 bg-[#0f172a]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#ffffff] rounded-[24px] p-6 sm:p-7 max-w-sm w-full shadow-[0_20px_60px_-15px_rgba(44,38,30,0.3)] border border-[#f1f5f9] animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-[18px] font-extrabold text-[#0f172a] mb-2 tracking-tight">Delete Product?</h3>
            <p className="text-[14px] text-[#64748b] leading-relaxed mb-6">
              Are you sure you want to permanently delete this product? All image files will be cleaned from storage.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeletingProductId(null)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 bg-white border border-[#f1f5f9] hover:bg-slate-50 text-[#334155] font-bold text-[14px] rounded-[14px] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-extrabold text-[14px] rounded-[14px] shadow-[0_4px_14px_-3px_rgba(225,29,72,0.35)] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
