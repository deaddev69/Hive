"use client";

import React, { useState } from "react";
import { usePaginatedQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Button, Card, CardContent, cn } from "@hive/ui";
import { Loader2, Filter, Clock, User, Eye, Terminal } from "lucide-react";

const ENTITY_TYPES = [
  { value: "all", label: "All Entities" },
  { value: "products", label: "Products" },
  { value: "boutiques", label: "Boutiques" },
  { value: "claims", label: "Claims" },
  { value: "categories", label: "Categories" },
  { value: "users", label: "Users" },
  { value: "orders", label: "Orders" },
];

const COMMON_ACTIONS = [
  { value: "all", label: "All Actions" },
  // Product actions
  { value: "product.moderated", label: "Product Moderation Block" },
  { value: "product.unmoderated", label: "Product Moderation Lifted" },
  { value: "product.deactivated_admin", label: "Product Admin Deactivated" },
  { value: "product.reactivated_admin", label: "Product Admin Reactivated" },
  // Boutique actions
  { value: "boutique.suspended", label: "Boutique Suspended" },
  { value: "boutique.activated", label: "Boutique Activated" },
  // Claim actions
  { value: "claim.status_changed", label: "Claim Status Changed" },
  { value: "claim.refund_approved", label: "Claim Refund Approved" },
  { value: "claim.return_received", label: "Claim Return Received" },
];

export default function AuditLogsPage() {
  const [selectedEntity, setSelectedEntity] = useState("all");
  const [selectedAction, setSelectedAction] = useState("all");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const { results, status, loadMore } = usePaginatedQuery(
    api.adminAuditLogs.getAdminAuditLogs,
    {
      entityType: selectedEntity === "all" ? undefined : selectedEntity,
      action: selectedAction === "all" ? undefined : selectedAction,
    },
    { initialNumItems: 25 }
  );

  const toggleExpandLog = (id: string) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="flex flex-col gap-6 text-left">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-serif font-black text-hive-dark">System Audit Logs</h1>
        <p className="text-sm text-hive-text-muted">
          Chronological trail of administrative actions, moderation overrides, and dispute resolutions.
        </p>
      </div>

      {/* Filter Toolbar */}
      <Card className="border border-hive-border bg-white shadow-sm rounded-2xl">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
          {/* Entity Type Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 font-sans flex-1">
            <Filter className="w-4 h-4 text-hive-text-muted hidden sm:block" />
            <span className="text-xs font-bold text-hive-text-muted whitespace-nowrap">Entity Type:</span>
            <select
              value={selectedEntity}
              onChange={(e) => setSelectedEntity(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 border border-hive-border rounded-xl text-xs font-semibold text-hive-dark bg-white focus:outline-none cursor-pointer"
            >
              {ENTITY_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Action Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 font-sans flex-1">
            <span className="text-xs font-bold text-hive-text-muted whitespace-nowrap">Action Type:</span>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 border border-hive-border rounded-xl text-xs font-semibold text-hive-dark bg-white focus:outline-none cursor-pointer"
            >
              {COMMON_ACTIONS.map((act) => (
                <option key={act.value} value={act.value}>
                  {act.label}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card className="border-none bg-white shadow-none overflow-hidden rounded-2xl">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-hive-border/40 text-[10px] font-bold uppercase tracking-wider text-hive-text-muted font-sans">
                  <th className="px-6 py-4 w-10"></th>
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">Actor</th>
                  <th className="px-6 py-4">Target Entity</th>
                  <th className="px-6 py-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hive-border/30 font-semibold text-hive-dark font-sans">
                {results.map((log: any) => {
                  const isExpanded = expandedLogId === log._id;
                  const metadataParsed = log.metadata ? JSON.parse(log.metadata) : null;

                  return (
                    <React.Fragment key={log._id}>
                      <tr className={cn("hover:bg-slate-50/30 transition-colors", isExpanded && "bg-slate-50/50")}>
                        {/* Expand Icon */}
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => toggleExpandLog(log._id)}
                            className="text-slate-400 hover:text-hive-dark cursor-pointer"
                          >
                            <Terminal className={cn("w-4 h-4 transition-transform", isExpanded && "rotate-90 text-hive-gold")} />
                          </button>
                        </td>

                        {/* Timestamp */}
                        <td className="px-6 py-4 text-hive-text-muted font-medium whitespace-nowrap">
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            {formatDate(log.createdAt)}
                          </span>
                        </td>

                        {/* Action Badge */}
                        <td className="px-6 py-4">
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border",
                            (log.action.includes("moderated") || log.action.includes("suspended") || log.action.includes("deactivated"))
                              ? "bg-red-50 text-red-700 border-red-100"
                              : (log.action.includes("unmoderated") || log.action.includes("activated") || log.action.includes("reactivated"))
                              ? "bg-green-50 text-green-700 border-green-200"
                              : "bg-slate-50 text-slate-700 border-slate-200"
                          )}>
                            {log.action}
                          </span>
                        </td>

                        {/* Actor */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-400" />
                              {log.actorName}
                            </span>
                            <span className="text-[9px] text-hive-text-muted font-mono">{log.actorEmail}</span>
                          </div>
                        </td>

                        {/* Target Entity */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-hive-dark font-serif font-bold">{log.entityName}</span>
                            <span className="text-[9px] text-hive-text-muted uppercase tracking-wider font-semibold">
                              Type: {log.entityType} • ID: <span className="font-mono text-[8px] select-all">{log.entityId}</span>
                            </span>
                          </div>
                        </td>

                        {/* Details Link */}
                        <td className="px-6 py-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleExpandLog(log._id)}
                            className="px-2.5 py-1 text-[10px] font-bold rounded-lg flex items-center gap-1 ml-auto"
                          >
                            <Eye className="w-3 h-3" /> {isExpanded ? "Collapse" : "Inspect"}
                          </Button>
                        </td>
                      </tr>

                      {/* Expandable JSON details */}
                      {isExpanded && (
                        <tr className="bg-slate-50/50">
                          <td colSpan={6} className="px-6 py-4 border-t border-slate-100">
                            <div className="p-4 rounded-xl border border-slate-200 bg-slate-900 text-slate-200 font-mono text-[11px] overflow-x-auto max-w-4xl text-left select-all">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                                <Terminal className="w-3.5 h-3.5 text-hive-gold" /> Log Metadata & Properties
                              </p>
                              {metadataParsed ? (
                                <pre className="whitespace-pre-wrap">{JSON.stringify(metadataParsed, null, 2)}</pre>
                              ) : (
                                <p className="text-slate-400 italic">No structured metadata available for this action.</p>
                              )}
                              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[9px] text-slate-500 border-t border-slate-800 pt-2 font-sans">
                                <span>Log Entry ID: {log._id}</span>
                                <span>Actor Role: {log.actorRole}</span>
                                {log.ipAddress && <span>IP: {log.ipAddress}</span>}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}

                {results.length === 0 && status !== "LoadingFirstPage" && (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-hive-text-muted font-medium font-sans">
                      <p className="text-sm font-bold text-hive-dark">No audit logs found</p>
                      <p className="text-xs text-neutral-400 mt-1">
                        Try adjusting your filters for Entity Type or Action.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {(status === "LoadingFirstPage" || status === "LoadingMore") ? (
            <div className="flex justify-center items-center py-8 gap-2 text-hive-text-muted text-xs font-semibold">
              <Loader2 className="w-4 h-4 animate-spin text-hive-amber" />
              <span>Loading audit logs...</span>
            </div>
          ) : (
            status === "CanLoadMore" && (
              <div className="p-4 flex justify-center border-t border-hive-border/40">
                <Button
                  onClick={() => loadMore(20)}
                  variant="outline"
                  className="px-6 py-2 text-xs font-bold rounded-xl font-sans text-slate-700 hover:bg-slate-50 border-slate-200"
                >
                  Load More Audit Trails
                </Button>
              </div>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
}
