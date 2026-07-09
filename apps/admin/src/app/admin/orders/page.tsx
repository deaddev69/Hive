"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { Card, CardContent } from "@hive/ui";
import { formatCurrency } from "@hive/utils";
import {
  ShoppingBag,
  Clock,
  CheckCircle,
  TrendingUp,
  Search,
  Eye,
  Package,
  Filter,
  Loader2,
  ShieldX,
  X,
  MapPin,
  Store,
  User,
  CreditCard,
  Calendar,
  ArrowLeft,
  ChevronRight,
  FileDown,
  Receipt,
} from "lucide-react";
import Link from "next/link";

// ── Status badge helper ────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending_payment: "bg-yellow-50 text-yellow-700 border-yellow-200",
    pending_confirmation: "bg-amber-50 text-amber-700 border-amber-200",
    confirmed: "bg-blue-50 text-blue-700 border-blue-200",
    packed: "bg-indigo-50 text-indigo-700 border-indigo-200",
    pickup_scheduled: "bg-purple-50 text-purple-700 border-purple-200",
    picked_up: "bg-violet-50 text-violet-700 border-violet-200",
    in_transit: "bg-cyan-50 text-cyan-700 border-cyan-200",
    out_for_delivery: "bg-teal-50 text-teal-700 border-teal-200",
    delivered: "bg-green-50 text-green-700 border-green-200",
    cancelled: "bg-red-50 text-red-700 border-red-200",
    refunded: "bg-slate-50 text-slate-700 border-slate-200",
    claim_submitted: "bg-orange-50 text-orange-700 border-orange-200",
  };
  const cls = map[status] || "bg-slate-50 text-slate-600 border-slate-200";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${cls}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

function PaymentBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    paid: "bg-green-50 text-green-700 border-green-200",
    refunded: "bg-slate-50 text-slate-700 border-slate-200",
    failed: "bg-red-50 text-red-700 border-red-200",
  };
  const cls = map[status] || "bg-slate-50 text-slate-600 border-slate-200";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${cls}`}
    >
      {status}
    </span>
  );
}

// ── Admin Invoice Section ─────────────────────────────────────────────────
function AdminInvoiceSection({ orderId }: { orderId: Id<"orders"> }) {
  const invoice = useQuery(api.invoices.getInvoiceByOrderId_admin, { orderId });

  if (invoice === undefined) {
    return (
      <div className="bg-slate-50 rounded-2xl p-4 border border-hive-border/40 animate-pulse">
        <div className="h-3 w-1/3 bg-slate-200 rounded mb-2" />
        <div className="h-3 w-1/2 bg-slate-200 rounded" />
      </div>
    );
  }

  const handleDownload = () => {
    if (!invoice) return;
    if (invoice.pdfUrl) {
      window.open(invoice.pdfUrl, "_blank");
    }
  };

  return (
    <div className="bg-slate-50 rounded-2xl p-4 border border-hive-border/40">
      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
        <Receipt className="w-3 h-3" /> Invoice
      </div>

      {!invoice ? (
        <p className="text-xs text-hive-text-muted italic">Invoice not generated yet.</p>
      ) : (
        <>
          <div className="flex flex-col gap-1.5 text-xs mb-3">
            <div className="flex justify-between">
              <span className="text-slate-400">Invoice No.</span>
              <span className="font-mono font-bold text-hive-dark select-all">{invoice.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Transaction ID</span>
              <span className="font-mono text-hive-dark select-all">{invoice.transactionId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Generated</span>
              <span className="text-hive-dark">
                {new Date(invoice.generatedAt).toLocaleDateString("en-IN", {
                  day: "2-digit", month: "short", year: "numeric",
                })}
              </span>
            </div>
          </div>
          {invoice.pdfUrl ? (
            <button
              onClick={handleDownload}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-hive-dark text-hive-gold text-[10px] font-bold uppercase tracking-wider hover:bg-hive-amber/90 transition-colors"
            >
              <FileDown className="w-3.5 h-3.5" />
              Download Invoice
            </button>
          ) : (
            <p className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 font-medium">
              PDF not yet generated. Customer must download first.
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ── Admin Invoice Table Cell (compact) ────────────────────────────────────
function AdminInvoiceTableCell({ orderId }: { orderId: Id<"orders"> }) {
  const invoice = useQuery(api.invoices.getInvoiceByOrderId_admin, { orderId });

  if (invoice === undefined) {
    return <span className="inline-block w-16 h-4 bg-slate-100 rounded animate-pulse" />;
  }

  if (!invoice || !invoice.pdfUrl) {
    return (
      <span className="text-[9px] text-slate-400 font-medium italic whitespace-nowrap">
        {!invoice ? "No invoice" : "PDF pending"}
      </span>
    );
  }

  return (
    <button
      onClick={() => window.open(invoice.pdfUrl!, "_blank")}
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-hive-border bg-white text-[9px] font-bold text-hive-dark hover:bg-hive-cream hover:border-hive-gold transition-colors whitespace-nowrap"
      title={invoice.invoiceNumber}
    >
      <FileDown className="w-3 h-3 text-hive-gold" />
      PDF
    </button>
  );
}

// ── Order Detail Drawer ────────────────────────────────────────────────────
function OrderDetailDrawer({
  orderId,
  onClose,
}: {
  orderId: Id<"orders"> | null;
  onClose: () => void;
}) {
  const order = useQuery(
    api.adminOrders.getOrderDetails,
    orderId ? { orderId } : "skip"
  );
  const updateStatus = useMutation(api.adminOrders.updateOrderStatus);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    if (!orderId || !order) return;
    setUpdatingStatus(true);
    try {
      await updateStatus({ orderId, status: newStatus as any });
    } catch (err: any) {
      alert("Failed to update status: " + err.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (!orderId) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="relative w-full max-w-xl bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-hive-dark text-white px-6 py-4 flex items-center justify-between border-b border-white/10">
          <div>
            <p className="text-[10px] text-hive-gold font-bold uppercase tracking-widest">
              Order Details
            </p>
            <h2 className="text-base font-serif font-black text-white">
              {order ? order.orderNumber : "Loading..."}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {!order && (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-hive-amber" />
          </div>
        )}

        {order && (
          <div className="flex-1 flex flex-col gap-6 p-6">
            {/* Status Row */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Inline status updater */}
              <select
                value={order.status}
                disabled={updatingStatus}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-[10px] font-bold border border-hive-border bg-white focus:outline-none focus:ring-1 focus:ring-hive-gold cursor-pointer disabled:opacity-60 uppercase tracking-wide"
              >
                {[
                  "pending_payment", "pending_confirmation", "confirmed",
                  "packed", "pickup_scheduled", "picked_up",
                  "in_transit", "out_for_delivery", "delivered", "cancelled",
                ].map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                ))}
              </select>
              {updatingStatus && <Loader2 className="w-3.5 h-3.5 animate-spin text-hive-amber" />}
              <PaymentBadge status={order.paymentStatus} />
              <span className="text-[10px] text-hive-text-muted font-medium ml-auto">
                {new Date(order.createdAt).toLocaleString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>

            {/* Customer + Boutique */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-2xl p-4 border border-hive-border/40 flex flex-col gap-2">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <User className="w-3 h-3" /> Customer
                </div>
                <p className="text-sm font-bold text-hive-dark leading-snug">
                  {order.customer.displayName}
                </p>
                {order.customer.email && (
                  <p className="text-[11px] text-hive-text-muted truncate">
                    {order.customer.email}
                  </p>
                )}
                {order.customer.phone && (
                  <p className="text-[11px] text-hive-text-muted">
                    {order.customer.phone}
                  </p>
                )}
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-hive-border/40 flex flex-col gap-2">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <Store className="w-3 h-3" /> Boutique
                </div>
                <p className="text-sm font-bold text-hive-dark leading-snug">
                  {order.boutique.boutiqueName}
                </p>
                {order.boutique.ownerName && (
                  <p className="text-[11px] text-hive-text-muted">
                    {order.boutique.ownerName}
                  </p>
                )}
                {order.boutique.email && (
                  <p className="text-[11px] text-hive-text-muted truncate">
                    {order.boutique.email}
                  </p>
                )}
              </div>
            </div>

            {/* Delivery Address */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-hive-border/40">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                <MapPin className="w-3 h-3" /> Delivery Address
              </div>
              <p className="text-sm text-hive-dark font-semibold">
                {order.deliveryAddress.label}
              </p>
              <p className="text-xs text-hive-text-muted leading-relaxed">
                {order.deliveryAddress.line1}
                {order.deliveryAddress.line2 && `, ${order.deliveryAddress.line2}`}
                <br />
                {order.deliveryAddress.city}, {order.deliveryAddress.state}{" "}
                {order.deliveryAddress.pincode}
              </p>
            </div>

            {/* Order Items */}
            <div>
              <h3 className="text-sm font-bold text-hive-dark mb-3 flex items-center gap-2">
                <Package className="w-4 h-4 text-hive-gold" /> Ordered Products ({order.items.length})
              </h3>
              <div className="rounded-2xl border border-hive-border overflow-hidden">
                {order.items.map((item, idx) => (
                  <div
                    key={item._id}
                    className={`flex items-center gap-3 p-3 ${
                      idx < order.items.length - 1
                        ? "border-b border-hive-border/40"
                        : ""
                    }`}
                  >
                    {/* Image */}
                    <div className="w-12 h-14 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0 border border-hive-border/30">
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.imageUrl}
                          alt={item.productName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[8px] text-slate-400">
                          No Img
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-hive-dark truncate">
                        {item.productName}
                      </p>
                      <p className="text-[10px] text-hive-text-muted">
                        Size: <strong>{item.variantSize}</strong> · Qty:{" "}
                        <strong>{item.quantity}</strong>
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-hive-dark">
                        {formatCurrency(item.subtotal)}
                      </p>
                      <p className="text-[10px] text-hive-text-muted">
                        {formatCurrency(item.priceAtPurchase)} each
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Invoice */}
            <AdminInvoiceSection orderId={orderId} />

            {/* Price Breakdown */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-hive-border/40">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                <CreditCard className="w-3 h-3" /> Payment Summary
              </div>
              <div className="flex flex-col gap-2 text-xs">
                <div className="flex justify-between text-hive-text-muted">
                  <span>Subtotal</span>
                  <span className="font-semibold text-hive-dark">
                    {formatCurrency(order.subtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-hive-text-muted">
                  <span>Delivery Fee</span>
                  <span className="font-semibold text-hive-dark">
                    {formatCurrency(order.deliveryFee)}
                  </span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span className="font-semibold">
                      − {formatCurrency(order.discount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base text-hive-dark border-t border-hive-border/40 pt-2 mt-1">
                  <span>Total</span>
                  <span>{formatCurrency(order.total)}</span>
                </div>
              </div>
              {order.notes && (
                <p className="text-[10px] text-hive-text-muted mt-3 border-t border-hive-border/40 pt-2">
                  {order.notes}
                </p>
              )}
            </div>

            {/* Order Timeline */}
            <div>
              <h3 className="text-sm font-bold text-hive-dark mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-hive-gold" /> Order Timeline
              </h3>
              <div className="flex flex-col gap-0">
                {order.timeline.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          step.done
                            ? "bg-hive-gold border-hive-gold text-white"
                            : "bg-white border-slate-200 text-slate-300"
                        }`}
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                      </div>
                      {idx < order.timeline.length - 1 && (
                        <div
                          className={`w-0.5 h-6 mt-0.5 ${
                            step.done ? "bg-hive-gold/30" : "bg-slate-100"
                          }`}
                        />
                      )}
                    </div>
                    <div className="pb-4">
                      <p
                        className={`text-xs font-semibold ${
                          step.done ? "text-hive-dark" : "text-slate-300"
                        }`}
                      >
                        {step.label}
                      </p>
                      {step.timestamp && (
                        <p className="text-[10px] text-hive-text-muted">
                          {new Date(step.timestamp).toLocaleString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Orders Page ───────────────────────────────────────────────────────
export default function AdminOrdersPage() {
  const { isLoading: convexAuthLoading } = useConvexAuth();
  const orders = useQuery(api.adminOrders.getAllOrders, { limit: 200 });
  const metrics = useQuery(api.adminOrders.getAdminDashboardMetrics);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrderId, setSelectedOrderId] = useState<Id<"orders"> | null>(null);

  const isLoading = orders === undefined || metrics === undefined;

  if (isLoading) {
    if (convexAuthLoading) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-hive-amber" />
          <p className="text-sm text-hive-text-muted font-medium">
            Authenticating...
          </p>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-hive-amber" />
        <p className="text-sm text-hive-text-muted font-medium">
          Loading orders from Convex...
        </p>
      </div>
    );
  }

  if (!orders) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
        <ShieldX className="w-10 h-10 text-red-400" />
        <p className="text-base font-bold text-slate-700">Access Denied</p>
        <p className="text-sm text-slate-500 max-w-sm">
          You do not have admin privileges to view orders.
        </p>
      </div>
    );
  }

  // Filter
  const filtered = orders.filter((o) => {
    const matchesSearch =
      !searchTerm ||
      o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.boutiqueName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || o.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const kpiCards = [
    {
      label: "Total Orders",
      value: metrics.totalOrders,
      icon: ShoppingBag,
      color: "text-blue-500 bg-blue-50 border-blue-100",
    },
    {
      label: "Pending Orders",
      value: metrics.pendingOrders,
      icon: Clock,
      color: "text-amber-500 bg-amber-50 border-amber-100",
    },
    {
      label: "Delivered",
      value: metrics.deliveredOrders,
      icon: CheckCircle,
      color: "text-green-500 bg-green-50 border-green-100",
    },
    {
      label: "Total Revenue",
      value: formatCurrency(metrics.totalRevenue),
      icon: TrendingUp,
      color: "text-indigo-500 bg-indigo-50 border-indigo-100",
    },
  ];

  const STATUS_OPTIONS = [
    { value: "all", label: "All Statuses" },
    { value: "pending_confirmation", label: "Pending Confirmation" },
    { value: "confirmed", label: "Confirmed" },
    { value: "packed", label: "Packed" },
    { value: "in_transit", label: "In Transit" },
    { value: "out_for_delivery", label: "Out for Delivery" },
    { value: "delivered", label: "Delivered" },
    { value: "cancelled", label: "Cancelled" },
    { value: "refunded", label: "Refunded" },
  ];

  return (
    <div className="flex flex-col gap-8 text-left">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin"
          className="p-2 rounded-xl hover:bg-slate-200/50 transition-colors border border-transparent"
        >
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </Link>
        <div>
          <h1 className="text-3xl font-serif font-black text-hive-dark">
            Order Management
          </h1>
          <p className="text-sm text-hive-text-muted">
            All marketplace orders across all boutiques.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.label}
              className="border border-hive-border bg-white shadow-sm overflow-hidden p-4 sm:p-5 flex flex-col justify-between min-h-[100px] sm:min-h-[110px]"
            >
              <div className="flex justify-between items-start gap-2">
                <span className="text-[10px] sm:text-xs font-bold text-hive-text-muted uppercase tracking-wider leading-tight">
                  {card.label}
                </span>
                <div className={`p-1.5 sm:p-2 rounded-xl border shrink-0 ${card.color}`}>
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <span className="text-xl sm:text-2xl font-extrabold text-hive-dark tracking-tight mt-2 sm:mt-3">
                {card.value}
              </span>
            </Card>
          );
        })}
      </div>

      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by order #, customer, boutique..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-hive-border/60 rounded-xl focus:outline-none focus:ring-1.5 focus:ring-hive-gold bg-white"
          />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-8 pr-4 py-2 text-sm border border-hive-border/60 rounded-xl focus:outline-none focus:ring-1.5 focus:ring-hive-gold bg-white appearance-none"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <span className="text-xs text-hive-text-muted ml-auto">
          {filtered.length} of {orders.length} orders
        </span>
      </div>

      {/* Orders Table */}
      <Card className="border border-hive-border bg-white shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-hive-border/40 text-[10px] font-bold uppercase tracking-wider text-hive-text-muted">
                  <th className="px-5 py-4">Order #</th>
                  <th className="px-5 py-4">Date</th>
                  <th className="px-5 py-4">Customer</th>
                  <th className="px-5 py-4">Boutique</th>
                  <th className="px-5 py-4 text-center">Items</th>
                  <th className="px-5 py-4">Amount</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Payment</th>
                  <th className="px-5 py-4 text-center">Invoice</th>
                  <th className="px-5 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hive-border/30 font-medium text-hive-dark">
                {filtered.map((order) => (
                  <tr
                    key={order._id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="px-5 py-4 font-mono font-bold text-slate-700 whitespace-nowrap">
                      {order.orderNumber}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-hive-text-muted">
                      {new Date(order.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-5 py-4 max-w-[140px] truncate">
                      {order.customerName}
                    </td>
                    <td className="px-5 py-4 max-w-[140px] truncate text-hive-text-muted">
                      {order.boutiqueName}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px]">
                        {order.itemsCount}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-bold whitespace-nowrap">
                      {formatCurrency(order.total)}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-5 py-4">
                      <PaymentBadge status={order.paymentStatus} />
                    </td>
                    <td className="px-5 py-4 text-center">
                      <AdminInvoiceTableCell orderId={order._id} />
                    </td>
                    <td className="px-5 py-4 text-center">
                      <button
                        onClick={() => setSelectedOrderId(order._id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-hive-dark text-white text-[10px] font-bold hover:bg-hive-amber transition-colors"
                        title="View order details"
                      >
                        <Eye className="w-3 h-3" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-5 py-12 text-center text-hive-text-muted"
                    >
                      <div className="flex flex-col items-center gap-3">
                        <ShoppingBag className="w-8 h-8 text-slate-300" />
                        <span className="text-sm font-semibold">
                          No orders found
                        </span>
                        {searchTerm && (
                          <button
                            onClick={() => {
                              setSearchTerm("");
                              setStatusFilter("all");
                            }}
                            className="text-xs text-hive-amber hover:underline"
                          >
                            Clear filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Order Detail Drawer */}
      <OrderDetailDrawer
        orderId={selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
      />
    </div>
  );
}
