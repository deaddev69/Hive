"use client";

import React, { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { Modal } from "@hive/ui";
import { Star, Loader2, CheckCircle2, PackageCheck, Sparkles } from "lucide-react";
import { toast } from "@hive/utils";

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: Id<"orders">;
  orderItemId: Id<"orderItems">;
  productName: string;
  productImage?: string;
  onSuccess?: () => void;
}

export function ReviewModal({
  isOpen,
  onClose,
  orderId,
  orderItemId,
  productName,
  productImage,
  onSuccess,
}: ReviewModalProps) {
  const submitReview = useMutation(api.reviews.submitOrderReview);

  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [platformRating, setPlatformRating] = useState<number>(5);
  const [hoverPlatformRating, setHoverPlatformRating] = useState<number | null>(null);
  const [reviewText, setReviewText] = useState<string>("");
  const [fitResponse, setFitResponse] = useState<"too_small" | "perfect_fit" | "too_large">("perfect_fit");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await submitReview({
        orderId,
        orderItemId,
        rating,
        platformRating,
        reviewText: reviewText.trim() || undefined,
        fitResponse,
      });

      toast.success("Thank you! Your review has been submitted.");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error("Failed to submit review: " + (err.message || String(err)));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Rate & Review Item"
      className="max-w-lg w-full !p-6 bg-white font-sans rounded-3xl"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Item Header */}
        <div className="flex items-center gap-4 p-3 bg-stone-50 rounded-2xl border border-stone-100">
          {productImage ? (
            <img src={productImage} alt={productName} className="w-14 h-14 object-cover rounded-xl border border-stone-200" />
          ) : (
            <div className="w-14 h-14 bg-stone-200 rounded-xl flex items-center justify-center text-stone-500 font-bold">
              Item
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#D9A71E]">VERIFIED PURCHASE</span>
            <h4 className="text-sm font-bold text-slate-800 line-clamp-1">{productName}</h4>
          </div>
        </div>

        {/* 1. Product & Seller Rating */}
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-black uppercase tracking-wider text-slate-700">
            Product & Seller Quality <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => {
              const current = hoverRating ?? rating;
              return (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(null)}
                  className="p-1 focus:outline-none transform hover:scale-110 transition-transform cursor-pointer"
                >
                  <Star
                    className={`w-7 h-7 ${
                      star <= current
                        ? "fill-[#F5C22B] text-[#F5C22B]"
                        : "fill-stone-100 text-stone-300"
                    }`}
                  />
                </button>
              );
            })}
            <span className="ml-2 text-xs font-extrabold text-amber-600">
              {rating === 5 ? "Excellent ★★★★★" : rating === 4 ? "Very Good ★★★★" : rating === 3 ? "Good ★★★" : rating === 2 ? "Fair ★★" : "Poor ★"}
            </span>
          </div>
        </div>

        {/* 2. Platform & Delivery Rating */}
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <PackageCheck className="w-3.5 h-3.5 text-slate-500" /> Platform & Delivery Experience
          </label>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => {
              const current = hoverPlatformRating ?? platformRating;
              return (
                <button
                  key={star}
                  type="button"
                  onClick={() => setPlatformRating(star)}
                  onMouseEnter={() => setHoverPlatformRating(star)}
                  onMouseLeave={() => setHoverPlatformRating(null)}
                  className="p-1 focus:outline-none transform hover:scale-110 transition-transform cursor-pointer"
                >
                  <Star
                    className={`w-6 h-6 ${
                      star <= current
                        ? "fill-slate-800 text-slate-800"
                        : "fill-stone-100 text-stone-300"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Fit Feedback */}
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-black uppercase tracking-wider text-slate-700">
            How was the sizing / fit?
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "too_small", label: "Runs Small" },
              { id: "perfect_fit", label: "Perfect Fit" },
              { id: "too_large", label: "Runs Large" },
            ].map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setFitResponse(option.id as any)}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  fitResponse === option.id
                    ? "bg-[#F5C22B]/15 border-[#D9A71E] text-slate-900 shadow-sm"
                    : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* 4. Text Review */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-black uppercase tracking-wider text-slate-700">
            Your Feedback / Comments (Optional)
          </label>
          <textarea
            rows={3}
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="Share details about the fabric quality, stitching, fitting, or delivery experience..."
            className="w-full p-3.5 border border-stone-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#F5C22B]"
          />
        </div>

        {/* Submit Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-5 py-2.5 border border-stone-200 text-stone-600 rounded-xl text-xs font-bold hover:bg-stone-50 cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-7 py-2.5 bg-[#F5C22B] hover:bg-[#E0B024] text-slate-900 font-extrabold rounded-xl text-xs uppercase tracking-wider shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-900" />
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Submit Review</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
