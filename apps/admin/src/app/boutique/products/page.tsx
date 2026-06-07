"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Button, Card, CardContent, Modal } from "@hive/ui";
import { Plus, Edit3, Trash2, Power, Loader2, Upload, X, Search, Image as ImageIcon, Check, Filter } from "lucide-react";

const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL", "Free"];

export default function BoutiqueProducts() {
  const products = useQuery(api.products.getBoutiqueProducts);
  const categories = useQuery(api.categories.getCategories, { onlyActive: true });
  
  const createProduct = useMutation(api.products.createProduct);
  const updateProduct = useMutation(api.products.updateProduct);
  const deleteProduct = useMutation(api.products.deleteProduct);
  const toggleProductStatus = useMutation(api.products.toggleProductStatus);
  const generateUploadUrl = useMutation(api.products.generateBoutiqueUploadUrl);

  // Listing controls
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // Modal & Form State
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [price, setPrice] = useState("");
  const [discountPrice, setDiscountPrice] = useState("");
  const [sameDayEligible, setSameDayEligible] = useState(false);
  const [featured, setFeatured] = useState(false);
  const [active, setActive] = useState(true);

  // Sizes & Stock
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [stockBySize, setStockBySize] = useState<Record<string, number>>({});

  // Image Upload State
  const [images, setImages] = useState<string[]>([]); // current storageIds
  const [localPreviews, setLocalPreviews] = useState<{ url: string; file?: File; storageId?: string }[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setDescription("");
    setCategoryId("");
    setPrice("");
    setDiscountPrice("");
    setSameDayEligible(false);
    setFeatured(false);
    setActive(true);
    setSelectedSizes([]);
    setStockBySize({});
    setImages([]);
    setLocalPreviews([]);
  };

  const handleOpenCreate = () => {
    resetForm();
    if (categories && categories.length > 0 && categories[0]) {
      setCategoryId(categories[0]._id);
    }
    setIsOpen(true);
  };

  const handleEdit = (product: any) => {
    setEditingId(product._id);
    setName(product.name);
    setDescription(product.description);
    setCategoryId(product.categoryId);
    setPrice(product.price.toString());
    setDiscountPrice(product.discountPrice ? product.discountPrice.toString() : "");
    setSameDayEligible(product.sameDayEligible);
    setFeatured(product.featured);
    setActive(product.active);
    setSelectedSizes(product.sizes);
    setStockBySize(product.stockBySize || {});
    setImages(product.images || []);

    // Set local previews for existing images (using resolved signed URLs)
    const previews = (product.images || []).map((imgId: string, idx: number) => ({
      url: product.imageUrls?.[idx] || imgId,
      storageId: imgId
    }));
    setLocalPreviews(previews);
    setIsOpen(true);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (localPreviews.length + files.length > 5) {
      alert("You can upload a maximum of 5 images.");
      return;
    }

    const newPreviews = files.map((file) => ({
      url: URL.createObjectURL(file),
      file,
    }));

    setLocalPreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeImagePreview = (index: number) => {
    setLocalPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSizeToggle = (size: string) => {
    setSelectedSizes((prev) => {
      if (prev.includes(size)) {
        return prev.filter((s) => s !== size);
      } else {
        return [...prev, size];
      }
    });

    setStockBySize((prev) => {
      const copy = { ...prev };
      if (copy[size] !== undefined) {
        delete copy[size];
      } else {
        copy[size] = 0; // default initial stock
      }
      return copy;
    });
  };

  const handleStockChange = (size: string, value: number) => {
    setStockBySize((prev) => ({
      ...prev,
      [size]: Math.max(0, value),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId) {
      alert("Please select a category.");
      return;
    }
    if (selectedSizes.length === 0) {
      alert("Please select at least one size.");
      return;
    }
    if (localPreviews.length === 0) {
      alert("Please upload at least one image.");
      return;
    }

    setSubmitting(true);
    setUploadingImages(true);

    try {
      const finalImageStorageIds: string[] = [];

      // Sequentially upload selected image files
      for (const item of localPreviews) {
        if (item.file) {
          // Get upload url
          const uploadUrl = await generateUploadUrl();
          // POST file
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
      };

      if (editingId) {
        await updateProduct({
          id: editingId as any,
          ...payload,
        });
        alert("Product updated successfully!");
      } else {
        await createProduct(payload);
        alert("Product created successfully!");
      }

      setIsOpen(false);
      resetForm();
    } catch (err: any) {
      alert("Failed to save product: " + err.message);
    } finally {
      setSubmitting(false);
      setUploadingImages(false);
    }
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

  if (products === undefined || categories === undefined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-hive-amber" />
        <p className="text-sm text-hive-text-muted font-medium">Loading products catalog...</p>
      </div>
    );
  }

  // Filter listings
  const filteredProducts = products.filter((prod) => {
    const matchesSearch = prod.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      prod.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "all" || prod.categoryId === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // Paginated listings
  const totalPages = Math.ceil(filteredProducts.length / PAGE_SIZE);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <div className="flex flex-col gap-6 text-left">
      
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-serif font-black text-hive-dark">Products Directory</h1>
          <p className="text-sm text-hive-text-muted">Register and review your clothing designs, pricing, sizing configurations and images.</p>
        </div>
        <Button onClick={handleOpenCreate} variant="primary" className="flex items-center gap-1.5 py-3 shadow-md shadow-hive-gold/15 font-bold">
          <Plus className="w-4 h-4" /> Create Product
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4.5 border border-hive-border rounded-2xl shadow-sm">
        
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Search products by name..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9.5 pr-4 py-2 text-xs border border-hive-border/60 rounded-xl focus:outline-none focus:ring-1.5 focus:ring-hive-gold"
          />
          <Search className="w-4 h-4 text-hive-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-hive-text-muted flex-shrink-0" />
          <span className="text-xs font-bold text-hive-text-muted">Category:</span>
          <select
            value={filterCategory}
            onChange={(e) => {
              setFilterCategory(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 border border-hive-border/60 rounded-xl text-xs font-semibold text-hive-dark bg-white focus:outline-none cursor-pointer"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat._id} value={cat._id}>{cat.name}</option>
            ))}
          </select>
        </div>

      </div>

      {/* Products table list */}
      <Card className="border border-hive-border bg-white shadow-sm overflow-hidden rounded-3xl">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-hive-border/40 text-[10px] font-bold uppercase tracking-wider text-hive-text-muted">
                  <th className="px-6 py-4">Image</th>
                  <th className="px-6 py-4">Product details</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Price</th>
                  <th className="px-6 py-4">Stock summary</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hive-border/30 font-semibold text-hive-dark">
                {paginatedProducts.map((prod) => {
                  // Count total stock
                  const totalStock = Object.values(prod.stockBySize || {}).reduce((sum: number, val: any) => sum + (val || 0), 0);

                  return (
                    <tr key={prod._id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="relative w-12 h-16 rounded-xl border border-hive-border/50 overflow-hidden bg-slate-50 flex-shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {prod.imageUrl ? (
                            <img src={prod.imageUrl} alt={prod.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-hive-text-muted">No Image</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 max-w-xs text-left">
                        <div className="flex flex-col gap-1.5">
                          <span className="font-serif font-black text-sm text-hive-dark leading-tight">{prod.name}</span>
                          <span className="font-mono text-[9px] text-hive-text-muted truncate select-all">{prod._id}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex px-2 py-0.5 rounded-full bg-hive-cream/40 text-hive-dark border border-hive-border/40 text-[10px] font-extrabold uppercase">
                          {prod.categoryName}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold">
                        <div className="flex flex-col">
                          <span>₹{prod.price.toLocaleString("en-IN")}</span>
                          {prod.discountPrice && (
                            <span className="text-[10px] font-bold text-hive-amber line-through">
                              ₹{prod.discountPrice.toLocaleString("en-IN")}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5 text-left">
                          <span className="font-bold">Total: {totalStock}</span>
                          <div className="flex gap-1.5 flex-wrap">
                            {prod.sizes.map((sz: string) => (
                              <span key={sz} className="text-[9px] font-bold bg-slate-100 text-slate-600 px-1 py-0.5 rounded">
                                {sz}: {prod.stockBySize?.[sz] ?? 0}
                              </span>
                            ))}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          prod.active ? "bg-green-50 text-green-700 border border-green-200" : "bg-slate-100 text-slate-500 border border-slate-200"
                        } border`}>
                          {prod.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleStatus(prod._id, prod.active)}
                            className={`w-8.5 h-8.5 p-0 rounded-lg flex items-center justify-center border ${prod.active ? "border-green-200 text-green-600 hover:bg-green-50" : "border-slate-200 text-slate-400 hover:bg-slate-50"}`}
                            title={prod.active ? "Deactivate" : "Activate"}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(prod)}
                            className="w-8.5 h-8.5 p-0 rounded-lg flex items-center justify-center border border-slate-200 text-hive-text hover:bg-slate-50"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(prod._id)}
                            className="w-8.5 h-8.5 p-0 rounded-lg flex items-center justify-center border border-red-100 text-red-500 hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-hive-text-muted">
                      No products found matching filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center px-6 py-4.5 border-t border-hive-border/40 text-xs">
              <span className="text-hive-text-muted">Page {currentPage} of {totalPages}</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((c) => c - 1)}
                  className="px-3 rounded-lg text-xs"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((c) => c + 1)}
                  className="px-3 rounded-lg text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal - Create/Edit Product Form */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={editingId ? "Edit Product" : "Create New Product"}
        className="max-w-2xl w-full"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 text-left p-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted">Product Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Silk Zari Saree"
                className="w-full px-4 py-2 text-xs border border-hive-border/60 rounded-xl focus:outline-none focus:ring-1.5 focus:ring-hive-gold bg-hive-cream/5"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted">Category Tag</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                className="w-full px-4 py-2 text-xs border border-hive-border/60 rounded-xl focus:outline-none focus:ring-1.5 focus:ring-hive-gold bg-white cursor-pointer"
              >
                <option value="" disabled>Select category...</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat._id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted">Description</label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a detailed description of fabrics, stitching style, design aesthetics..."
              className="w-full px-4 py-2 text-xs border border-hive-border/60 rounded-xl focus:outline-none focus:ring-1.5 focus:ring-hive-gold bg-hive-cream/5 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted">Price (INR)</label>
              <input
                type="number"
                required
                min={0}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. 4500"
                className="w-full px-4 py-2 text-xs border border-hive-border/60 rounded-xl focus:outline-none focus:ring-1.5 focus:ring-hive-gold bg-hive-cream/5"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted">Discount Price (INR, Optional)</label>
              <input
                type="number"
                min={0}
                value={discountPrice}
                onChange={(e) => setDiscountPrice(e.target.value)}
                placeholder="e.g. 3999"
                className="w-full px-4 py-2 text-xs border border-hive-border/60 rounded-xl focus:outline-none focus:ring-1.5 focus:ring-hive-gold bg-hive-cream/5"
              />
            </div>
          </div>

          {/* Sizes and stock selector */}
          <div className="flex flex-col gap-2.5 pt-2 border-t border-slate-100">
            <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted">Size & Initial Stock Configuration</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {SIZE_OPTIONS.map((sz) => {
                const isSelected = selectedSizes.includes(sz);
                return (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => handleSizeToggle(sz)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors select-none ${
                      isSelected
                        ? "bg-hive-dark border-hive-dark text-white"
                        : "bg-white border-slate-200 hover:border-slate-300 text-slate-700"
                    }`}
                  >
                    {sz}
                  </button>
                );
              })}
            </div>

            {selectedSizes.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 bg-slate-50 p-4 border border-slate-200/60 rounded-2xl">
                {selectedSizes.map((sz) => (
                  <div key={sz} className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-hive-text-muted uppercase">Stock Size: {sz}</span>
                    <input
                      type="number"
                      required
                      min={0}
                      value={stockBySize[sz] ?? 0}
                      onChange={(e) => handleStockChange(sz, parseInt(e.target.value) || 0)}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 bg-white focus:outline-none focus:ring-1.5 focus:ring-hive-gold"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Image Upload Component */}
          <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
            <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted flex justify-between">
              <span>Product Images (1 to 5 uploads)</span>
              <span className="text-[10px] text-hive-text-muted font-bold">{localPreviews.length} of 5</span>
            </label>
            
            <div className="flex flex-wrap gap-3.5 items-center">
              
              {/* File Dropzone card */}
              {localPreviews.length < 5 && (
                <div className="relative w-16 h-20 border-2 border-dashed border-slate-200 hover:border-hive-gold transition-colors rounded-xl flex flex-col items-center justify-center bg-hive-cream/5 cursor-pointer flex-shrink-0">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  />
                  <Upload className="w-4 h-4 text-slate-400" />
                  <span className="text-[8px] font-bold text-slate-400 mt-1 uppercase">Add</span>
                </div>
              )}

              {/* Upload Previews cards */}
              {localPreviews.map((preview, idx) => (
                <div key={idx} className="relative w-16 h-20 border border-slate-200 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview.url} alt="product thumbnail" className="w-full h-full object-cover animate-fade-in" />
                  <button
                    type="button"
                    onClick={() => removeImagePreview(idx)}
                    className="absolute top-1 right-1 p-0.5 bg-black/60 rounded-full text-white hover:bg-black transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}

            </div>
          </div>

          {/* Checkbox triggers */}
          <div className="grid grid-cols-3 gap-4 pt-3.5 border-t border-slate-100 font-bold text-hive-dark text-xs">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={sameDayEligible}
                onChange={(e) => setSameDayEligible(e.target.checked)}
                className="rounded border-hive-border text-hive-gold focus:ring-hive-gold w-4 h-4"
              />
              <span>Same Day Delivery</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="rounded border-hive-border text-hive-gold focus:ring-hive-gold w-4 h-4"
              />
              <span>Featured Product</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="rounded border-hive-border text-hive-gold focus:ring-hive-gold w-4 h-4"
              />
              <span>Active status</span>
            </label>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 mt-4 pt-4 border-t border-hive-border/60 justify-end">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={submitting}
              className="px-6 flex items-center justify-center gap-2 font-bold"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> {uploadingImages ? "Uploading..." : "Saving..."}
                </>
              ) : editingId ? (
                "Update Product"
              ) : (
                "Create Product"
              )}
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
