"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { Star, MessageSquare, CheckCircle, Clock, Sparkles, Filter, ChevronRight, Loader2, ThumbsUp } from "lucide-react";
import { toast } from "@hive/utils";

export default function BoutiqueReviewsPage() {
  const data = useQuery(api.reviews.getBoutiqueReviews, {});
  const replyToReview = useMutation(api.reviews.replyToReview);

  const [activeTab, setActiveTab] = useState<"all" | "unreplied" | "low_ratings">("all");
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});
  const [submittingReplyId, setSubmittingReplyId] = useState<string | null>(null);

  if (data === undefined) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 text-[#D9A71E] animate-spin" />
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Loading Customer Reviews...</span>
      </div>
    );
  }

  const { metrics, reviews } = data;

  const filteredReviews = reviews.filter((r) => {
    if (activeTab === "unreplied") return !r.sellerReply;
    if (activeTab === "low_ratings") return r.rating <= 3;
    return true;
  });

  const handleSendReply = async (reviewId: Id<"reviews">) => {
    const text = replyTextMap[reviewId];
    if (!text || !text.trim()) {
      toast.error("Please enter a reply message.");
      return;
    }

    setSubmittingReplyId(reviewId);
    try {
      await replyToReview({
        reviewId,
        replyText: text.trim(),
      });
      toast.success("Reply posted successfully!");
      setReplyingToId(null);
    } catch (err: any) {
      toast.error("Failed to post reply: " + (err.message || String(err)));
    } finally {
      setSubmittingReplyId(null);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto font-sans flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-[#F5C22B]/15 text-amber-900 border border-[#F5C22B]/30">
            CUSTOMER FEEDBACK
          </span>
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Customer Reviews & Ratings</h1>
        <p className="text-xs text-slate-500 font-medium">
          Track customer ratings, product fit stats, and respond to verified buyers.
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Rating Card */}
        <div className="p-5 bg-gradient-to-br from-amber-50 to-orange-50/30 border border-amber-200/50 rounded-2xl flex flex-col gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-800">AVERAGE RATING</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{metrics.averageRating}</span>
            <div className="flex items-center text-[#F5C22B]">
              <Star className="w-5 h-5 fill-current" />
            </div>
            <span className="text-xs text-slate-500 font-semibold">({metrics.totalReviews} reviews)</span>
          </div>
          <span className="text-[11px] text-amber-900/70 font-bold">Based on verified purchases</span>
        </div>

        {/* Fit Ratio */}
        <div className="p-5 bg-white border border-slate-200/80 rounded-2xl flex flex-col gap-2 shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">FIT ACCURACY</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{metrics.fitRatio}%</span>
            <ThumbsUp className="w-5 h-5 text-emerald-600" />
          </div>
          <span className="text-[11px] text-slate-500 font-bold">Reported "Perfect Fit" by customers</span>
        </div>

        {/* Response Rate */}
        <div className="p-5 bg-white border border-slate-200/80 rounded-2xl flex flex-col gap-2 shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">SELLER RESPONSE RATE</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{metrics.responseRate}%</span>
            <MessageSquare className="w-5 h-5 text-blue-600" />
          </div>
          <span className="text-[11px] text-slate-500 font-bold">Reviews replied by boutique</span>
        </div>

        {/* Breakdown */}
        <div className="p-5 bg-white border border-slate-200/80 rounded-2xl flex flex-col gap-2 shadow-sm justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">RATING BREAKDOWN</span>
          <div className="flex flex-col gap-1">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = metrics.ratingBreakdown[stars as 1|2|3|4|5] || 0;
              const percent = metrics.totalReviews > 0 ? (count / metrics.totalReviews) * 100 : 0;
              return (
                <div key={stars} className="flex items-center gap-2 text-[10px] font-bold text-slate-600">
                  <span className="w-3">{stars}★</span>
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#F5C22B] rounded-full" style={{ width: `${percent}%` }} />
                  </div>
                  <span className="w-6 text-right text-slate-400">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab("all")}
          className={`pb-3 border-b-2 transition-colors cursor-pointer ${
            activeTab === "all" ? "border-[#D9A71E] text-slate-900" : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          All Reviews ({reviews.length})
        </button>
        <button
          onClick={() => setActiveTab("unreplied")}
          className={`pb-3 border-b-2 transition-colors cursor-pointer ${
            activeTab === "unreplied" ? "border-[#D9A71E] text-slate-900" : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          Needs Reply ({reviews.filter((r) => !r.sellerReply).length})
        </button>
        <button
          onClick={() => setActiveTab("low_ratings")}
          className={`pb-3 border-b-2 transition-colors cursor-pointer ${
            activeTab === "low_ratings" ? "border-[#D9A71E] text-slate-900" : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          Low Ratings (≤3★) ({reviews.filter((r) => r.rating <= 3).length})
        </button>
      </div>

      {/* Reviews List */}
      {filteredReviews.length === 0 ? (
        <div className="p-12 bg-stone-50 rounded-2xl border border-dashed border-stone-200 flex flex-col items-center justify-center text-center gap-2">
          <MessageSquare className="w-8 h-8 text-stone-300" />
          <h3 className="text-sm font-bold text-slate-700">No reviews found</h3>
          <p className="text-xs text-slate-400">Customer reviews for your products will appear here.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredReviews.map((rev) => (
            <div key={rev._id} className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-sm flex flex-col gap-3">
              {/* Review Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex text-[#F5C22B]">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={`w-4 h-4 ${s <= rev.rating ? "fill-current" : "text-slate-200"}`} />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-slate-900">{rev.productName}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
                  <span>By {rev.customerName}</span>
                  <span>•</span>
                  <span>{new Date(rev.createdAt).toLocaleDateString("en-IN")}</span>
                </div>
              </div>

              {/* Fit Badge & Text */}
              <div className="flex flex-col gap-2">
                {rev.fitResponse && (
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                      FIT: {rev.fitResponse.replace("_", " ")}
                    </span>
                  </div>
                )}
                {rev.reviewText ? (
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">{rev.reviewText}</p>
                ) : (
                  <p className="text-xs text-slate-400 italic">No written comments provided.</p>
                )}
              </div>

              {/* Review Images */}
              {rev.images && rev.images.length > 0 && (
                <div className="flex gap-2 py-1">
                  {rev.images.map((imgUrl, idx) => (
                    <img key={idx} src={imgUrl} alt="Review attachment" className="w-16 h-16 object-cover rounded-xl border border-slate-200" />
                  ))}
                </div>
              )}

              {/* Seller Reply Section */}
              {rev.sellerReply ? (
                <div className="mt-2 p-3 bg-[#F5C22B]/10 border border-[#F5C22B]/30 rounded-xl flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-amber-900">
                    <span>YOUR RESPONSE</span>
                    {rev.sellerRepliedAt && <span>{new Date(rev.sellerRepliedAt).toLocaleDateString("en-IN")}</span>}
                  </div>
                  <p className="text-xs text-amber-950 font-medium">{rev.sellerReply}</p>
                </div>
              ) : (
                <div className="mt-2 pt-2 flex flex-col gap-2">
                  {replyingToId === rev._id ? (
                    <div className="flex flex-col gap-2">
                      <textarea
                        rows={2}
                        value={replyTextMap[rev._id] || ""}
                        onChange={(e) => setReplyTextMap({ ...replyTextMap, [rev._id]: e.target.value })}
                        placeholder="Write a polite response to your customer..."
                        className="w-full p-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#F5C22B]"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setReplyingToId(null)}
                          className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSendReply(rev._id)}
                          disabled={submittingReplyId === rev._id}
                          className="px-4 py-1.5 bg-[#F5C22B] hover:bg-[#E0B024] text-slate-900 font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {submittingReplyId === rev._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Post Reply"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setReplyingToId(rev._id)}
                      className="self-start text-xs font-bold text-[#D9A71E] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> Reply to customer
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
