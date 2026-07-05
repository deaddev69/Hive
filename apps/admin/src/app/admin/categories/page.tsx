"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Button, Card, CardContent } from "@hive/ui";
import { Plus, Edit3, Trash2, Power, ArrowLeft, Loader2, ListCollapse, UploadCloud } from "lucide-react";
import Link from "next/link";

export default function AdminCategoriesPage() {
  const categories = useQuery(api.categories.getCategories, {});
  const createCategory = useMutation(api.categories.createCategory);
  const updateCategory = useMutation(api.categories.updateCategory);
  const deleteCategory = useMutation(api.categories.deleteCategory);
  const toggleCategory = useMutation(api.categories.toggleCategory);
  const generateUploadUrl = useAction(api.media.api.generateUploadUrl);
  const commitUpload = useAction(api.media.api.commitUpload);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [sortOrder, setSortOrder] = useState(1);
  const [active, setActive] = useState(true);
  
  // Image Upload State
  const [imageStorageId, setImageStorageId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(false);

  // Handle Name Input change to auto-generate Slug
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (!editingId) {
      setSlug(
        val
          .toLowerCase()
          .trim()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "")
      );
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      alert("Invalid file type. Please use JPG, PNG, or WEBP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("File is too large. Max size is 5MB.");
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleEdit = (category: any) => {
    setEditingId(category._id);
    setName(category.name);
    setSlug(category.slug);
    setImageStorageId(category.imageStorageId);
    setPreviewUrl(category.imageUrl); // dynamically resolved URL from backend
    setSelectedFile(null);
    setSortOrder(category.sortOrder);
    setActive(category.active);
  };

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setSlug("");
    setImageStorageId(null);
    setPreviewUrl(null);
    setSelectedFile(null);
    setSortOrder((categories?.length || 0) + 1);
    setActive(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingId && !selectedFile) {
      alert("Category image is required.");
      return;
    }

    setSubmitting(true);
    
    try {
      let finalStorageId = imageStorageId;

      if (selectedFile) {
        setUploadProgress(true);
        const { presignedUrl, sessionId } = await generateUploadUrl({
          mimeType: selectedFile.type,
          fileSize: selectedFile.size,
          ownerType: "admin",
          ownerId: "categories",
          context: "category_image"
        });
        
        await fetch(presignedUrl, {
          method: "PUT",
          headers: { "Content-Type": selectedFile.type },
          body: selectedFile,
        });
        
        const finalizedAsset = await commitUpload({ sessionId });
        finalStorageId = finalizedAsset as any;
        setUploadProgress(false);
      }
      
      if (!finalStorageId) {
        throw new Error("Failed to secure an image storage ID.");
      }

      if (editingId) {
        await updateCategory({
          id: editingId as any,
          name,
          slug,
          imageStorageId: finalStorageId as any,
          active,
          sortOrder,
        });
        alert("Category updated successfully!");
      } else {
        await createCategory({
          name,
          slug,
          imageStorageId: finalStorageId as any,
          active,
          sortOrder,
        });
        alert("Category created successfully!");
      }
      resetForm();
    } catch (err: any) {
      alert("Failed to save category: " + err.message);
      setUploadProgress(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this category? The image will be permanently removed from storage.")) {
      try {
        await deleteCategory({ id: id as any });
      } catch (err: any) {
        alert("Failed to delete category: " + err.message);
      }
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await toggleCategory({ id: id as any, active: !currentStatus });
    } catch (err: any) {
      alert("Failed to toggle status: " + err.message);
    }
  };

  if (categories === undefined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-hive-amber" />
        <p className="text-sm text-hive-text-muted font-medium">Loading categories...</p>
      </div>
    );
  }

  const sortedCategories = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="flex flex-col gap-6 text-left">
      
      {/* Header back button */}
      <div className="flex items-center gap-4">
        <Link href="/admin" className="p-2 rounded-xl hover:bg-slate-200/50 transition-colors border border-transparent">
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </Link>
        <div>
          <h1 className="text-3xl font-serif font-black text-hive-dark">Categories Directory</h1>
          <p className="text-sm text-hive-text-muted">Manage product discovery categories and secure image assets.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Form: Create / Edit Category */}
        <form onSubmit={handleSubmit} className="lg:col-span-5 bg-white border border-hive-border rounded-3xl p-6 shadow-sm flex flex-col gap-5">
          <h2 className="text-lg font-serif font-bold text-hive-dark pb-2 border-b border-hive-border/60">
            {editingId ? "Edit Category Details" : "Create New Category"}
          </h2>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted">Category Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Sarees, Kurtis"
              value={name}
              onChange={handleNameChange}
              className="w-full px-4 py-2.5 rounded-xl border border-hive-border/60 focus:outline-none focus:ring-1.5 focus:ring-hive-gold focus:border-transparent text-sm bg-hive-cream/10"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted">URL Slug (Generated)</label>
            <input
              type="text"
              required
              placeholder="e.g. sarees"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
              className="w-full px-4 py-2.5 rounded-xl border border-hive-border/60 focus:outline-none focus:ring-1.5 focus:ring-hive-gold focus:border-transparent text-sm bg-hive-cream/10"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted">Category Image</label>
            <div className={`relative flex flex-col items-center justify-center w-full h-40 border-2 border-dashed ${previewUrl ? 'border-hive-gold/50' : 'border-hive-border/60'} rounded-xl bg-hive-cream/5 hover:bg-hive-cream/20 transition-colors cursor-pointer overflow-hidden`}>
              <input
                type="file"
                accept="image/jpeg, image/png, image/webp"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              
              {previewUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold pointer-events-none">
                    Click to replace image
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 text-hive-text-muted">
                  <UploadCloud className="w-8 h-8 text-hive-border" />
                  <div className="text-sm font-semibold text-center px-4">Click or drag image to upload</div>
                  <div className="text-[10px] uppercase tracking-wide">JPG, PNG, WEBP (Max 5MB)</div>
                </div>
              )}
            </div>
            {selectedFile && (
              <span className="text-xs text-green-600 font-semibold mt-1">Ready to upload: {selectedFile.name}</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-hive-text-muted">Sort Order</label>
              <input
                type="number"
                required
                min={1}
                value={sortOrder}
                onChange={(e) => setSortOrder(parseInt(e.target.value) || 1)}
                className="w-full px-4 py-2.5 rounded-xl border border-hive-border/60 focus:outline-none focus:ring-1.5 focus:ring-hive-gold focus:border-transparent text-sm bg-hive-cream/10"
              />
            </div>
            
            <div className="flex flex-col gap-1.5 justify-center mt-5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="rounded border-hive-border text-hive-gold focus:ring-hive-gold w-4 h-4"
                />
                <span className="text-sm font-bold text-hive-dark">Active status</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 mt-4 pt-4 border-t border-hive-border/60">
            <Button
              type="submit"
              variant="primary"
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> {uploadProgress ? "Uploading Image..." : "Saving..."}
                </>
              ) : editingId ? (
                "Update Category"
              ) : (
                "Create Category"
              )}
            </Button>
            {editingId && (
              <Button type="button" variant="outline" onClick={resetForm} disabled={submitting}>
                Cancel
              </Button>
            )}
          </div>
        </form>

        {/* Right List: Display Current Categories */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-serif font-bold text-hive-dark">Categories Registry ({categories.length})</h2>
            <span className="text-xs text-hive-text-muted font-bold uppercase tracking-wider">Ordered by Sort Order</span>
          </div>

          {sortedCategories.length === 0 ? (
            <div className="bg-white border border-hive-border rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-4 shadow-sm">
              <div className="w-14 h-14 rounded-full bg-hive-cream/40 flex items-center justify-center border border-hive-border/40 text-hive-text-muted">
                <ListCollapse className="w-6 h-6" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-base font-bold text-hive-dark font-serif">No Categories Found</span>
                <span className="text-xs text-hive-text-muted font-medium">Create a category to populate the shopping directories.</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3.5">
              {sortedCategories.map((category) => (
                <Card key={category._id} className={`overflow-hidden border transition-all duration-200 ${category.active ? "border-hive-border bg-white shadow-sm" : "border-hive-border/40 bg-hive-cream/5 opacity-70 shadow-none"}`}>
                  <CardContent className="p-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                    
                    {/* Category preview info */}
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      {/* Image Preview */}
                      <div className="relative w-12 h-12 rounded-xl border border-hive-border/50 overflow-hidden bg-slate-50 flex-shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {category.imageUrl ? (
                          <img src={category.imageUrl} alt={category.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-red-400 bg-red-50 text-[9px] font-bold text-center">No Image</div>
                        )}
                      </div>
                      
                      {/* Meta */}
                      <div className="flex flex-col min-w-0 text-left">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-serif font-bold text-hive-dark text-sm truncate">{category.name}</span>
                          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-hive-comb/80 border border-hive-border/60 text-hive-dark">
                            Pos: {category.sortOrder}
                          </span>
                          {category.active ? (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-50 text-green-700 border border-green-200">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                              Inactive
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-hive-text-muted mt-0.5">Slug: <span className="font-mono">{category.slug}</span></span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleActive(category._id, category.active)}
                        className={`w-9 h-9 p-0 rounded-xl flex items-center justify-center border ${category.active ? "border-green-200 hover:bg-green-50 text-green-600" : "border-hive-border/60 hover:bg-hive-cream/40 text-hive-text-muted"}`}
                        title={category.active ? "Disable category" : "Enable category"}
                      >
                        <Power className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(category)}
                        className="w-9 h-9 p-0 rounded-xl flex items-center justify-center border border-hive-border/60 text-hive-text hover:bg-hive-cream/40"
                        title="Edit category"
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(category._id)}
                        className="w-9 h-9 p-0 rounded-xl flex items-center justify-center border border-red-100 text-red-500 hover:bg-red-50"
                        title="Delete category"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
