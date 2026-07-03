"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Button, Card, CardContent, cn } from "@hive/ui";
import { Loader2, Mail, MessageSquare, Phone, Bell, Send, CheckCircle2, AlertTriangle, Clock, Eye, ShieldAlert } from "lucide-react";

export default function NotificationsPage() {
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const events = useQuery(api.adminNotifications.listNotificationEvents, {});
  const resend = useMutation(api.adminNotifications.resendNotification);

  const toggleExpandEvent = (id: string) => {
    setExpandedEventId(expandedEventId === id ? null : id);
  };

  const handleResend = async (eventId: any) => {
    setResendingId(eventId);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      const result = await resend({ eventId });
      if (result.success) {
        setSuccessMessage("Notification queued for resending successfully!");
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        setErrorMessage("Failed to queue notification for resending.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred while resending.");
    } finally {
      setResendingId(null);
    }
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

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "email":
        return <Mail className="w-3.5 h-3.5 text-blue-500" />;
      case "whatsapp":
        return <MessageSquare className="w-3.5 h-3.5 text-green-500" />;
      case "sms":
        return <Phone className="w-3.5 h-3.5 text-purple-500" />;
      case "push":
        return <Bell className="w-3.5 h-3.5 text-amber-500" />;
      default:
        return <Send className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-green-50 text-green-700 border border-green-200">
            <CheckCircle2 className="w-2.5 h-2.5" /> Sent
          </span>
        );
      case "queued":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
            <Clock className="w-2.5 h-2.5 animate-spin" /> Queued
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-red-50 text-red-700 border border-red-200">
            <AlertTriangle className="w-2.5 h-2.5" /> Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-slate-50 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  // Stats summary counts
  const totalEvents = events?.length || 0;
  const sentEvents = events?.filter(e => e.status === "sent").length || 0;
  const failedEvents = events?.filter(e => e.status === "failed").length || 0;
  const queuedEvents = events?.filter(e => e.status === "queued").length || 0;

  return (
    <div className="flex flex-col gap-6 text-left">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-serif font-black text-hive-dark">Notification Logs</h1>
        <p className="text-sm text-hive-text-muted">
          Real-time delivery stats, channel tracking, template registry, and audit trails of user notifications.
        </p>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="border border-hive-border/60 bg-white shadow-sm rounded-2xl p-4 flex flex-col gap-1">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#8E867C]">Total Triggered</span>
          <span className="text-2xl font-serif font-black text-hive-dark">{totalEvents}</span>
        </Card>
        <Card className="border border-hive-border/60 bg-white shadow-sm rounded-2xl p-4 flex flex-col gap-1">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#8E867C]">Sent Successfully</span>
          <span className="text-2xl font-serif font-black text-green-700">{sentEvents}</span>
        </Card>
        <Card className="border border-hive-border/60 bg-white shadow-sm rounded-2xl p-4 flex flex-col gap-1">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#8E867C]">Delivery Failed</span>
          <span className="text-2xl font-serif font-black text-red-600">{failedEvents}</span>
        </Card>
        <Card className="border border-hive-border/60 bg-white shadow-sm rounded-2xl p-4 flex flex-col gap-1">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#8E867C]">Pending in Queue</span>
          <span className="text-2xl font-serif font-black text-amber-500">{queuedEvents}</span>
        </Card>
      </div>

      {/* Alert Banners */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-800 text-xs px-4 py-3 rounded-xl font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-xs px-4 py-3 rounded-xl font-semibold flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
          {errorMessage}
        </div>
      )}

      {/* Events Table Card */}
      <Card className="border-none bg-white shadow-none overflow-hidden rounded-2xl">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-hive-border/40 text-[10px] font-bold uppercase tracking-wider text-hive-text-muted font-sans">
                  <th className="px-6 py-4 w-10"></th>
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Template</th>
                  <th className="px-6 py-4">Channel</th>
                  <th className="px-6 py-4">Target Entity</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hive-border/30 font-semibold text-hive-dark font-sans">
                {events?.map((event: any) => {
                  const isExpanded = expandedEventId === event._id;
                  const payloadParsed = event.payload ? JSON.parse(event.payload) : null;
                  const isResending = resendingId === event._id;

                  return (
                    <React.Fragment key={event._id}>
                      <tr className={cn("hover:bg-slate-50/30 transition-colors", isExpanded && "bg-slate-50/50")}>
                        {/* Expand Toggle */}
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => toggleExpandEvent(event._id)}
                            className="text-slate-400 hover:text-hive-dark cursor-pointer"
                          >
                            <Send className={cn("w-4 h-4 transition-transform", isExpanded && "rotate-90 text-hive-gold")} />
                          </button>
                        </td>

                        {/* Date & Time */}
                        <td className="px-6 py-4 text-hive-text-muted font-medium whitespace-nowrap">
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            {formatDate(event.createdAt)}
                          </span>
                        </td>

                        {/* Template Identifier */}
                        <td className="px-6 py-4">
                          <span className="font-bold font-mono text-xs text-hive-dark">
                            {event.template}
                          </span>
                        </td>

                        {/* Channel Badge */}
                        <td className="px-6 py-4">
                          <span className="flex items-center gap-1.5 capitalize font-medium">
                            {getChannelIcon(event.channel)}
                            {event.channel}
                          </span>
                        </td>

                        {/* Target Entity / Context */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-hive-dark font-serif font-bold capitalize">{event.entityType}</span>
                            <span className="text-[9px] text-hive-text-muted font-mono tracking-wider">
                              ID: <span className="select-all">{event.entityId}</span>
                            </span>
                          </div>
                        </td>

                        {/* Delivery Status */}
                        <td className="px-6 py-4">
                          {getStatusBadge(event.status)}
                        </td>

                        {/* Inspect & Resend buttons */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex gap-2 justify-end items-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleExpandEvent(event._id)}
                              className="px-2.5 py-1 text-[10px] font-bold rounded-lg flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" /> Inspect
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isResending}
                              onClick={() => handleResend(event._id)}
                              className="px-2.5 py-1 text-[10px] font-bold rounded-lg flex items-center gap-1 border-hive-amber/30 hover:border-hive-amber text-hive-dark hover:bg-hive-amber/5"
                            >
                              {isResending ? (
                                <Loader2 className="w-3 h-3 animate-spin text-hive-amber" />
                              ) : (
                                <Send className="w-3 h-3 text-hive-amber" />
                              )}
                              Resend
                            </Button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded View */}
                      {isExpanded && (
                        <tr className="bg-slate-50/50">
                          <td colSpan={7} className="px-6 py-4 border-t border-slate-100">
                            <div className="p-4 rounded-xl border border-slate-200 bg-slate-900 text-slate-200 font-mono text-[11px] overflow-x-auto max-w-4xl text-left select-all">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                                <Send className="w-3.5 h-3.5 text-hive-gold" /> Notification Payload & Parameters
                              </p>
                              {payloadParsed ? (
                                <pre className="whitespace-pre-wrap">{JSON.stringify(payloadParsed, null, 2)}</pre>
                              ) : (
                                <p className="text-slate-400 italic">No structured payload available for this event.</p>
                              )}
                              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[9px] text-slate-500 border-t border-slate-800 pt-2 font-sans">
                                <span>Event ID: {event._id}</span>
                                <span>Target User ID: {event.userId}</span>
                                {event.sentAt && <span>Dispatched At: {formatDate(event.sentAt)}</span>}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}

                {(!events || events.length === 0) && (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-hive-text-muted font-medium font-sans">
                      {events === undefined ? (
                        <div className="flex justify-center items-center gap-2 text-hive-text-muted text-xs font-semibold">
                          <Loader2 className="w-4 h-4 animate-spin text-hive-amber" />
                          <span>Loading event logs...</span>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm font-bold text-hive-dark">No notification logs recorded</p>
                          <p className="text-xs text-neutral-400 mt-1">
                            System notifications have not been triggered yet. Place an order to generate events.
                          </p>
                        </>
                      )}
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
