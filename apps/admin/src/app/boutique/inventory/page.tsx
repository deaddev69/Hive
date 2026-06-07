"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Button, Card, CardContent } from "@hive/ui";
import { Loader2, Save, RotateCcw, AlertTriangle, Plus, Minus } from "lucide-react";

export default function BoutiqueInventory() {
  const products = useQuery(api.products.getBoutiqueProducts);
  const updateInventory = useMutation(api.products.updateInventory);

  // local modified stock mapping: productId -> size -> quantity
  const [localStock, setLocalStock] = useState<Record<string, Record<string, number>>>({});
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Sync state when products resolve
  useEffect(() => {
    if (products) {
      const stockMap: Record<string, Record<string, number>> = {};
      products.forEach((prod) => {
        stockMap[prod._id] = { ...prod.stockBySize };
      });
      setLocalStock(stockMap);
      setIsDirty(false);
    }
  }, [products]);

  const handleStockChange = (productId: string, size: string, newValue: number) => {
    setLocalStock((prev) => {
      const copy = { ...prev };
      if (!copy[productId]) copy[productId] = {};
      copy[productId][size] = Math.max(0, newValue);
      return copy;
    });
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (!products) return;
    setSaving(true);
    try {
      // Find modified products
      for (const prod of products) {
        const localProdStock = localStock[prod._id];
        if (!localProdStock) continue;

        // Check if stock has changed
        let hasChanged = false;
        for (const sz of prod.sizes) {
          if (localProdStock[sz] !== prod.stockBySize[sz]) {
            hasChanged = true;
            break;
          }
        }

        if (hasChanged) {
          await updateInventory({
            productId: prod._id as any,
            stockBySize: localProdStock,
          });
        }
      }
      alert("Inventory levels updated successfully!");
      setIsDirty(false);
    } catch (err: any) {
      alert("Failed to update inventory: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!products) return;
    const stockMap: Record<string, Record<string, number>> = {};
    products.forEach((prod) => {
      stockMap[prod._id] = { ...prod.stockBySize };
    });
    setLocalStock(stockMap);
    setIsDirty(false);
  };

  if (products === undefined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-hive-amber" />
        <p className="text-sm text-hive-text-muted font-medium">Loading inventory lists...</p>
      </div>
    );
  }

  // Build flattened table list: one row per product + size combination
  const tableRows: { productId: string; name: string; categoryName: string; imageUrl?: string; size: string; initialStock: number; currentStock: number }[] = [];
  products.forEach((prod) => {
    prod.sizes.forEach((sz: string) => {
      const currentVal = localStock[prod._id]?.[sz] ?? 0;
      tableRows.push({
        productId: prod._id,
        name: prod.name,
        categoryName: prod.categoryName,
        imageUrl: prod.imageUrl,
        size: sz,
        initialStock: prod.stockBySize[sz] ?? 0,
        currentStock: currentVal,
      });
    });
  });

  return (
    <div className="flex flex-col gap-6 text-left">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-serif font-black text-hive-dark">Inventory Control</h1>
          <p className="text-sm text-hive-text-muted">Perform stock level updates, review low stock warnings, and edit sizes in bulk.</p>
        </div>

        {isDirty && (
          <div className="flex gap-2 w-full sm:w-auto">
            <Button onClick={handleReset} variant="outline" disabled={saving} className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold">
              <RotateCcw className="w-3.5 h-3.5" /> Discard
            </Button>
            <Button onClick={handleSave} variant="primary" disabled={saving} className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-hive-gold/15">
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" /> Save Stock Levels
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Warnings & Statistics banner */}
      {isDirty && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4.5 rounded-2xl flex gap-3 text-xs items-center">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <span className="font-semibold">You have unsaved changes in stock quantities. Be sure to hit "Save Stock Levels" to persist these changes.</span>
        </div>
      )}

      {/* Inventory list table */}
      <Card className="border border-hive-border bg-white shadow-sm overflow-hidden rounded-3xl">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-hive-border/40 text-[10px] font-bold uppercase tracking-wider text-hive-text-muted">
                  <th className="px-6 py-4">Image</th>
                  <th className="px-6 py-4">Product Name</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Size Tag</th>
                  <th className="px-6 py-4">Available Stock</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hive-border/30 font-semibold text-hive-dark">
                {tableRows.map((row, idx) => {
                  const isLowStock = row.currentStock <= 2;
                  const isOutOfStock = row.currentStock === 0;

                  return (
                    <tr key={`${row.productId}-${row.size}`} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-6 py-3">
                        <div className="relative w-10 h-14 rounded-lg border border-hive-border/40 overflow-hidden bg-slate-50 flex-shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {row.imageUrl ? (
                            <img src={row.imageUrl} alt={row.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[7px] font-bold text-hive-text-muted">No Image</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-left">
                        <span className="font-bold text-hive-dark text-sm leading-snug">{row.name}</span>
                      </td>
                      <td className="px-6 py-3">
                        <span className="inline-flex px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-extrabold uppercase">
                          {row.categoryName}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-hive-gold/10 border border-hive-amber/30 text-hive-amber font-extrabold text-xs">
                          {row.size}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          {/* Decrease button */}
                          <button
                            type="button"
                            onClick={() => handleStockChange(row.productId, row.size, row.currentStock - 1)}
                            className="w-7 h-7 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800 flex items-center justify-center transition-colors active:scale-90"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>

                          {/* Direct stock quantity input */}
                          <input
                            type="number"
                            min={0}
                            value={row.currentStock}
                            onChange={(e) => handleStockChange(row.productId, row.size, parseInt(e.target.value) || 0)}
                            className="w-16 px-2.5 py-1 text-center border border-slate-200 rounded-lg text-xs font-bold text-slate-700 bg-white focus:outline-none focus:ring-1.5 focus:ring-hive-gold"
                          />

                          {/* Increase button */}
                          <button
                            type="button"
                            onClick={() => handleStockChange(row.productId, row.size, row.currentStock + 1)}
                            className="w-7 h-7 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800 flex items-center justify-center transition-colors active:scale-90"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        {isOutOfStock ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-50 text-red-700 border border-red-200 uppercase tracking-wider">
                            Out of stock
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wider">
                            Low stock
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-50 text-green-700 border border-green-200 uppercase tracking-wider">
                            In stock
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {tableRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-hive-text-muted">
                      No products added to catalog yet. Let's create a product first!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
