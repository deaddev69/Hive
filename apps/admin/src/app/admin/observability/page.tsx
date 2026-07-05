"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { 
  ShieldAlert, 
  Activity, 
  CheckCircle, 
  AlertTriangle, 
  Play, 
  RefreshCw, 
  Clock, 
  Database,
  Search, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown, 
  Minus 
} from "lucide-react";
import { Button } from "@hive/ui";

const formatRelativeTime = (timestamp?: number) => {
  if (!timestamp) return "Never";
  const diff = Date.now() - timestamp;
  if (diff < 0) return "Just now";
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export default function ObservabilityPage() {
  const data = useQuery(api.adminObservability.getObservabilityDashboardAdmin);
  const resolveAlert = useMutation(api.adminObservability.resolveSystemAlertAdmin);
  const triggerCron = useMutation(api.adminObservability.triggerCronJobAdmin);
  const seedMockData = useMutation(api.adminObservability.seedObservabilityDataAdmin);

  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [runningCron, setRunningCron] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  const handleResolveAlert = async (alertId: any) => {
    setResolvingId(alertId);
    try {
      await resolveAlert({ alertId });
    } catch (err) {
      console.error(err);
    } finally {
      setResolvingId(null);
    }
  };

  const handleTriggerCron = async (cronName: "settlement_cron" | "performance_recalc" | "reconciliation_scan") => {
    setRunningCron(cronName);
    try {
      await triggerCron({ cronName });
    } catch (err) {
      console.error(err);
    } finally {
      setRunningCron(null);
    }
  };

  const handleSeedMockData = async () => {
    setSeeding(true);
    try {
      await seedMockData();
    } catch (err) {
      console.error(err);
    } finally {
      setSeeding(false);
    }
  };

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <Activity className="w-8 h-8 animate-spin text-hive-gold" />
          <span className="text-sm font-semibold text-slate-500">Loading observability metrics...</span>
        </div>
      </div>
    );
  }

  const { healthScore, yesterdayScore, avg7DayScore, needsImmediateAttention, backlogs, alertsBreakdown, unresolvedAlerts, crons } = data;

  // Render trend icon & color helper
  const renderTrend = (current: number, compare: number) => {
    const diff = current - compare;
    if (diff > 1) {
      return (
        <span className="flex items-center gap-1 text-emerald-600 font-bold text-xs">
          <TrendingUp className="w-3.5 h-3.5" />
          +{diff}
        </span>
      );
    } else if (diff < -1) {
      return (
        <span className="flex items-center gap-1 text-rose-600 font-bold text-xs">
          <TrendingDown className="w-3.5 h-3.5" />
          {diff}
        </span>
      );
    } else {
      return (
        <span className="flex items-center gap-1 text-slate-500 font-semibold text-xs">
          <Minus className="w-3.5 h-3.5" />
          Stable
        </span>
      );
    }
  };

  // Radial SVG health score math
  const radius = 50;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (healthScore / 100) * circumference;

  return (
    <div className="flex flex-col gap-8 text-left">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Activity className="w-7 h-7 text-hive-gold animate-pulse" />
            Observability Center
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Hive Platform Gauges, Warning Lights, and Operations Backlogs control tower.
          </p>
        </div>
        <Button 
          onClick={handleSeedMockData} 
          disabled={seeding}
          variant="outline"
          className="rounded-xl text-xs py-2 h-9 border-slate-200 hover:bg-slate-50"
        >
          {seeding ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin mr-2" />
          ) : (
            <Database className="w-3.5 h-3.5 mr-2" />
          )}
          Seed Observability Logs
        </Button>
      </div>

      {/* Needs Immediate Attention panel */}
      {needsImmediateAttention && needsImmediateAttention.length > 0 ? (
        <div className="bg-rose-50/60 border border-rose-100 rounded-3xl p-6 flex flex-col gap-4 shadow-sm">
          <div className="flex items-center gap-2 text-rose-800">
            <AlertCircle className="w-5 h-5 text-rose-600" />
            <span className="font-serif font-black text-base tracking-tight">🚨 Needs Immediate Attention</span>
          </div>
          <div className="flex flex-wrap gap-4">
            {needsImmediateAttention.map((item: any, idx: number) => (
              <div 
                key={idx} 
                className={`flex items-center justify-between p-4 rounded-2xl border flex-1 min-w-[220px] max-w-[300px] ${
                  item.severity === "critical" 
                    ? "bg-rose-100/50 border-rose-200 text-rose-950" 
                    : "bg-amber-100/50 border-amber-200 text-amber-950"
                }`}
              >
                <span className="text-xs font-bold">{item.label}</span>
                <span className={`text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full ${
                  item.severity === "critical" 
                    ? "bg-rose-600 text-white" 
                    : "bg-amber-500 text-white"
                }`}>
                  {item.severity}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50/60 border border-emerald-100 rounded-3xl p-6 flex items-center gap-3 shadow-sm text-emerald-800">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          <span className="text-xs font-bold">All platform queues are healthy. No immediate operational intervention needed.</span>
        </div>
      )}

      {/* Health Score & Error Alert Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Marketplace Health Executive Dial */}
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-center gap-8">
          
          {/* Radial progress meter */}
          <div className="relative flex items-center justify-center shrink-0">
            <svg className="w-36 h-36 transform -rotate-90">
              <circle
                cx="72"
                cy="72"
                r={radius}
                stroke="#F1F5F9"
                strokeWidth={strokeWidth}
                fill="transparent"
              />
              <circle
                cx="72"
                cy="72"
                r={radius}
                stroke={healthScore >= 90 ? "#10B981" : healthScore >= 75 ? "#F59E0B" : "#EF4444"}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-3xl font-serif font-black text-slate-900 leading-none">{healthScore}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Health</span>
            </div>
          </div>

          {/* Details breakdown */}
          <div className="flex-1 flex flex-col gap-4 w-full">
            <div className="flex flex-col">
              <span className="font-serif font-black text-slate-900 tracking-tight text-lg">Marketplace Health Score</span>
              <span className="text-xs text-slate-400 font-medium mt-0.5">derived from SLA, Claims, RTO, Backlogs, and Open Alerts.</span>
            </div>
            
            <div className="grid grid-cols-3 gap-4 border-t border-slate-50 pt-4">
              <div className="flex flex-col bg-slate-50/50 p-3 rounded-2xl border border-slate-100/50">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Today</span>
                <span className="text-xl font-serif font-black text-slate-900 mt-1">{healthScore}</span>
              </div>
              <div className="flex flex-col bg-slate-50/50 p-3 rounded-2xl border border-slate-100/50">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  Yesterday
                  {renderTrend(healthScore, yesterdayScore)}
                </span>
                <span className="text-xl font-serif font-black text-slate-900 mt-1">{yesterdayScore}</span>
              </div>
              <div className="flex flex-col bg-slate-50/50 p-3 rounded-2xl border border-slate-100/50">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  7-Day Avg
                  {renderTrend(healthScore, avg7DayScore)}
                </span>
                <span className="text-xl font-serif font-black text-slate-900 mt-1">{avg7DayScore}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Alerts Breakdown Counter */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
          <span className="font-serif font-black text-slate-900 tracking-tight text-base">Error Code Indicators</span>
          <div className="flex flex-col gap-2.5">
            {Object.entries(alertsBreakdown).map(([code, count]: [string, any]) => (
              <div key={code} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-none">
                <span className="text-xs font-mono font-bold text-slate-600">{code}</span>
                <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full ${
                  count > 0 
                    ? "bg-rose-50 border border-rose-100 text-rose-600 animate-pulse" 
                    : "bg-slate-50 text-slate-400"
                }`}>
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Operational Backlogs Grid */}
      <div className="flex flex-col gap-4">
        <span className="font-serif font-black text-slate-900 tracking-tight text-lg">Operational Backlogs</span>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Settlements</span>
            <span className="text-xl font-serif font-black text-slate-900 mt-1">{backlogs.settlementBacklog}</span>
            <span className="text-[9px] text-slate-400 mt-1 font-medium">Unpaid releases</span>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Payouts</span>
            <span className="text-xl font-serif font-black text-slate-900 mt-1">{backlogs.payoutBacklog}</span>
            <span className="text-[9px] text-slate-400 mt-1 font-medium">Wallets ready</span>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Claims</span>
            <span className="text-xl font-serif font-black text-slate-900 mt-1">{backlogs.claimBacklog}</span>
            <span className="text-[9px] text-slate-400 mt-1 font-medium">Active disputes</span>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Compliance</span>
            <span className="text-xl font-serif font-black text-slate-900 mt-1">{backlogs.complianceBacklog}</span>
            <span className="text-[9px] text-slate-400 mt-1 font-medium">Stores with pending docs</span>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Exceptions</span>
            <span className="text-xl font-serif font-black text-rose-600 mt-1">{backlogs.logisticsExceptions}</span>
            <span className="text-[9px] text-rose-400 mt-1 font-medium">Failed shipments</span>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Failed Refunds</span>
            <span className="text-xl font-serif font-black text-rose-600 mt-1">{backlogs.failedRefundsCount}</span>
            <span className="text-[9px] text-rose-400 mt-1 font-medium">Refund queue errors</span>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Stuck Refunds</span>
            <span className="text-xl font-serif font-black text-amber-500 mt-1">{backlogs.stuckRefundsCount}</span>
            <span className="text-[9px] text-amber-500 mt-1 font-medium">Pending &gt;24h</span>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">RTO Rate</span>
            <span className="text-xl font-serif font-black text-slate-900 mt-1">{backlogs.rtoRate}%</span>
            <span className="text-[9px] text-slate-400 mt-1 font-medium">Returned ratio</span>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Same-Day SLA</span>
            <span className={`text-xl font-serif font-black mt-1 ${
              backlogs.sameDaySlaPercent >= 90 ? "text-emerald-600" : "text-amber-500"
            }`}>{backlogs.sameDaySlaPercent}%</span>
            <span className="text-[9px] text-slate-400 mt-1 font-medium">Hyperlocal SLA success</span>
          </div>

        </div>
      </div>

      {/* System Alerts Incident Log */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-50 mb-4">
          <span className="font-serif font-black text-slate-900 tracking-tight text-base flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-500" />
            Unresolved System Incidents ({unresolvedAlerts.length})
          </span>
        </div>

        {unresolvedAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400 text-center">
            <CheckCircle className="w-8 h-8 text-emerald-500 mb-2" />
            <span className="text-xs font-bold">Excellent! No unresolved alerts active.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3">Severity</th>
                  <th className="py-3">Code</th>
                  <th className="py-3">Message</th>
                  <th className="py-3">Triggered</th>
                  <th className="py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {unresolvedAlerts.map((alert: any) => (
                  <tr key={alert._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                        alert.severity === "critical"
                          ? "bg-rose-50 border border-rose-100 text-rose-600"
                          : alert.severity === "warning"
                          ? "bg-amber-50 border border-amber-100 text-amber-600"
                          : "bg-blue-50 border border-blue-100 text-blue-600"
                      }`}>
                        {alert.severity}
                      </span>
                    </td>
                    <td className="py-4 font-mono font-bold text-slate-700">{alert.code}</td>
                    <td className="py-4 text-slate-600 pr-4">{alert.message}</td>
                    <td className="py-4 text-slate-400 whitespace-nowrap">
                      {formatRelativeTime(alert.createdAt)}
                    </td>
                    <td className="py-4 text-right">
                      <Button
                        onClick={() => handleResolveAlert(alert._id)}
                        disabled={resolvingId === alert._id}
                        className="rounded-xl text-[10px] font-extrabold py-1.5 h-7 px-3 bg-slate-900 hover:bg-slate-800 text-white border-none"
                      >
                        {resolvingId === alert._id ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          "Resolve"
                        )}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cron Job Visibility Board */}
      <div className="flex flex-col gap-4">
        <span className="font-serif font-black text-slate-900 tracking-tight text-lg">System Crons Visibility & Runners</span>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Settlement Cron */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between h-full gap-5">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Settlement Cron</span>
                <span className={`w-2.5 h-2.5 rounded-full ${
                  crons.settlementCronRun?.status === "success" ? "bg-emerald-500 animate-pulse" : crons.settlementCronRun?.status === "failed" ? "bg-rose-500 animate-pulse" : "bg-slate-300"
                }`} />
              </div>
              <h3 className="font-serif font-black text-slate-950 text-base tracking-tight">release_eligibility_cron</h3>
              <p className="text-xs text-slate-400 font-medium">Releases boutique settlement funds once customer claim window expires.</p>
              
              <div className="flex flex-col bg-slate-50/50 border border-slate-100 rounded-2xl p-4 gap-2.5 mt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-bold">Last Run:</span>
                  <span className="text-slate-800 font-semibold">
                    {crons.settlementCronRun ? formatRelativeTime(crons.settlementCronRun.createdAt) : "Never"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-bold">Duration:</span>
                  <span className="text-slate-800 font-semibold font-mono">
                    {crons.settlementCronRun ? `${crons.settlementCronRun.durationMs}ms` : "-"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-bold">Orders Released:</span>
                  <span className="text-slate-800 font-extrabold font-mono">
                    {crons.settlementCronRun?.metrics?.ordersReleased ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-bold">Frozen Failures:</span>
                  <span className={`font-extrabold font-mono ${
                    (crons.settlementCronRun?.metrics?.failures ?? 0) > 0 ? "text-amber-500" : "text-slate-800"
                  }`}>
                    {crons.settlementCronRun?.metrics?.failures ?? 0}
                  </span>
                </div>
              </div>
            </div>

            <Button
              onClick={() => handleTriggerCron("settlement_cron")}
              disabled={runningCron === "settlement_cron"}
              className="w-full rounded-xl text-xs py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold border-none"
            >
              {runningCron === "settlement_cron" ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 mr-2 shrink-0" />
                  Trigger Settlement Cron
                </>
              )}
            </Button>
          </div>

          {/* Performance Recalc */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between h-full gap-5">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Performance Recalc</span>
                <span className={`w-2.5 h-2.5 rounded-full ${
                  crons.performanceRecalcRun?.status === "success" ? "bg-emerald-500 animate-pulse" : crons.performanceRecalcRun?.status === "failed" ? "bg-rose-500 animate-pulse" : "bg-slate-300"
                }`} />
              </div>
              <h3 className="font-serif font-black text-slate-950 text-base tracking-tight">performance_recalc_cron</h3>
              <p className="text-xs text-slate-400 font-medium">Recalculates SLA ratios, claims dockets, and seeds executive health scores.</p>
              
              <div className="flex flex-col bg-slate-50/50 border border-slate-100 rounded-2xl p-4 gap-2.5 mt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-bold">Last Run:</span>
                  <span className="text-slate-800 font-semibold">
                    {crons.performanceRecalcRun ? formatRelativeTime(crons.performanceRecalcRun.createdAt) : "Never"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-bold">Duration:</span>
                  <span className="text-slate-800 font-semibold font-mono">
                    {crons.performanceRecalcRun ? `${crons.performanceRecalcRun.durationMs}ms` : "-"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-bold">Merchants Updated:</span>
                  <span className="text-slate-800 font-extrabold font-mono">
                    {crons.performanceRecalcRun?.metrics?.merchantsUpdated ?? 0}
                  </span>
                </div>
              </div>
            </div>

            <Button
              onClick={() => handleTriggerCron("performance_recalc")}
              disabled={runningCron === "performance_recalc"}
              className="w-full rounded-xl text-xs py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold border-none"
            >
              {runningCron === "performance_recalc" ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 mr-2 shrink-0" />
                  Trigger Performance Recalc
                </>
              )}
            </Button>
          </div>

          {/* Reconciliation Scan */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between h-full gap-5">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Reconciliation Scan</span>
                <span className={`w-2.5 h-2.5 rounded-full ${
                  crons.reconciliationScanRun?.status === "success" ? "bg-emerald-500 animate-pulse" : crons.reconciliationScanRun?.status === "failed" ? "bg-rose-500 animate-pulse" : "bg-slate-300"
                }`} />
              </div>
              <h3 className="font-serif font-black text-slate-950 text-base tracking-tight">ledger_reconciliation_scan</h3>
              <p className="text-xs text-slate-400 font-medium">Manual on-demand Scan. Validates order totals againstPlatform/Boutique accruals.</p>
              
              <div className="flex flex-col bg-slate-50/50 border border-slate-100 rounded-2xl p-4 gap-2.5 mt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-bold">Last Run:</span>
                  <span className="text-slate-800 font-semibold">
                    {crons.reconciliationScanRun ? formatRelativeTime(crons.reconciliationScanRun.createdAt) : "Never"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-bold">Duration:</span>
                  <span className="text-slate-800 font-semibold font-mono">
                    {crons.reconciliationScanRun ? `${crons.reconciliationScanRun.durationMs}ms` : "-"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-bold">Exceptions Found:</span>
                  <span className={`font-extrabold font-mono ${
                    (crons.reconciliationScanRun?.metrics?.exceptionsFound ?? 0) > 0 ? "text-rose-600 animate-bounce" : "text-slate-800"
                  }`}>
                    {crons.reconciliationScanRun?.metrics?.exceptionsFound ?? 0}
                  </span>
                </div>
              </div>
            </div>

            <Button
              onClick={() => handleTriggerCron("reconciliation_scan")}
              disabled={runningCron === "reconciliation_scan"}
              className="w-full rounded-xl text-xs py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold border-none"
            >
              {runningCron === "reconciliation_scan" ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 mr-2 shrink-0" />
                  Trigger Reconciliation Scan
                </>
              )}
            </Button>
          </div>

        </div>
      </div>

    </div>
  );
}
