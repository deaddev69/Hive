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
  const [statusFilter, setStatusFilter] = useState<"all" | "live" | "pending" | "draft" | "low">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

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
    if (!products) return { all: 0, live: 0, pending: 0, draft: 0, low: 0 };
    let live = 0;
    let pending = 0;
    let draft = 0;
    let low = 0;

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
    });

    return { all: products.length, live, pending, draft, low };
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
      <div className="max-w-2xl mx-auto w-full flex flex-col gap-5 pt-2 pb-10">
        
        {/* Header Section */}
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl leading-none font-serif font-bold text-[#232B2B]">Products</h1>
          <p className="text-[13px] font-medium text-slate-500 max-w-sm leading-relaxed">
            Manage your boutique product listings, inventory, and cross-sell catalog.
          </p>
        </div>

        {/* Premium Interactive Filter Tabs */}
        <div className="flex border-b border-[#E6D5B8]/20 overflow-x-auto no-scrollbar gap-5 text-xs font-bold font-sans mt-1 select-none">
          {[
            { id: "all", label: "ALL", count: stats.all },
            { id: "live", label: "LIVE", count: stats.live },
            { id: "pending", label: "PENDING REVIEW", count: stats.pending },
            { id: "draft", label: "DRAFTS", count: stats.draft },
            { id: "low", label: "LOW STOCK", count: stats.low },
          ].map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setStatusFilter(tab.id as any); setCurrentPage(1); }}
                className={`pb-3 border-b-2 transition-all whitespace-nowrap active:scale-95 flex items-center gap-1.5 ${
                  isActive 
                    ? "border-[#C89653] text-[#1A1D1D]" 
                    : "border-transparent text-slate-400 hover:text-slate-700"
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-mono leading-none ${
                  isActive ? "bg-[#C89653]/10 text-[#C89653]" : "bg-slate-100 text-slate-500"
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col gap-4 mt-1">
          
          {/* Search Input and Category Selector Dropdown */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-3 bg-white border border-[#E6D5B8]/30 rounded-2xl text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-[#C89653] shadow-sm placeholder:text-slate-400 text-slate-800 font-sans"
              />
            </div>
            
            <CategoryFilterSelect
              value={filterCategory}
              onChange={setFilterCategory}
              categories={categories}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 w-full mt-1">
            <Button 
              variant="outline" 
              className="flex-1 bg-white border border-slate-200 text-slate-700 font-bold text-[11px] uppercase tracking-widest py-3.5 rounded-2xl shadow-sm hover:bg-slate-50 flex items-center justify-center gap-2"
            >
              <Upload className="w-3.5 h-3.5" /> BULK UPLOAD
            </Button>
            <Button 
              onClick={handleOpenCreate}
              className="flex-1 bg-[#C89653] hover:bg-[#b08143] text-white font-bold text-[11px] uppercase tracking-widest py-3.5 rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all select-none active:scale-95"
            >
              <Plus className="w-4 h-4" /> ADD PRODUCT
            </Button>
          </div>

        </div>

        {/* Listings Grid */}
        <div className="flex flex-col gap-4 mt-4">
          {paginatedProducts.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <Search className="w-6 h-6 text-slate-300" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-700 mb-1">NO PRODUCTS FOUND</h3>
              <p className="text-xs text-slate-400 max-w-[200px] leading-relaxed">
                Adjust your filters or create a new product to get started.
              </p>
            </div>
          ) : (
            paginatedProducts.map((prod: any) => {
              const isApproved = prod.approvalStatus === "approved" || !prod.approvalStatus;
              const isPending = prod.approvalStatus === "pending";
              const isChangesRequested = prod.approvalStatus === "changes_requested";

              return (
                <Card key={prod._id} className="overflow-hidden border-none shadow-sm rounded-3xl bg-white hover:shadow-md transition-shadow">
                  <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:items-center">
                    
                    {/* Thumbnail Image / Monogram Fallback Placeholder */}
                    <div className="w-24 h-24 sm:w-20 sm:h-20 shrink-0 bg-[#FAF9F5] rounded-2xl overflow-hidden relative border border-[#E6D5B8]/30 flex items-center justify-center">
                      {getProductImage(prod) ? (
                        <img src={getProductImage(prod) || ""} alt={prod.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[#C89653] font-bold text-lg font-serif leading-none select-none">
                          {prod.name ? prod.name.charAt(0).toUpperCase() : "H"}
                        </span>
                      )}
                      {!prod.active && (
                        <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px]" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 flex flex-col min-w-0 font-sans">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="text-base font-black text-slate-800 truncate pr-2 uppercase font-sans tracking-tight">
                          {prod.name}
                        </h3>
                        {/* Status Badges with correct active/approvalStatus bindings */}
                        {!prod.active ? (
                          <span className="shrink-0 text-[9px] font-black tracking-widest uppercase px-2.5 py-1 rounded-md border bg-slate-50 text-slate-700 border-slate-200">
                            DRAFT
                          </span>
                        ) : isApproved ? (
                          <span className="shrink-0 text-[9px] font-black tracking-widest uppercase px-2.5 py-1 rounded-md border bg-emerald-50 text-emerald-700 border-emerald-100">
                            LIVE
                          </span>
                        ) : isPending ? (
                          <span className="shrink-0 text-[9px] font-black tracking-widest uppercase px-2.5 py-1 rounded-md border bg-amber-50 text-amber-700 border-amber-100">
                            PENDING REVIEW
                          </span>
                        ) : isChangesRequested ? (
                          <span className="shrink-0 text-[9px] font-black tracking-widest uppercase px-2.5 py-1 rounded-md border bg-rose-50 text-rose-700 border-rose-100">
                            CHANGES REQUESTED
                          </span>
                        ) : (
                          <span className="shrink-0 text-[9px] font-black tracking-widest uppercase px-2.5 py-1 rounded-md border bg-slate-50 text-slate-700 border-slate-200">
                            INACTIVE
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs mb-3 font-sans">
                        <span className="font-bold text-slate-700 font-mono">₹{prod.price.toLocaleString()}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        <span className="text-slate-500 font-medium truncate max-w-[120px]">
                          {categories?.find((c: any) => c._id === prod.categoryId)?.name || "Unknown"}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        <span className="text-slate-700 font-bold">
                          {(Object.values(prod.stockBySize).reduce((a: any, b: any) => a + (b || 0), 0) as any)}{" "}
                          <span className="text-slate-500 font-medium">units</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-auto">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(prod)}
                          className="h-9 px-4 rounded-xl border-slate-200 text-slate-700 font-bold text-[10px] uppercase tracking-widest hover:bg-slate-50 flex items-center gap-2"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(prod._id)}
                          className="h-9 w-9 p-0 rounded-xl border-slate-200 text-red-400 hover:text-red-600 hover:bg-slate-50 flex items-center justify-center shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
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
