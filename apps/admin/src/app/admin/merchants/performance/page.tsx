"use client";

import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../../../convex/_generated/api";
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from "@hive/ui";
import { Award, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, Search, Trophy, ShieldAlert, Sparkles, AlertCircle, RefreshCw, BarChart2 } from "lucide-react";

export default function MerchantPerformancePage() {
  const dashboardData = useQuery(api.adminMerchants.getMerchantPerformanceDashboardAdmin);
  const [searchTerm, setSearchTerm] = useState("");
  const [leaderboardTab, setLeaderboardTab] = useState<"gmv" | "fulfillment" | "disputes">("gmv");

  if (dashboardData === undefined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-4">
        <RefreshCw className="w-8 h-8 animate-spin text-hive-amber" />
        <span className="text-sm font-semibold text-slate-500">Recalculating merchant performance statistics on-the-fly...</span>
      </div>
    );
  }

  const { boutiques, platformMetrics } = dashboardData;

  // Filter and sort for Coaching Console search
  const filteredBoutiques = boutiques.filter((b: any) =>
    b.boutiqueName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.ownerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Leaderboard lists
  const topSellers = [...boutiques]
    .sort((a, b) => b.metrics.gmv - a.metrics.gmv)
    .slice(0, 5);

  const fulfillmentChampions = [...boutiques]
    .sort((a, b) => b.metrics.fulfillmentScore - a.metrics.fulfillmentScore || b.metrics.sameDayPercent - a.metrics.sameDayPercent)
    .slice(0, 5);

  const lowDisputeLeaders = [...boutiques]
    .sort((a, b) => (a.metrics.claimRate + a.metrics.rtoRate) - (b.metrics.claimRate + b.metrics.rtoRate))
    .slice(0, 5);

  // At-Risk boutiques
  const atRiskBoutiques = boutiques.filter((b: any) => b.isAtRisk);

  // Helper to format currency
  const formatINR = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-8">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-black text-slate-900 tracking-tight">Merchant Performance Center</h1>
          <p className="text-slate-500 text-sm mt-1">
            Dynamic volume-gated quality scores, coaching recommendations, and trend directions.
          </p>
        </div>
      </div>

      {/* Platform Level Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border border-slate-200 shadow-sm bg-white rounded-2xl">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Average Platform Fulfillment Score</p>
                <h3 className="text-3xl font-bold font-serif text-slate-950 mt-2">
                  {platformMetrics.platformAverageFulfillmentScore}%
                </h3>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <BarChart2 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1.5">
              <span className={`text-[10px] font-black border rounded px-1.5 py-0.5 ${
                platformMetrics.platformAverageFulfillmentScore >= 90
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}>
                {platformMetrics.platformAverageFulfillmentScore >= 90 ? "Excellent" : "Needs Monitoring"}
              </span>
              <span className="text-[10px] text-slate-400 font-medium font-sans">Across {platformMetrics.totalActiveMerchants} active boutiques</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm bg-white rounded-2xl">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Same-Day Pickup Compliance</p>
                <h3 className="text-3xl font-bold font-serif text-slate-950 mt-2">
                  {platformMetrics.platformPickupCompliance}%
                </h3>
              </div>
              <div className="p-3 bg-amber-50 text-hive-amber rounded-xl">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1.5">
              <span className={`text-[10px] font-black border rounded px-1.5 py-0.5 ${
                platformMetrics.platformPickupCompliance >= 95
                  ? "bg-green-50 text-green-700 border-green-200"
                  : platformMetrics.platformPickupCompliance >= 90
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "bg-red-50 text-red-700 border-red-200"
              }`}>
                {platformMetrics.platformPickupCompliance >= 95 ? "Excellent (95%+)" : platformMetrics.platformPickupCompliance >= 90 ? "Healthy (90%+)" : "Needs Attention (<90%)"}
              </span>
              <span className="text-[10px] text-slate-400 font-medium font-sans">Handoffs inside 60 mins</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm bg-white rounded-2xl">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Boutique Trust Tier Sweeps</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex flex-col items-center px-2 py-0.5 bg-yellow-50 text-yellow-800 border border-yellow-250 rounded font-black text-xs">
                    <span>{platformMetrics.tierCounts.Elite}</span>
                    <span className="text-[8px] font-bold tracking-tight">ELITE</span>
                  </div>
                  <div className="flex flex-col items-center px-2 py-0.5 bg-orange-50 text-orange-850 border border-orange-250 rounded font-black text-xs">
                    <span>{platformMetrics.tierCounts.Gold}</span>
                    <span className="text-[8px] font-bold tracking-tight">GOLD</span>
                  </div>
                  <div className="flex flex-col items-center px-2 py-0.5 bg-slate-100 text-slate-800 border border-slate-250 rounded font-black text-xs">
                    <span>{platformMetrics.tierCounts.Silver}</span>
                    <span className="text-[8px] font-bold tracking-tight">SILVER</span>
                  </div>
                  <div className="flex flex-col items-center px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-250 rounded font-black text-xs">
                    <span>{platformMetrics.tierCounts.Bronze}</span>
                    <span className="text-[8px] font-bold tracking-tight">BRONZE</span>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                <Award className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-[10px] text-slate-450 font-medium font-sans">Dynamic volume-gated classifications</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* At-Risk Warning Panel (Stripe-desaturated Alert layout) */}
      {atRiskBoutiques.length > 0 && (
        <Card className="border border-rose-200 bg-rose-50 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="bg-rose-100/50 py-3 border-b border-rose-200/50">
            <div className="flex items-center gap-2 text-rose-800 font-bold text-xs uppercase tracking-wider">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>Needs Handoff/Quality Handoff Monitoring ({atRiskBoutiques.length} Merchants At Risk)</span>
            </div>
          </CardHeader>
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {atRiskBoutiques.map((b: any) => (
              <div key={b.boutiqueId} className="bg-white border border-rose-200 rounded-xl p-3 flex flex-col justify-between gap-1.5 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-bold text-slate-900">{b.boutiqueName}</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">Owner: {b.ownerName}</p>
                  </div>
                  <span className="inline-flex px-1.5 py-0.5 bg-rose-50 border border-rose-200 rounded text-[9px] font-black text-rose-700 tracking-wider">
                    Score: {b.metrics.fulfillmentScore}%
                  </span>
                </div>
                <div className="border-t border-slate-100 pt-2 flex flex-col gap-1">
                  <div className="text-[10px] text-slate-500 font-sans">
                    <strong className="text-rose-600">{b.coaching.primaryIssue}:</strong> {b.coaching.impactDescription}
                  </div>
                  <div className="text-[9px] text-slate-450 bg-slate-50 p-1.5 rounded border border-slate-100 italic">
                    Recommendation: {b.coaching.recommendedAction}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Leaderboards & Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leaderboard Panel */}
        <Card className="border border-slate-200 shadow-sm bg-white rounded-2xl lg:col-span-1">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="text-base font-serif font-black flex items-center gap-2">
              <Trophy className="w-5 h-5 text-hive-amber" />
              <span>Boutique Leaderboards</span>
            </CardTitle>
            <div className="flex gap-1 mt-3">
              <button
                onClick={() => setLeaderboardTab("gmv")}
                className={`flex-1 text-[10px] font-bold py-1 px-2 border rounded-lg transition-all ${
                  leaderboardTab === "gmv"
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-slate-50 text-slate-500 hover:bg-slate-100 border-slate-200"
                }`}
              >
                Top GMV
              </button>
              <button
                onClick={() => setLeaderboardTab("fulfillment")}
                className={`flex-1 text-[10px] font-bold py-1 px-2 border rounded-lg transition-all ${
                  leaderboardTab === "fulfillment"
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-slate-50 text-slate-500 hover:bg-slate-100 border-slate-200"
                }`}
              >
                Fulfillment
              </button>
              <button
                onClick={() => setLeaderboardTab("disputes")}
                className={`flex-1 text-[10px] font-bold py-1 px-2 border rounded-lg transition-all ${
                  leaderboardTab === "disputes"
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-slate-50 text-slate-500 hover:bg-slate-100 border-slate-200"
                }`}
              >
                Low Disputes
              </button>
            </div>
          </CardHeader>
          <CardContent className="pt-4 px-4 pb-4">
            <div className="space-y-3">
              {leaderboardTab === "gmv" &&
                topSellers.map((b: any, idx) => (
                  <div key={b.boutiqueId} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-serif font-black text-slate-400 w-4">#{idx + 1}</span>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-900">{b.boutiqueName}</span>
                        <span className="text-[9px] text-slate-400">Tiers: {b.trustTier}</span>
                      </div>
                    </div>
                    <span className="text-xs font-black text-emerald-700">{formatINR(b.metrics.gmv)}</span>
                  </div>
                ))}

              {leaderboardTab === "fulfillment" &&
                fulfillmentChampions.map((b: any, idx) => (
                  <div key={b.boutiqueId} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-serif font-black text-slate-400 w-4">#{idx + 1}</span>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-900">{b.boutiqueName}</span>
                        <span className="text-[9px] text-slate-450">Same-Day: {b.metrics.sameDayPercent}%</span>
                      </div>
                    </div>
                    <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Score: {b.metrics.fulfillmentScore}%
                    </span>
                  </div>
                ))}

              {leaderboardTab === "disputes" &&
                lowDisputeLeaders.map((b: any, idx) => (
                  <div key={b.boutiqueId} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-serif font-black text-slate-400 w-4">#{idx + 1}</span>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-900">{b.boutiqueName}</span>
                        <span className="text-[9px] text-slate-450">Claims: {b.metrics.claimRate}% | RTO: {b.metrics.rtoRate}%</span>
                      </div>
                    </div>
                    <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-black bg-green-50 text-green-700 border border-green-200">
                      Total: {Math.round((b.metrics.claimRate + b.metrics.rtoRate) * 10) / 10}%
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Coaching & Table Console */}
        <Card className="border border-slate-200 shadow-sm bg-white rounded-2xl lg:col-span-2 flex flex-col">
          <CardHeader className="border-b border-slate-100 pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-base font-serif font-black flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-indigo-650" />
                <span>Operational Quality & Coaching Panel</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-400 mt-1">
                Recalculated trajectory trends and action logs.
              </CardDescription>
            </div>
            {/* Search Input */}
            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search boutique or owner..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto flex-1">
            <table className="w-full border-collapse text-left text-xs min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                  <th className="py-3 px-4">Boutique</th>
                  <th className="py-3 px-4">Score</th>
                  <th className="py-3 px-4 text-center">Trend</th>
                  <th className="py-3 px-4 text-center">Tier</th>
                  <th className="py-3 px-4">Primary issue</th>
                  <th className="py-3 px-4">Action Recommendation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBoutiques.length > 0 ? (
                  filteredBoutiques.map((b: any) => (
                    <tr key={b.boutiqueId} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{b.boutiqueName}</div>
                        <div className="text-[10px] text-slate-400">Vol: {b.metrics.orders} orders</div>
                      </td>
                      <td className="py-3.5 px-4 font-serif font-bold text-slate-900">
                        {b.metrics.fulfillmentScore}%
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center justify-center">
                          {b.trend === "improving" ? (
                            <span className="p-1 bg-green-50 text-green-700 border border-green-200 rounded-full" title="Improving">
                              <TrendingUp className="w-3.5 h-3.5" />
                            </span>
                          ) : b.trend === "declining" ? (
                            <span className="p-1 bg-rose-50 text-rose-700 border border-rose-250 rounded-full" title="Declining">
                              <TrendingDown className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <span className="p-1 bg-slate-100 text-slate-500 border border-slate-200 rounded-full" title="Stable">
                              <Minus className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black border uppercase tracking-wider ${
                          b.trustTier === "Elite"
                            ? "bg-yellow-50 text-yellow-850 border-yellow-250"
                            : b.trustTier === "Gold"
                            ? "bg-orange-50 text-orange-850 border-orange-200"
                            : b.trustTier === "Silver"
                            ? "bg-slate-100 text-slate-800 border-slate-250"
                            : "bg-amber-50 text-amber-800 border-amber-250"
                        }`}>
                          {b.trustTier}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 max-w-[150px] truncate">
                        <div className="font-semibold text-slate-800">{b.coaching.primaryIssue}</div>
                        <div className="text-[10px] text-slate-400 truncate">{b.coaching.impactDescription}</div>
                      </td>
                      <td className="py-3.5 px-4 max-w-[200px] text-slate-500 italic text-[10px] leading-relaxed">
                        {b.coaching.recommendedAction}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400 font-semibold">
                      No boutiques matching search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
