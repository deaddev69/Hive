"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Button, Card, CardContent } from "@hive/ui";
import { FileCheck, AlertCircle, CheckCircle2, XCircle, Loader2, Search, ArrowRight, ShieldAlert, Database, Store, User } from "lucide-react";
import Link from "next/link";

export default function ComplianceQueuePage() {
  const queue = useQuery(api.adminBoutiques.getComplianceQueueAdmin);
  const seedDocs = useMutation(api.adminBoutiques.seedBoutiqueDocumentsAdmin);

  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"pending" | "all">("pending");
  const [seeding, setSeeding] = useState(false);

  if (queue === undefined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-hive-amber" />
        <p className="text-sm text-hive-text-muted font-medium">Loading compliance queue...</p>
      </div>
    );
  }

  // Seeding helper
  const handleSeedDocs = async () => {
    setSeeding(true);
    try {
      const res = await seedDocs();
      alert(`Successfully seeded compliance documents for ${res.seededCount} boutiques!`);
    } catch (err: any) {
      alert("Failed to seed compliance documents: " + err.message);
    } finally {
      setSeeding(false);
    }
  };

  // Filter queue by search term
  const filteredQueue = queue.filter((item) => {
    const matchesSearch =
      item.boutiqueName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.ownerName.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === "pending") {
      return matchesSearch && item.compliance.pendingCount > 0;
    }
    return matchesSearch;
  });

  // Calculate metrics
  const totalBoutiques = queue.length;
  const pendingBoutiquesCount = queue.filter((item) => item.compliance.pendingCount > 0).length;
  const verifiedBoutiquesCount = queue.filter((item) => {
    // A boutique is compliant if all submitted docs are verified and they have at least 1 document
    return item.compliance.totalCount > 0 && item.compliance.verifiedCount === item.compliance.totalCount && item.compliance.pendingCount === 0;
  }).length;
  const totalPendingDocsCount = queue.reduce((sum, item) => sum + item.compliance.pendingCount, 0);

  // Helper to render doc status badge
  const renderDocBadge = (type: string, status: string) => {
    const label = type === "gst" ? "GST" : type === "pan" ? "PAN" : type === "trade" ? "Trade" : type === "bank" ? "Bank" : "ID";
    switch (status) {
      case "verified":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-green-50 border border-green-200 text-green-700">
            <CheckCircle2 className="w-2.5 h-2.5" /> {label}
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-50 border border-red-200 text-red-700">
            <XCircle className="w-2.5 h-2.5" /> {label}
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 border border-amber-200 text-amber-700 animate-pulse">
            <AlertCircle className="w-2.5 h-2.5" /> {label}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-50 border border-slate-200 text-slate-400">
            — {label}
          </span>
        );
    }
  };

  const getBoutiqueStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-700">
            APPROVED
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 border border-amber-200 text-amber-700">
            PENDING
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-50 border border-red-200 text-red-700">
            REJECTED
          </span>
        );
      case "SUSPENDED":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-rose-50 border border-rose-200 text-rose-700">
            SUSPENDED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-slate-50 border border-slate-200 text-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col gap-8 text-left">
      {/* Title & Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-black text-hive-dark">Merchant Compliance Center</h1>
          <p className="text-sm text-hive-text-muted">Verify merchant legal documents, track onboarding status, and audits.</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleSeedDocs}
            variant="outline"
            disabled={seeding}
            className="flex items-center gap-2 border-slate-200 bg-white text-slate-800 hover:bg-slate-100 hover:text-slate-800 rounded-xl text-xs py-2 px-4 font-bold"
          >
            {seeding ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />
            ) : (
              <Database className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span>Seed Mock Documents</span>
          </Button>
        </div>
      </div>

      {/* Metrics Strips */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6">
        <Card className="border border-hive-border bg-white shadow-sm overflow-hidden p-5 flex flex-col justify-between min-h-[110px]">
          <div>
            <span className="text-[10px] font-extrabold text-hive-text-muted uppercase tracking-wider">
              Awaiting Review Queue
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-2xl font-black text-hive-dark tracking-tight">
              {pendingBoutiquesCount} <span className="text-xs font-medium text-hive-text-muted">boutiques</span>
            </span>
            <span className="bg-amber-100 border border-amber-200 text-amber-800 rounded-full px-2 py-0.5 text-[10px] font-extrabold">
              Needs Action
            </span>
          </div>
        </Card>

        <Card className="border border-hive-border bg-white shadow-sm overflow-hidden p-5 flex flex-col justify-between min-h-[110px]">
          <div>
            <span className="text-[10px] font-extrabold text-hive-text-muted uppercase tracking-wider">
              Total Pending Documents
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-2xl font-black text-hive-dark tracking-tight">
              {totalPendingDocsCount} <span className="text-xs font-medium text-hive-text-muted">docs</span>
            </span>
            <span className="bg-sky-100 border border-sky-200 text-sky-850 rounded-full px-2 py-0.5 text-[10px] font-extrabold">
              Awaiting Verify
            </span>
          </div>
        </Card>

        <Card className="border border-hive-border bg-white shadow-sm overflow-hidden p-5 flex flex-col justify-between min-h-[110px]">
          <div>
            <span className="text-[10px] font-extrabold text-hive-text-muted uppercase tracking-wider">
              Fully Compliant Merchants
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-2xl font-black text-hive-dark tracking-tight">
              {verifiedBoutiquesCount} <span className="text-xs font-medium text-hive-text-muted">of {totalBoutiques}</span>
            </span>
            <span className="bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-full px-2 py-0.5 text-[10px] font-extrabold">
              {totalBoutiques > 0 ? Math.round((verifiedBoutiquesCount / totalBoutiques) * 100) : 0}% compliant
            </span>
          </div>
        </Card>

        <Card className="border border-hive-border bg-white shadow-sm overflow-hidden p-5 flex flex-col justify-between min-h-[110px]">
          <div>
            <span className="text-[10px] font-extrabold text-hive-text-muted uppercase tracking-wider">
              Registry Compliance Completion
            </span>
          </div>
          <div className="flex flex-col gap-1.5 mt-3">
            <div className="flex justify-between items-baseline">
              <span className="text-xl font-black text-hive-dark tracking-tight">
                {queue.reduce((sum, item) => sum + item.compliance.verifiedCount, 0)} Verified
              </span>
              <span className="text-xs font-medium text-hive-text-muted">
                / {queue.reduce((sum, item) => sum + item.compliance.totalCount, 0)} total
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: `${
                    queue.reduce((sum, item) => sum + item.compliance.totalCount, 0) > 0
                      ? (queue.reduce((sum, item) => sum + item.compliance.verifiedCount, 0) /
                          queue.reduce((sum, item) => sum + item.compliance.totalCount, 0)) *
                        100
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs and Search Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between border-b border-hive-border/60 pb-4">
        <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl w-full sm:w-auto">
          <button
            onClick={() => setActiveTab("pending")}
            className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-bold rounded-xl transition-all duration-150 ${
              activeTab === "pending"
                ? "bg-white text-hive-dark shadow-sm font-extrabold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Needs Action ({pendingBoutiquesCount})
          </button>
          <button
            onClick={() => setActiveTab("all")}
            className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-bold rounded-xl transition-all duration-150 ${
              activeTab === "all"
                ? "bg-white text-hive-dark shadow-sm font-extrabold"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            All Merchants ({totalBoutiques})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search boutique or owner..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-hive-border/60 focus:outline-none focus:ring-1.5 focus:ring-hive-gold text-xs bg-white font-medium text-slate-700"
          />
        </div>
      </div>

      {/* Queue Table */}
      <Card className="border border-hive-border bg-white shadow-sm overflow-hidden rounded-3xl">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Boutique / Owner</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Business Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Compliance Progress</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Document Status Checklist</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredQueue.map((item) => {
                const totalDocs = item.compliance.totalCount;
                const verifiedDocs = item.compliance.verifiedCount;
                const progressPercentage = totalDocs > 0 ? (verifiedDocs / totalDocs) * 100 : 0;
                const isFullyVerified = totalDocs > 0 && verifiedDocs === totalDocs && item.compliance.pendingCount === 0;

                return (
                  <tr key={item._id} className="hover:bg-slate-50/40 transition-colors">
                    {/* Boutique Name */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-hive-dark flex items-center gap-1.5">
                          <Store className="w-4 h-4 text-[#8E867C] shrink-0" />
                          {item.boutiqueName}
                        </span>
                        <span className="text-[11px] text-hive-text-muted flex items-center gap-1 mt-0.5">
                          <User className="w-3 h-3 text-[#A89F91]" />
                          {item.ownerName}
                        </span>
                      </div>
                    </td>

                    {/* Business Status */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getBoutiqueStatusBadge(item.status)}
                    </td>

                    {/* Compliance Progress */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1.5 max-w-[120px]">
                        <div className="flex justify-between items-center text-xs">
                          <span className={`font-black ${isFullyVerified ? "text-emerald-700" : "text-slate-800"}`}>
                            {verifiedDocs} / {totalDocs} Verified
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1">
                          <div
                            className={`h-1 rounded-full transition-all duration-300 ${
                              isFullyVerified ? "bg-emerald-500" : "bg-hive-gold"
                            }`}
                            style={{ width: `${progressPercentage}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Document Checklist */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1.5 max-w-sm">
                        {renderDocBadge("gst", item.compliance.gst)}
                        {renderDocBadge("pan", item.compliance.pan)}
                        {renderDocBadge("trade", item.compliance.tradeLicense)}
                        {renderDocBadge("bank", item.compliance.bankProof)}
                        {renderDocBadge("other", item.compliance.other)}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-3">
                        <Link href={`/admin/boutiques/${item._id}/compliance`}>
                          <Button
                            variant="primary"
                            className={`flex items-center gap-1 py-1.5 px-3.5 text-xs font-bold rounded-xl ${
                              item.compliance.pendingCount > 0
                                ? "bg-hive-amber text-hive-dark font-extrabold shadow-sm"
                                : "bg-slate-200 text-slate-800 hover:bg-slate-350"
                            }`}
                          >
                            <span>Review Docs</span>
                            {item.compliance.pendingCount > 0 && (
                              <span className="bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-extrabold">
                                {item.compliance.pendingCount}
                              </span>
                            )}
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                        
                        <Link href={`/admin/boutiques/${item._id}`}>
                          <span className="text-xs text-hive-amber font-bold hover:underline cursor-pointer">
                            Edit Profile
                          </span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredQueue.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-xs text-hive-text-muted italic">
                    {searchTerm ? "No boutiques matching search filter." : "No compliance documents require review."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
