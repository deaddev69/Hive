"use client";

import React, { useState, useEffect } from "react";
import { Modal, Button } from "@hive/ui";
import Image from "next/image";
import { cn } from "@hive/ui";

interface SizeSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  price: number;
  imageUrl: string;
  sizes: string[];
  inventory: Record<string, number>;
  onConfirm: (size: string) => void;
}

export const SizeSelectionModal: React.FC<SizeSelectionModalProps> = ({
  isOpen,
  onClose,
  productName,
  price,
  imageUrl,
  sizes,
  inventory,
  onConfirm,
}) => {
  const [selectedSize, setSelectedSize] = useState<string>("");

  // Reset selected size when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedSize("");
    }
  }, [isOpen]);

  const handleConfirm = () => {
    if (selectedSize) {
      onConfirm(selectedSize);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Select Size"
      className="max-w-md"
    >
      <div className="flex flex-col gap-5 text-center items-center py-2 select-none">
        
        {/* Product Summary Row */}
        <div className="flex gap-4 items-center w-full text-left bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/40">
          <div className="relative w-16 h-20 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={productName}
                fill
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-[10px] text-slate-400 font-extrabold uppercase select-none">
                No Image
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
              {productName}
            </h4>
            <span className="text-sm font-extrabold text-hive-dark mt-1 block">
              ₹{price.toLocaleString("en-IN")}
            </span>
          </div>
        </div>

        {/* Sizes Grid */}
        <div className="w-full text-left space-y-3">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            Available Sizes
          </span>
          <div className="flex flex-wrap gap-2.5">
            {sizes.map((sz) => {
              const stock = inventory[sz] ?? 0;
              const isOutOfStock = stock <= 0;
              const isSelected = selectedSize === sz;

              return (
                <button
                  key={sz}
                  type="button"
                  disabled={isOutOfStock}
                  onClick={() => setSelectedSize(sz)}
                  className={cn(
                    "min-w-[48px] h-12 px-3.5 rounded-xl border text-xs font-extrabold transition-all duration-200 flex flex-col items-center justify-center relative select-none",
                    isOutOfStock
                      ? "border-slate-100 bg-slate-50 text-slate-300 opacity-60 cursor-not-allowed line-through"
                      : isSelected
                      ? "border-hive-dark bg-hive-dark text-white ring-2 ring-hive-dark/15 scale-[1.03]"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 active:scale-95"
                  )}
                >
                  <span>{sz}</span>
                  {isOutOfStock && (
                    <span className="absolute text-[8px] font-extrabold uppercase tracking-wide text-red-500 scale-90 bottom-0.5">
                      Out
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Confirm Action Button */}
        <div className="w-full pt-4 border-t border-slate-100 mt-2">
          <Button
            variant="primary"
            disabled={!selectedSize}
            onClick={handleConfirm}
            className="w-full font-bold uppercase tracking-wider py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add to Bag
          </Button>
        </div>

      </div>
    </Modal>
  );
};
