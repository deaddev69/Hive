"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Button, Card, CardContent, cn } from "@hive/ui";
import { Loader2, Search, Filter, ShieldAlert, CheckCircle2, ShieldX, Play, MessageSquare, Clock, User, Store, Tag, Sparkles, AlertCircle, FileVideo, Image as ImageIcon } from "lucide-react";

export default function AdminClaimsPage() {
  const [selectedQueue, setSelectedQueue] = useState<"Needs Review" | "Evidence Requested" | "Refund Approved" | "Return Pending" | "Closed" | "All">("Needs Review");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const claims = useQuery(api.adminClaims.getAdminClaims, {
    queue: selectedQueue,
  });

  const selectedClaimDetails = useQuery(
    api.adminClaims.getAdminClaimById,
    selectedClaimId ? { claimId: selectedClaimId as any } : "skip"
  );

  const updateClaimStatus = useMutation(api.adminClaims.updateClaimStatusAdmin);
  const approveRefund = useMutation(api.adminClaims.approveClaimRefundAdmin);
  const markReturnReceived = useMutation(api.adminClaims.markClaimReturnReceivedAdmin);

  // Action states
  const [adminNote, setAdminNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Auto-select first claim if list changes
  useEffect(() => {
    if (claims && claims.length > 0 && claims[0] && !selectedClaimId) {
      setSelectedClaimId(claims[0]._id);
    }
  }, [claims, selectedClaimId]);

  const handleQueueChange = (queue: typeof selectedQueue) => {
    setSelectedQueue(queue);
    setSelectedClaimId(null); // Reset selection
  };

  const handleStatusChange = async (newStatus: any, successMessage: string) => {
    if (!selectedClaimId) return;
    setActionLoading(true);
    try {
      await updateClaimStatus({
        claimId: selectedClaimId as any,
        status: newStatus,
        note: adminNote.trim() || undefined,
      });
      alert(successMessage);
      setAdminNote("");
    } catch (err: any) {
      alert("Failed to update status: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveRefund = async () => {
    if (!selectedClaimId) return;
    if (!confirm("Are you sure you want to approve this refund? This will update the order and payment records to 'refunded' and notify the customer. Inventory will NOT be restored automatically.")) return;
    
    setActionLoading(true);
    try {
      await approveRefund({
        claimId: selectedClaimId as any,
        note: adminNote.trim() || undefined,
      });
      alert("Refund has been approved successfully.");
      setAdminNote("");
    } catch (err: any) {
      alert("Failed to approve refund: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkReturnReceived = async () => {
    if (!selectedClaimId) return;
    if (!confirm("Are you sure you want to mark this return shipment as received? This will increment product stock and log inventory audit movements. This action is idempotent-locked.")) return;

    setActionLoading(true);
    try {
      await markReturnReceived({
        claimId: selectedClaimId as any,
        note: adminNote.trim() || undefined,
      });
      alert("Return shipment marked as received. Stock restored successfully.");
      setAdminNote("");
    } catch (err: any) {
      alert("Failed to mark return as received: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (claims === undefined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-hive-amber" />
        <p className="text-sm text-hive-text-muted font-medium">Loading claims pipeline...</p>
      </div>
    );
  }

  // Local filtering for searches
  const filteredClaims = claims.filter(c => {
    if (!debouncedSearch) return true;
    const term = debouncedSearch.toLowerCase();
    return (
      c.claimNumber.toLowerCase().includes(term) ||
      c.productName.toLowerCase().includes(term) ||
      c.customerEmail.toLowerCase().includes(term) ||
      c.boutiqueName.toLowerCase().includes(term)
    );
  });

  return (
    <div className="flex flex-col gap-6 text-left h-[calc(100vh-140px)] md:h-[calc(100vh-100px)] overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 flex justify-between items-center w-full">
        <div>
          <h1 className="text-3xl font-serif font-black text-hive-dark">Claims Resolution Console</h1>
          <p className="text-xs text-hive-text-muted">Review unboxing videos, investigate damage disputes, and issue refunds or returns.</p>
        </div>
      </div>

      {/* Filter Tabs / Queues */}
      <div className="flex-shrink-0 flex overflow-x-auto gap-2 border-b border-slate-200 pb-px font-sans">
        {[
          { key: "Needs Review", label: "Needs Review" },
          { key: "Evidence Requested", label: "Evidence Requested" },
          { key: "Refund Approved", label: "Refund Approved" },
          { key: "Return Pending", label: "Return Pending" },
          { key: "Closed", label: "Closed/Resolved" },
          { key: "All", label: "All Claims" }
        ].map((queue) => (
          <button
            key={queue.key}
            onClick={() => handleQueueChange(queue.key as any)}
            className={cn(
              "px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors uppercase tracking-wider",
              selectedQueue === queue.key
                ? "border-hive-amber text-hive-amber font-extrabold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            {queue.label}
          </button>
        ))}
      </div>

      {/* Main Content Split Layout */}
      <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden min-h-0">
        
        {/* Left Side: Claims List */}
        <div className="w-full md:w-[380px] flex flex-col gap-3 flex-shrink-0 min-h-0 overflow-y-auto">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-hive-text-muted" />
            <input
              type="text"
              placeholder="Search claims..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-hive-border rounded-xl text-xs font-medium text-hive-dark bg-white focus:outline-none"
            />
          </div>

          {/* List items */}
          <div className="flex flex-col gap-2.5">
            {filteredClaims.map((claim) => {
              const isSelected = claim._id === selectedClaimId;
              return (
                <button
                  key={claim._id}
                  onClick={() => setSelectedClaimId(claim._id)}
                  className={cn(
                    "w-full text-left p-4 rounded-2xl border transition-all duration-150 flex flex-col gap-2",
                    isSelected
                      ? "bg-white border-hive-amber shadow-sm ring-1 ring-hive-amber/35"
                      : "bg-[#FAF7F2]/40 hover:bg-white border-hive-border hover:shadow-xs"
                  )}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-bold text-xs text-slate-800">{claim.claimNumber}</span>
                    <span className={cn(
                      "inline-flex px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider border",
                      claim.status === "submitted" ? "bg-red-50 text-red-700 border-red-100 animate-pulse" :
                      claim.status === "under_review" ? "bg-amber-50 text-amber-700 border-amber-100" :
                      claim.status === "evidence_requested" ? "bg-blue-50 text-blue-700 border-blue-100" :
                      claim.status === "refund_approved" ? "bg-green-50 text-green-700 border-green-100" :
                      claim.status === "return_received" ? "bg-indigo-50 text-indigo-700 border-indigo-100" :
                      "bg-slate-100 text-slate-600 border-slate-200"
                    )}>
                      {claim.status.replace(/_/g, " ")}
                    </span>
                  </div>

                  <div className="flex flex-col gap-0.5 text-xs">
                    <span className="font-serif font-black text-hive-dark truncate">{claim.productName}</span>
                    <span className="text-[10px] text-hive-text-muted font-medium">Boutique: {claim.boutiqueName}</span>
                  </div>

                  <div className="flex items-center justify-between text-[9px] text-[#8E867C] font-semibold pt-1 border-t border-slate-100/50">
                    <span>Type: {claim.type.toUpperCase()}</span>
                    <span>{new Date(claim.submittedAt).toLocaleDateString()}</span>
                  </div>
                </button>
              );
            })}

            {filteredClaims.length === 0 && (
              <div className="py-12 text-center text-hive-text-muted text-xs bg-white border border-hive-border rounded-2xl">
                No claims in this queue.
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Claim Details Pane */}
        <div className="flex-1 min-h-0 bg-white border border-hive-border rounded-2xl flex flex-col overflow-hidden">
          {selectedClaimId && selectedClaimDetails ? (
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
              
              {/* Claim Header */}
              <div className="p-5 border-b border-hive-border/40 bg-slate-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-hive-dark text-white flex items-center justify-center">
                    <ShieldAlert className="w-5 h-5 text-hive-gold" />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <h2 className="font-mono font-black text-slate-800 text-base">{selectedClaimDetails.claimNumber}</h2>
                      <span className={cn(
                        "inline-flex px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border",
                        selectedClaimDetails.status === "submitted" ? "bg-red-100 text-red-700 border-red-200" :
                        selectedClaimDetails.status === "under_review" ? "bg-amber-100 text-amber-700 border-amber-200" :
                        selectedClaimDetails.status === "evidence_requested" ? "bg-blue-100 text-blue-700 border-blue-200" :
                        selectedClaimDetails.status === "refund_approved" ? "bg-green-100 text-green-700 border-green-200" :
                        selectedClaimDetails.status === "return_received" ? "bg-indigo-100 text-indigo-700 border-indigo-200" :
                        "bg-slate-100 text-slate-600 border-slate-200"
                      )}>
                        {selectedClaimDetails.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <span className="text-[10px] text-hive-text-muted mt-0.5 font-medium">
                      Order: #{selectedClaimDetails.orderNumber} • Submitted {new Date(selectedClaimDetails.submittedAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Quick Indicators */}
                <div className="flex items-center gap-2 text-[10px] font-bold font-sans uppercase">
                  {selectedClaimDetails.inventoryRestored ? (
                    <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 border border-green-100 px-2 py-1 rounded-lg">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Stock Restored
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-600 border border-amber-100 px-2 py-1 rounded-lg">
                      <Clock className="w-3.5 h-3.5" /> Return Awaiting
                    </span>
                  )}
                </div>
              </div>

              {/* Claim Body */}
              <div className="p-6 flex flex-col gap-6 font-sans">
                {/* 1. Context Row: Customer, Boutique & Product Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Customer Info */}
                  <div className="p-4 rounded-xl border border-hive-border/60 bg-slate-50/20 text-left">
                    <span className="text-[9px] font-bold text-hive-text-muted uppercase tracking-wider block mb-2 flex items-center gap-1">
                      <User className="w-3 h-3" /> Customer Profile
                    </span>
                    <p className="font-serif font-bold text-hive-dark text-sm leading-tight truncate">{selectedClaimDetails.customerEmail}</p>
                    <p className="text-xs text-hive-text-muted font-medium mt-1">{selectedClaimDetails.customerPhone}</p>
                  </div>

                  {/* Boutique Info */}
                  <div className="p-4 rounded-xl border border-hive-border/60 bg-slate-50/20 text-left">
                    <span className="text-[9px] font-bold text-hive-text-muted uppercase tracking-wider block mb-2 flex items-center gap-1">
                      <Store className="w-3 h-3" /> Merchant Boutique
                    </span>
                    <p className="font-serif font-bold text-hive-dark text-sm leading-tight truncate">{selectedClaimDetails.boutiqueName}</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-1">ID: {selectedClaimDetails.boutiqueId}</p>
                  </div>

                  {/* Product Details */}
                  <div className="p-4 rounded-xl border border-hive-border/60 bg-slate-50/20 text-left">
                    <span className="text-[9px] font-bold text-hive-text-muted uppercase tracking-wider block mb-2 flex items-center gap-1">
                      <Tag className="w-3 h-3" /> Claimed Item
                    </span>
                    <p className="font-serif font-bold text-hive-dark text-sm leading-tight truncate">{selectedClaimDetails.productName}</p>
                    <p className="text-xs text-slate-500 font-medium mt-1">Size {selectedClaimDetails.productSize} • SKU: {selectedClaimDetails.productSku}</p>
                  </div>
                </div>

                {/* 2. Customer Description & Claims Information */}
                <div className="p-4 rounded-xl border border-hive-border bg-amber-50/10 text-left">
                  <h3 className="text-xs font-bold text-hive-dark uppercase tracking-wider mb-1.5">Claim Details</h3>
                  <div className="flex gap-4">
                    <div className="flex flex-col gap-1 text-xs font-medium text-slate-700">
                      <span className="font-bold">Claim Type:</span>
                      <span className="bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded uppercase tracking-wider text-[9px] w-fit font-bold">
                        {selectedClaimDetails.type.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 text-xs font-semibold text-slate-700">
                    <span className="block font-bold mb-1">Customer Description:</span>
                    <p className="p-3 bg-white rounded-lg border border-hive-border/40 font-sans italic text-slate-600">
                      &quot;{selectedClaimDetails.description}&quot;
                    </p>
                  </div>
                </div>

                {/* 3. Evidence Snapshots Section */}
                <div className="text-left flex flex-col gap-3">
                  <h3 className="text-xs font-bold text-hive-dark uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-hive-gold" /> Immutable Evidence Snapshot
                  </h3>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Unboxing Video Player */}
                    <Card className="border border-hive-border bg-slate-50 overflow-hidden">
                      <div className="p-3 bg-slate-100/60 border-b border-hive-border/40 flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-700 flex items-center gap-1.5 uppercase">
                          <FileVideo className="w-3.5 h-3.5 text-blue-500" /> Primary Unboxing Video
                        </span>
                      </div>
                      <div className="aspect-[4/3] relative flex items-center justify-center bg-black">
                        {selectedClaimDetails.evidenceSnapshot?.videoUrl ? (
                          <video
                            controls
                            playsInline
                            className="w-full h-full object-contain"
                            src={selectedClaimDetails.evidenceSnapshot.videoUrl}
                          />
                        ) : selectedClaimDetails.evidence?.find((e: any) => e.type === "unboxing_video")?.url ? (
                          <video
                            controls
                            playsInline
                            className="w-full h-full object-contain"
                            src={selectedClaimDetails.evidence.find((e: any) => e.type === "unboxing_video")!.url}
                          />
                        ) : (
                          <div className="text-slate-400 text-xs flex flex-col items-center gap-2">
                            <ShieldX className="w-8 h-8 text-red-400" />
                            <span>No Unboxing Video Submitted</span>
                          </div>
                        )}
                      </div>
                    </Card>
 
                    {/* Image Snapshots Grid */}
                    <Card className="border border-hive-border bg-slate-50 overflow-hidden">
                      <div className="p-3 bg-slate-100/60 border-b border-hive-border/40 flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-700 flex items-center gap-1.5 uppercase">
                          <ImageIcon className="w-3.5 h-3.5 text-amber-500" /> Photo Evidences
                        </span>
                      </div>
                      <div className="p-4 grid grid-cols-2 gap-2 h-[220px] overflow-y-auto">
                        {selectedClaimDetails.evidenceSnapshot?.imageUrls && selectedClaimDetails.evidenceSnapshot.imageUrls.length > 0 ? (
                          selectedClaimDetails.evidenceSnapshot.imageUrls.map((url: string, index: number) => (
                            <a
                              key={index}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="relative aspect-square rounded-lg border overflow-hidden bg-white hover:opacity-85 transition-opacity"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={url} alt="Evidence Snapshot" className="w-full h-full object-cover" />
                              <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[7.5px] font-bold uppercase px-1 py-0.5 rounded leading-none">
                                snapshot
                              </span>
                            </a>
                          ))
                        ) : selectedClaimDetails.evidence?.filter((e: any) => e.type !== "unboxing_video").map((img: any) => (
                          <a
                            key={img._id}
                            href={img.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="relative aspect-square rounded-lg border overflow-hidden bg-white hover:opacity-85 transition-opacity"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={img.url} alt="Evidence" className="w-full h-full object-cover" />
                            <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[7.5px] font-bold uppercase px-1 py-0.5 rounded leading-none">
                              {img.type.replace("_photo", "")}
                            </span>
                          </a>
                        ))}
                        {(!selectedClaimDetails.evidence || selectedClaimDetails.evidence.filter((e: any) => e.type !== "unboxing_video").length === 0) &&
                         (!selectedClaimDetails.evidenceSnapshot?.imageUrls || selectedClaimDetails.evidenceSnapshot.imageUrls.length === 0) && (
                          <div className="col-span-2 flex flex-col items-center justify-center text-slate-400 text-xs h-full gap-1">
                            <ImageIcon className="w-6 h-6" />
                            <span>No supporting photos</span>
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>
                </div>

                {/* 4. Chronological Events Logs */}
                <div className="text-left">
                  <h3 className="text-xs font-bold text-hive-dark uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-hive-gold" /> Case Timeline & Events History
                  </h3>
                  <div className="border-l-2 border-slate-200 ml-3 pl-5 flex flex-col gap-4 font-sans text-xs">
                    {selectedClaimDetails.events?.map((evt: any, idx: number) => (
                      <div key={idx} className="relative">
                        {/* Timeline node */}
                        <div className="absolute -left-[27px] top-0.5 w-3 h-3 rounded-full bg-hive-gold ring-4 ring-white" />
                        
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-700 capitalize">
                              {evt.action.replace(/_/g, " ")}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(evt.createdAt).toLocaleString()}
                            </span>
                          </div>
                          {evt.fromStatus && evt.toStatus && (
                            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">
                              Transitioned: {evt.fromStatus.replace(/_/g, " ")} &rarr; {evt.toStatus.replace(/_/g, " ")}
                            </span>
                          )}
                          {evt.note && (
                            <p className="p-2 bg-slate-50 rounded-lg border border-slate-100 font-medium text-slate-600 mt-1 italic max-w-lg">
                              &quot;{evt.note}&quot;
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                    {(!selectedClaimDetails.events || selectedClaimDetails.events.length === 0) && (
                      <span className="text-slate-400 italic">No timeline events logged yet.</span>
                    )}
                  </div>
                </div>

                {/* 5. Administrative Notes Input Field */}
                <div className="flex flex-col gap-2 border-t border-slate-100 pt-5 text-left">
                  <label className="text-xs font-bold text-hive-text-muted uppercase tracking-wider">
                    Add Administrative Resolution Note
                  </label>
                  <textarea
                    rows={2}
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Enter support investigation details, SLA reviews, or internal resolution notes..."
                    className="w-full px-3 py-2 border border-hive-border rounded-xl text-xs font-semibold text-hive-dark focus:outline-none focus:ring-1 focus:ring-hive-gold bg-slate-50/30"
                  />
                </div>
              </div>

              {/* Claim Resolution Controls (Sticky Footer Action Bar) */}
              <div className="flex-shrink-0 sticky bottom-0 bg-slate-50 border-t border-hive-border/40 p-4 flex flex-wrap gap-2.5 items-center justify-between font-sans">
                {/* Left quick actions */}
                <div className="flex gap-2">
                  {/* Under Review */}
                  {selectedClaimDetails.status === "submitted" && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={actionLoading}
                      onClick={() => handleStatusChange("under_review", "Claim is now marked as Under Review.")}
                      className="px-3 py-1.5 text-xs font-bold text-amber-600 border-amber-200 hover:bg-amber-50"
                    >
                      Mark Under Review
                    </Button>
                  )}
                  {/* Request Evidence */}
                  {["submitted", "under_review"].includes(selectedClaimDetails.status) && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={actionLoading}
                      onClick={() => handleStatusChange("evidence_requested", "Evidence request notification sent to customer.")}
                      className="px-3 py-1.5 text-xs font-bold text-blue-600 border-blue-200 hover:bg-blue-50"
                    >
                      Request Evidence
                    </Button>
                  )}
                </div>

                {/* Right critical actions */}
                <div className="flex gap-2">
                  {/* Reject Claim */}
                  {!["closed", "rejected"].includes(selectedClaimDetails.status) && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={actionLoading}
                      onClick={() => handleStatusChange("rejected", "Claim has been rejected.")}
                      className="px-3 py-1.5 text-xs font-bold text-red-600 border-red-200 hover:bg-red-50"
                    >
                      Reject Claim
                    </Button>
                  )}

                  {/* Mark Return Received */}
                  {selectedClaimDetails.status === "refund_approved" && !selectedClaimDetails.inventoryRestored && (
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={actionLoading}
                      onClick={handleMarkReturnReceived}
                      className="px-3.5 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl uppercase tracking-wider border-transparent"
                    >
                      Mark Return Received
                    </Button>
                  )}

                  {/* Approve Refund */}
                  {["submitted", "under_review", "evidence_requested"].includes(selectedClaimDetails.status) && (
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={actionLoading}
                      onClick={handleApproveRefund}
                      className="px-3.5 py-1.5 text-xs font-bold bg-[#C59A5B] hover:bg-[#C59A5B]/90 text-white rounded-xl uppercase tracking-wider border-transparent"
                    >
                      Approve Refund
                    </Button>
                  )}

                  {/* Close Claim */}
                  {!["closed", "rejected"].includes(selectedClaimDetails.status) && (
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={actionLoading}
                      onClick={() => handleStatusChange("closed", "Claim has been marked as Closed/Resolved.")}
                      className="px-3.5 py-1.5 text-xs font-bold bg-hive-dark hover:bg-hive-dark/95 text-white rounded-xl uppercase tracking-wider border-transparent"
                    >
                      Close Case
                    </Button>
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2 p-8 text-center">
              <ShieldAlert className="w-8 h-8 text-slate-300" />
              <h3 className="font-serif font-bold text-sm text-hive-dark">No Claim Selected</h3>
              <p className="text-xs text-hive-text-muted max-w-xs">Select a dispute claim from the left panel to review files and resolve customer issues.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
