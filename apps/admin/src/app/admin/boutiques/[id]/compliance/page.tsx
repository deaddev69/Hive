"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../../../convex/_generated/api";
import { Button, Card, CardContent } from "@hive/ui";
import { ArrowLeft, Loader2, FileCheck, CheckCircle2, XCircle, AlertCircle, Clock, Eye, AlertTriangle, ExternalLink, ShieldCheck, Lock, Unlock, Store } from "lucide-react";
import Link from "next/link";

export default function BoutiqueCompliancePage() {
  const params = useParams();
  const router = useRouter();
  const boutiqueId = params.id as string;

  // Fetch boutique details & compliance documents
  const boutique = useQuery(api.boutiques.getBoutiqueById, { id: boutiqueId as any });
  const docs = useQuery(api.adminBoutiques.getBoutiqueDocumentsAdmin, { boutiqueId: boutiqueId as any });

  // Mutations
  const updateStatus = useMutation(api.adminBoutiques.updateBoutiqueDocumentStatusAdmin);
  const logViewed = useMutation(api.adminBoutiques.logDocumentViewedAdmin);
  const updateBoutiqueStatus = useMutation(api.boutiques.updateBoutique); // To allow business approval

  // States
  const [overrideDocs, setOverrideDocs] = useState<Record<string, boolean>>({});
  const [rejectionNotes, setRejectionNotes] = useState<Record<string, string>>({});
  const [rejectingDocId, setRejectingDocId] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [updatingBoutiqueStatus, setUpdatingBoutiqueStatus] = useState(false);

  // Automatically log viewed status when documents load
  useEffect(() => {
    if (docs) {
      docs.forEach((doc) => {
        // Trigger viewed event mutation if not already viewed by this admin
        logViewed({ documentId: doc._id }).catch((err) => {
          console.error("Failed to log document viewed event:", err);
        });
      });
    }
  }, [docs, logViewed]);

  if (boutique === undefined || docs === undefined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-hive-amber" />
        <p className="text-sm text-hive-text-muted font-medium">Loading boutique compliance details...</p>
      </div>
    );
  }

  if (boutique === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
        <Store className="w-10 h-10 text-red-400" />
        <h2 className="text-lg font-serif font-bold text-hive-dark">Boutique Not Found</h2>
        <p className="text-xs text-hive-text-muted">No boutique matches the provided ID.</p>
        <Link href="/admin/compliance" className="text-xs underline text-hive-amber mt-2">
          Back to Compliance Queue
        </Link>
      </div>
    );
  }

  // Handle Approve Action
  const handleApprove = async (docId: string, isVerified: boolean) => {
    setSubmittingId(docId);
    try {
      await updateStatus({
        documentId: docId as any,
        status: "verified",
        override: isVerified ? true : overrideDocs[docId],
      });
      alert("Document approved successfully!");
    } catch (err: any) {
      alert("Failed to approve document: " + err.message);
    } finally {
      setSubmittingId(null);
    }
  };

  // Handle Reject Action
  const handleRejectSubmit = async (docId: string, isVerified: boolean) => {
    const notes = rejectionNotes[docId];
    if (!notes || !notes.trim()) {
      alert("Please enter a rejection reason.");
      return;
    }

    setSubmittingId(docId);
    try {
      await updateStatus({
        documentId: docId as any,
        status: "rejected",
        notes: notes,
        override: isVerified ? true : overrideDocs[docId],
      });
      setRejectingDocId(null);
      // clear notes
      setRejectionNotes((prev) => ({ ...prev, [docId]: "" }));
      alert("Document rejected successfully.");
    } catch (err: any) {
      alert("Failed to reject document: " + err.message);
    } finally {
      setSubmittingId(null);
    }
  };

  // Handle Boutique Business Approval
  const handleBoutiqueBusinessApproval = async () => {
    setUpdatingBoutiqueStatus(true);
    try {
      await updateBoutiqueStatus({
        id: boutiqueId as any,
        boutiqueName: boutique.boutiqueName,
        ownerName: boutique.ownerName,
        email: boutique.email,
        phone: boutique.phone,
        address: boutique.address,
        city: boutique.addressDetails?.city || "Hyderabad",
        state: boutique.addressDetails?.state || "Telangana",
        pincode: boutique.addressDetails?.pincode || "500034",
        latitude: boutique.latitude,
        longitude: boutique.longitude,
        deliveryRadiusKm: boutique.deliveryRadiusKm,
        description: boutique.description,
        status: "APPROVED",
      });
      alert("Boutique approved successfully! The merchant can now list products and start selling.");
    } catch (err: any) {
      alert("Failed to update boutique status: " + err.message);
    } finally {
      setUpdatingBoutiqueStatus(false);
    }
  };

  // Document labels mapper
  const getDocLabel = (type: string) => {
    switch (type) {
      case "gst_certificate":
        return "GST Certificate";
      case "pan":
        return "PAN Card";
      case "trade_license":
        return "Trade License";
      case "bank_proof":
        return "Bank Proof (Cancelled Cheque / Statement)";
      default:
        return "Owner Identity Document (Other)";
    }
  };

  // Metrics & Completion calculation
  const totalRequired = 4; // GST, PAN, Trade License, Bank details
  const verifiedCount = docs.filter((d) => d.status === "verified" && d.type !== "other").length;
  const isComplianceComplete = verifiedCount >= totalRequired;

  // Format date helper
  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  // Build a master chronological log of all document updates for the sidebar timeline
  const masterTimelineEvents = docs
    .flatMap((doc) =>
      doc.events.map((e) => ({
        ...e,
        docType: doc.type,
        docLabel: getDocLabel(doc.type),
      }))
    )
    .sort((a, b) => b.createdAt - a.createdAt); // Newest first for global feed

  return (
    <div className="flex flex-col gap-8 text-left font-sans">
      {/* Header back button */}
      <div className="flex items-center gap-4">
        <Link href="/admin/compliance" className="p-2 rounded-xl hover:bg-slate-200/50 transition-colors border border-transparent">
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </Link>
        <div>
          <h1 className="text-3xl font-serif font-black text-hive-dark">Boutique Compliance Review</h1>
          <p className="text-sm text-hive-text-muted">Review onboarding legal and verification files submitted by {boutique.boutiqueName}.</p>
        </div>
      </div>

      {/* Compliance Completion Status Strip */}
      <Card className={`border rounded-3xl p-6 ${
        isComplianceComplete
          ? "border-green-200 bg-green-50/70"
          : "border-amber-200 bg-amber-50/70"
      }`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-2xl border ${
              isComplianceComplete
                ? "bg-green-100 text-green-700 border-green-200"
                : "bg-amber-100 text-amber-700 border-amber-200"
            }`}>
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-bold text-slate-900 flex items-center gap-2">
                <span>Compliance Verification Status:</span>
                {isComplianceComplete ? (
                  <span className="text-green-700 font-extrabold flex items-center gap-1 text-sm bg-green-100 border border-green-200 px-2.5 py-0.5 rounded-full">
                    Compliance Complete ✓
                  </span>
                ) : (
                  <span className="text-amber-700 font-extrabold flex items-center gap-1 text-sm bg-amber-100 border border-amber-200 px-2.5 py-0.5 rounded-full">
                    Awaiting Verification ({verifiedCount} of {totalRequired} Verified)
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                Verification checks for mandatory onboarding documents: GST, PAN, Trade License, and Bank Proof. 
                {isComplianceComplete
                  ? " All mandatory documents are verified. The business can now be approved."
                  : " Please audit all submitted files. Verification is required before the boutique can go live."}
              </p>
            </div>
          </div>

          {/* Boutique business state logic */}
          <div className="flex flex-col gap-2 min-w-[200px]">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>Boutique Registry Status:</span>
              <span className="font-bold text-slate-800">{boutique.status}</span>
            </div>
            {boutique.status === "PENDING" ? (
              <Button
                onClick={handleBoutiqueBusinessApproval}
                disabled={!isComplianceComplete || updatingBoutiqueStatus}
                variant="primary"
                className={`py-2.5 px-5 rounded-xl text-xs font-extrabold shadow-sm flex items-center justify-center gap-2 ${
                  isComplianceComplete
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed border-none"
                }`}
              >
                {updatingBoutiqueStatus ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Approve Business</span>
                  </>
                )}
              </Button>
            ) : boutique.status === "APPROVED" ? (
              <div className="bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-xl px-4 py-2 text-center text-xs font-bold flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Business Approved & Active</span>
              </div>
            ) : (
              <div className="bg-slate-100 border border-slate-200 text-slate-800 rounded-xl px-4 py-2 text-center text-xs font-bold">
                Status is {boutique.status}
              </div>
            )}
            {!isComplianceComplete && boutique.status === "PENDING" && (
              <span className="text-[10px] text-amber-705 font-bold italic text-center">
                Requires Compliance Completion First
              </span>
            )}
            {isComplianceComplete && boutique.status === "PENDING" && (
              <span className="text-[10px] text-emerald-700 font-extrabold text-center animate-pulse">
                Ready for business approval!
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Grid: Left side documents list, Right side timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Column: Documents cards (col-span-2) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <h2 className="text-xl font-serif font-black text-hive-dark">Submitted Documents Registry</h2>
          
          {docs.length === 0 ? (
            <Card className="border border-hive-border bg-white p-8 text-center text-xs text-hive-text-muted italic rounded-3xl">
              No compliance documents have been uploaded by this boutique.
            </Card>
          ) : (
            docs.map((doc) => {
              const isVerified = doc.status === "verified";
              const isRejected = doc.status === "rejected";
              const isPending = doc.status === "pending";
              const isUnlocked = overrideDocs[doc._id] || false;
              const isSubmitting = submittingId === doc._id;

              return (
                <Card key={doc._id} className={`border rounded-3xl overflow-hidden bg-white ${
                  isVerified ? "border-green-150" : isRejected ? "border-red-150" : "border-amber-150"
                }`}>
                  {/* Card Header status strip */}
                  <div className={`px-6 py-3 border-b flex justify-between items-center ${
                    isVerified ? "bg-green-50/30 border-green-100/60" :
                    isRejected ? "bg-red-50/30 border-red-100/60" :
                    "bg-amber-50/30 border-amber-100/60"
                  }`}>
                    <span className="text-xs font-bold text-slate-400">
                      Uploaded {formatDate(doc.createdAt)}
                    </span>
                    <div className="flex items-center gap-2">
                      {isVerified && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-green-100 text-green-800 border border-green-200">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                        </span>
                      )}
                      {isRejected && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-red-100 text-red-800 border border-red-200">
                          <XCircle className="w-3.5 h-3.5" /> Rejected
                        </span>
                      )}
                      {isPending && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-850 border border-amber-200 animate-pulse">
                          <Clock className="w-3.5 h-3.5" /> Awaiting Review
                        </span>
                      )}
                    </div>
                  </div>

                  <CardContent className="p-6 flex flex-col md:flex-row gap-6">
                    {/* Document Preview Box */}
                    <div className="w-full md:w-48 shrink-0 flex flex-col gap-2">
                      <div className="relative aspect-video md:aspect-square bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden flex items-center justify-center group">
                        {doc.url.startsWith("http") ? (
                          <img
                            src={doc.url}
                            alt={getDocLabel(doc.type)}
                            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-200"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-2 p-4 text-center">
                            <FileCheck className="w-8 h-8 text-slate-400" />
                            <span className="text-[10px] text-slate-500 font-bold leading-tight truncate w-full">
                              {doc.publicId}
                            </span>
                          </div>
                        )}
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noreferrer"
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold gap-1"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Open File
                        </a>
                      </div>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-bold text-hive-amber hover:underline flex items-center gap-1 justify-center mt-1"
                      >
                        <Eye className="w-3 h-3" /> View Fullscreen Source
                      </a>
                    </div>

                    {/* Review Forms & Details */}
                    <div className="flex-1 flex flex-col gap-4 text-left">
                      <div>
                        <h3 className="text-base font-black text-slate-900">
                          {getDocLabel(doc.type)}
                        </h3>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          ID: {doc._id}
                        </p>
                      </div>

                      {/* Display rejection reason if rejected */}
                      {doc.notes && (
                        <div className={`p-4 rounded-2xl border text-xs leading-relaxed ${
                          isVerified ? "bg-slate-50 text-slate-600 border-slate-200" :
                          "bg-red-50/40 text-red-800 border-red-150"
                        }`}>
                          <div className="font-bold flex items-center gap-1 mb-1">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>{isVerified ? "Auditor Archive Note:" : "Rejection Reason:"}</span>
                          </div>
                          {doc.notes}
                        </div>
                      )}

                      {/* Document Transition lock status & Toggle */}
                      {isVerified && (
                        <div className="flex items-center justify-between p-3.5 rounded-2xl border border-green-150 bg-green-50/20 text-xs">
                          <div className="flex items-center gap-2 text-green-800 font-bold">
                            <Lock className="w-3.5 h-3.5 text-green-600" />
                            <span>Document Locked (Status Transition Guard Active)</span>
                          </div>
                          <button
                            onClick={() =>
                              setOverrideDocs((prev) => ({ ...prev, [doc._id]: !prev[doc._id] }))
                            }
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold flex items-center gap-1 transition-all ${
                              isUnlocked
                                ? "bg-red-100 text-red-800 border border-red-200"
                                : "bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200"
                            }`}
                          >
                            {isUnlocked ? (
                              <>
                                <Unlock className="w-3 h-3" />
                                <span>Lock Transition</span>
                              </>
                            ) : (
                              <>
                                <Unlock className="w-3 h-3" />
                                <span>Unlock / Override</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {/* Action buttons (If pending, rejected, or unlocked verified) */}
                      {(!isVerified || isUnlocked) && (
                        <div className="flex flex-col gap-3 pt-3 border-t border-slate-100">
                          {rejectingDocId === doc._id ? (
                            // Rejection Reason Form
                            <div className="flex flex-col gap-2 animate-slide-down">
                              <label className="text-xs font-bold text-red-800 uppercase tracking-wider">
                                Enter Rejection Reason (Notes)
                              </label>
                              <textarea
                                value={rejectionNotes[doc._id] || ""}
                                onChange={(e) =>
                                  setRejectionNotes((prev) => ({ ...prev, [doc._id]: e.target.value }))
                                }
                                placeholder="E.g. GST certificate is blurry and registration number cannot be verified."
                                rows={3}
                                className="w-full text-xs p-3 border border-red-200 rounded-xl focus:outline-none focus:ring-1.5 focus:ring-red-400 bg-red-50/10"
                              />
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => handleRejectSubmit(doc._id, isVerified)}
                                  disabled={isSubmitting}
                                  variant="primary"
                                  className="bg-red-600 text-white hover:bg-red-700 text-xs font-bold py-1.5 px-3 rounded-lg"
                                >
                                  {isSubmitting ? "Submitting..." : "Confirm Reject"}
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => setRejectingDocId(null)}
                                  className="text-xs font-bold py-1.5 px-3 rounded-lg"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            // Main controls
                            <div className="flex flex-wrap gap-3">
                              <Button
                                onClick={() => handleApprove(doc._id, isVerified)}
                                disabled={isSubmitting}
                                variant="primary"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2 px-4 rounded-xl flex items-center gap-1 shadow-sm"
                              >
                                {isSubmitting ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                )}
                                <span>Verify Document</span>
                              </Button>

                              <Button
                                onClick={() => setRejectingDocId(doc._id)}
                                variant="outline"
                                className="border-red-200 bg-white text-red-700 hover:bg-red-50 font-bold text-xs py-2 px-4 rounded-xl flex items-center gap-1"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Reject Document</span>
                              </Button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Inline timeline events */}
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <span className="text-[10px] font-extrabold text-[#8E867C] uppercase tracking-wider block mb-2.5">
                          Document Timeline Logs
                        </span>
                        <div className="relative border-l border-slate-100 pl-4 space-y-3.5 ml-1">
                          {doc.events.map((ev, index) => {
                            const isUpload = ev.action === "uploaded";
                            const isView = ev.action === "viewed";
                            const isApproval = ev.action === "verified";
                            const isRejection = ev.action === "rejected";

                            return (
                              <div key={index} className="relative text-xs leading-normal">
                                <span className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border ring-2 bg-white ${
                                  isApproval ? "border-green-500 ring-green-50" :
                                  isRejection ? "border-red-500 ring-red-50" :
                                  isView ? "border-blue-500 ring-blue-50" :
                                  "border-slate-350 ring-slate-50"
                                }`} />
                                <div className="flex flex-col">
                                  <div className="flex justify-between items-baseline gap-2">
                                    <span className="font-bold text-slate-800 capitalize">
                                      {ev.action === "uploaded" ? "Document Uploaded" :
                                       ev.action === "viewed" ? "Viewed by Admin" :
                                       ev.action === "verified" ? "Verified" :
                                       ev.action === "rejected" ? "Rejected" : ev.action}
                                    </span>
                                    <span className="text-[9px] font-semibold text-slate-400 whitespace-nowrap">
                                      {formatDate(ev.createdAt)}
                                    </span>
                                  </div>
                                  {ev.note && (
                                    <span className="text-[11px] text-slate-600 mt-0.5">
                                      Reason: {ev.note}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Right Column: Global Boutique Compliance Timeline Feed */}
        <div className="flex flex-col gap-6">
          <h2 className="text-xl font-serif font-black text-hive-dark">Global Activity Feed</h2>
          
          <Card className="border border-hive-border bg-white shadow-sm overflow-hidden rounded-3xl p-5">
            <h3 className="text-xs font-bold text-hive-text-muted uppercase tracking-wider mb-4">
              Chronological Audit Trail
            </h3>
            
            {masterTimelineEvents.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4 text-center">No compliance actions recorded.</p>
            ) : (
              <div className="relative border-l border-slate-100 pl-5 space-y-6 ml-2">
                {masterTimelineEvents.map((ev, index) => {
                  const isApproval = ev.action === "verified";
                  const isRejection = ev.action === "rejected";
                  const isView = ev.action === "viewed";

                  return (
                    <div key={index} className="relative text-left">
                      {/* Bullet */}
                      <span className={`absolute -left-[25px] top-1 w-2.5 h-2.5 rounded-full border ring-4 bg-white ${
                        isApproval ? "border-green-500 ring-green-50" :
                        isRejection ? "border-red-500 ring-red-50" :
                        isView ? "border-blue-500 ring-blue-50" :
                        "border-slate-350 ring-slate-50"
                      }`} />

                      <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] font-semibold text-slate-400">
                          {formatDate(ev.createdAt)}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 leading-tight">
                          {ev.docLabel} — {
                            ev.action === "uploaded" ? "Uploaded" :
                            ev.action === "viewed" ? "Viewed by Admin" :
                            ev.action === "verified" ? "Verified" :
                            ev.action === "rejected" ? "Rejected" : ev.action
                          }
                        </h4>
                        {ev.note && (
                          <p className="text-[11px] text-slate-650 bg-slate-50 p-2 rounded-xl mt-1 leading-normal border border-slate-100">
                            <strong>Note:</strong> {ev.note}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

      </div>
    </div>
  );
}
