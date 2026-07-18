"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Card, CardContent, Button } from "@hive/ui";
import { formatCurrency, toast } from "@hive/utils";
import {
  Loader2,
  ShieldX,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Trophy,
  AlertCircle,
  TrendingUp,
  Package2,
  FileText,
  Check,
  Medal,
  Shield,
  Star,
  ChevronDown
} from "lucide-react";
import Link from "next/link";

// 1. StatusBadge component with premium light pastel colors
function StatusBadge({ variant, label, icon: Icon }: { variant: "success" | "info" | "warning"; label: string; icon?: React.ComponentType<any> }) {
  const styles = {
    success: "bg-[#EAF6ED] text-[#2E7D32] border-[#C6EBD3]/40",
    info: "bg-[#E8F0FE] text-[#1A73E8] border-[#D2E3FC]/40",
    warning: "bg-[#FEF3D6] text-[#B06000] border-[#FDE7B9]/40",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold tracking-wide ${styles[variant]}`}>
      {Icon && <Icon className="w-3 h-3 stroke-[2.2]" />}
      <span>{label}</span>
    </span>
  );
}

// 2. StatusRow component designed for the light theme card
interface StatusRowProps {
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  badge: React.ReactNode;
  iconColorClass: string;
  iconBgClass: string;
  iconBorderClass: string;
}

function StatusRow({ title, description, icon: Icon, badge, iconColorClass, iconBgClass, iconBorderClass }: StatusRowProps) {
  return (
    <div className="flex items-center justify-between border-b border-hive-border/40 pb-3 last:border-0 last:pb-0">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${iconBorderClass} ${iconBgClass} ${iconColorClass}`}>
          <Icon className="w-4.5 h-4.5 stroke-[1.75]" />
        </div>
        <div className="flex flex-col text-left">
          <span className="text-xs font-bold text-hive-text leading-tight">{title}</span>
          {description && <span className="text-[10px] text-hive-text-muted font-medium mt-0.5">{description}</span>}
        </div>
      </div>
      {badge}
    </div>
  );
}

export default function BoutiqueDashboard() {
  const { isLoading: convexAuthLoading } = useConvexAuth();
  const boutique = useQuery(api.boutiques.getMyBoutiqueDetails);
  const products = useQuery(api.products.getBoutiqueProducts);
  const orders = useQuery(api.orders.getBoutiqueOrders);
  const tierStats = useQuery(api.boutiques.getBoutiqueTierAndStats, boutique ? { boutiqueId: boutique._id } : "skip");

  const toggleAvailability = useMutation(api.boutiques.toggleBoutiqueAvailability);
  const updateStatus = useMutation(api.boutiques.updateStoreStatus);

  const [isPending, setIsPending] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

  const handleToggleAvailability = async () => {
    if (!boutique) return;
    setIsPending(true);
    try {
      const nextVal = !boutique.isAcceptingOrders;
      await toggleAvailability({ isAcceptingOrders: nextVal });
      toast.success(nextVal ? "Store is now accepting orders!" : "Store order acceptance paused.");
    } catch (e) {
      toast.error("Failed to update order acceptance status.");
      console.error(e);
    } finally {
      setIsPending(false);
    }
  };

  const handleUpdateStatus = async (newStatus: "open" | "busy" | "closed") => {
    if (!boutique) return;
    setIsPending(true);
    try {
      await updateStatus({ storeStatus: newStatus });
      toast.success(`Store status updated to ${newStatus.toUpperCase()}`);
    } catch (e) {
      toast.error("Failed to update store status.");
      console.error(e);
    } finally {
      setIsPending(false);
    }
  };

  const [waitedLong, setWaitedLong] = useState(false);
  useEffect(() => {
    if (convexAuthLoading) return;
    const t = setTimeout(() => setWaitedLong(true), 6000);
    return () => clearTimeout(t);
  }, [convexAuthLoading]);

  // Determine if stock verification is done for today
  const isStockVerifiedToday = useMemo(() => {
    if (!products || products.length === 0) return true;
    return products.every((prod: any) => {
      if (!prod.lastVerifiedAt) return false;
      const date = new Date(prod.lastVerifiedAt);
      const today = new Date();
      return (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
      );
    });
  }, [products]);

  // Count items with stock <= 2 but > 0
  const lowStockCount = useMemo(() => {
    if (!products) return 0;
    let count = 0;
    products.forEach((p: any) => {
      p.sizes.forEach((sz: string) => {
        const stock = p.stockBySize[sz] ?? 0;
        if (stock > 0 && stock <= 2) {
          count++;
        }
      });
    });
    return count;
  }, [products]);

  const isCreatedToday = (order: any) => {
    const date = new Date(order._creationTime);
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Metrics calculations
  const ordersNewToday = useMemo(() => {
    return orders?.filter(isCreatedToday).length ?? 0;
  }, [orders]);

  const salesToday = useMemo(() => {
    return orders
      ?.filter(isCreatedToday)
      ?.reduce((sum: number, o: any) => sum + (o.total ?? 0), 0) ?? 0;
  }, [orders]);

  const toPackCount = useMemo(() => {
    return orders?.filter((o: any) => o.status === "confirmed").length ?? 0;
  }, [orders]);

  const pendingConfirmationCount = useMemo(() => {
    return orders?.filter((o: any) => o.status === "pending_confirmation").length ?? 0;
  }, [orders]);

  const salesHistory7Days = useMemo(() => {
    if (!orders) return [0, 0, 0, 0, 0, 0, 0];
    const dailyTotals = Array(7).fill(0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    orders.forEach((o: any) => {
      const orderDate = new Date(o._creationTime);
      orderDate.setHours(0, 0, 0, 0);
      const diffTime = today.getTime() - orderDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays < 7) {
        dailyTotals[6 - diffDays] += o.total ?? 0;
      }
    });
    return dailyTotals;
  }, [orders]);

  const isTrendEmpty = useMemo(() => {
    return salesHistory7Days.every(val => val === 0);
  }, [salesHistory7Days]);

  const sparklinePoints = useMemo(() => {
    const maxVal = Math.max(...salesHistory7Days, 1);
    const height = 30;
    const width = 110;
    const padding = 2;
    const usableHeight = height - padding * 2;
    
    return salesHistory7Days
      .map((val, idx) => {
        const x = (idx / 6) * width;
        const y = height - padding - (val / maxVal) * usableHeight;
        return `${x},${y}`;
      })
      .join(" ");
  }, [salesHistory7Days]);

  const recentOrders = useMemo(() => {
    if (!orders) return [];
    return orders.slice(0, 3);
  }, [orders]);

  // Delivery Rating: 30-day Merchant Fulfillment Rate
  const deliveryRatingData = useMemo(() => {
    if (!orders || orders.length === 0) {
      return { label: "Excellent", percentage: 100, variant: "success" as const, icon: Sparkles };
    }
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysMs = thirtyDaysAgo.getTime();

    let totalClosedOrders = 0;
    let deliveredOrders = 0;

    orders.forEach((o: any) => {
      if (o._creationTime >= thirtyDaysMs) {
        if (o.status === "delivered") {
          totalClosedOrders++;
          deliveredOrders++;
        } else if (o.status === "cancelled") {
          const reason = (o.cancelReason || "").toLowerCase();
          // Count merchant-initiated cancellations against their fulfillment rate
          const isMerchantFault = reason.includes("out of stock") || reason.includes("stock") || reason.includes("boutique owner") || reason.includes("merchant");
          if (isMerchantFault) {
            totalClosedOrders++;
          }
        }
      }
    });

    if (totalClosedOrders === 0) {
      return { label: "Excellent", percentage: 100, variant: "success" as const, icon: Sparkles };
    }

    const rate = Math.round((deliveredOrders / totalClosedOrders) * 100);
    
    if (rate >= 98) return { label: "Excellent", percentage: rate, variant: "success" as const, icon: Sparkles };
    if (rate >= 90) return { label: "Good", percentage: rate, variant: "info" as const, icon: CheckCircle2 };
    return { label: "Needs Attention", percentage: rate, variant: "warning" as const, icon: AlertTriangle };
  }, [orders]);

  if (boutique === undefined || products === undefined || orders === undefined || tierStats === undefined) {
    if (waitedLong && boutique === null) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
          <ShieldX className="w-10 h-10 text-red-400" />
          <p className="text-base font-bold text-hive-text">Access Denied</p>
          <p className="text-sm text-hive-text-muted max-w-sm">
            Your account does not have seller privileges, or no seller store is linked to your account.
          </p>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-hive-amber" />
        <p className="text-sm text-hive-text-muted font-medium">Loading dashboard...</p>
      </div>
    );
  }

  const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const firstName = boutique.ownerName ? boutique.ownerName.split(' ')[0] : "Partner";

  // Dynamic Onboarding State
  const onboardingSteps = [
    { id: "profile", done: !!boutique },
    { id: "approval", done: boutique?.status === "APPROVED" },
    { id: "delivery", done: !!boutique?.deliveryRadiusKm },
    { id: "location", done: !!boutique?.latitude && !!boutique?.longitude },
    { id: "products", done: products && products.length > 0 },
    { id: "stock", done: products && products.some((p: any) => p.sizes && p.sizes.some((sz: string) => p.stockBySize?.[sz] > 0)) },
  ];
  const completedCount = onboardingSteps.filter(s => s.done).length;
  const totalSteps = onboardingSteps.length;
  const completionPercentage = Math.round((completedCount / totalSteps) * 100);
  const hasProducts = products && products.length > 0;

  const currentHour = new Date().getHours();
  let greetingPrefix = "Good Morning";
  if (currentHour >= 12 && currentHour < 17) {
    greetingPrefix = "Good Afternoon";
  } else if (currentHour >= 17) {
    greetingPrefix = "Good Evening";
  }

  // Stacking order layout (Mobile first stack, Desktop 2-column layout)
  return (
    <div className="flex flex-col gap-6 text-left max-w-6xl w-full pt-2 pb-14 font-sans px-2 lg:px-6">
      
      {/* 1. Operations Control Center Card */}
      <div className="bg-hive-white border border-hive-border rounded-[32px] p-6 md:p-8 flex flex-col gap-6 shadow-[0_4px_20px_rgba(0,0,0,0.015)] select-none">
        
        {/* Top Row: Greeting & Status Dropdown Selector */}
        <div className="flex flex-row items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-[28px] md:text-[34px] leading-tight font-serif font-bold text-hive-text">
              {greetingPrefix}, {firstName}.
            </h1>
            <p className="text-xs font-semibold text-hive-text-muted font-sans">{currentDate}</p>
          </div>

          <div className="relative shrink-0">
            <button
              onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-bold uppercase tracking-wider transition-all duration-150 shadow-sm active:scale-[0.98] cursor-pointer ${
                boutique.storeStatus === "open"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-250/50"
                  : boutique.storeStatus === "busy"
                  ? "bg-amber-50 text-amber-800 border-amber-250/50"
                  : "bg-rose-50 text-rose-700 border-rose-250/50"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${
                boutique.storeStatus === "open"
                  ? "bg-emerald-500 animate-pulse"
                  : boutique.storeStatus === "busy"
                  ? "bg-amber-500"
                  : "bg-rose-500"
              }`} />
              <span>{boutique.storeStatus}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-70" />
            </button>

            {isStatusDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsStatusDropdownOpen(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-white border border-hive-border rounded-2xl shadow-lg py-2 z-20 animate-in fade-in slide-in-from-top-2 duration-100">
                  {(["open", "busy", "closed"] as const).map((status) => (
                    <button
                      key={status}
                      disabled={isPending}
                      onClick={() => {
                        handleUpdateStatus(status);
                        setIsStatusDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-[#FAF6F0] transition-colors flex items-center gap-2 cursor-pointer ${
                        boutique.storeStatus === status ? "bg-[#FAF6F0]" : ""
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${
                        status === "open" ? "bg-emerald-500 animate-pulse" : status === "busy" ? "bg-amber-500" : "bg-rose-500"
                      }`} />
                      {status}
                    </button>
                  ))}
                  <div className="border-t border-hive-border/40 my-1" />
                  <div className="px-4 py-2 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-hive-text-muted uppercase">Accepting Orders</span>
                    <button
                      disabled={isPending || boutique.storeStatus === "closed"}
                      onClick={() => {
                        handleToggleAvailability();
                        setIsStatusDropdownOpen(false);
                      }}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        boutique.storeStatus !== "closed" && boutique.isAcceptingOrders
                          ? "bg-emerald-500"
                          : "bg-slate-200"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          boutique.storeStatus !== "closed" && boutique.isAcceptingOrders
                            ? "translate-x-4"
                            : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Dynamic Alerts List */}
        <div className="flex flex-col gap-3 py-1">
          {/* New Orders Item */}
          <div className="flex items-center gap-3">
            {pendingConfirmationCount > 0 ? (
              <>
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <span className="text-lg font-bold text-slate-800">
                  {pendingConfirmationCount} New {pendingConfirmationCount === 1 ? "Order" : "Orders"}
                </span>
              </>
            ) : (
              <>
                <span className="h-3 w-3 rounded-full bg-slate-300" />
                <span className="text-lg font-semibold text-slate-400">
                  No New Orders
                </span>
              </>
            )}
          </div>

          {/* Low Stock Item */}
          <div className="flex items-center gap-3">
            {lowStockCount > 0 ? (
              <>
                <span className="h-3 w-3 rounded-full bg-amber-500" />
                <span className="text-lg font-bold text-slate-800">
                  {lowStockCount} {lowStockCount === 1 ? "Product" : "Products"} Low Stock
                </span>
              </>
            ) : (
              <>
                <span className="h-3 w-3 rounded-full bg-slate-300" />
                <span className="text-lg font-semibold text-slate-400">
                  All Stock Okay
                </span>
              </>
            )}
          </div>
        </div>

        <hr className="border-t border-hive-border/60 my-1" />

        {/* Immediate CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full">
          <Link href="/boutique/orders" className="flex-1">
            <Button 
              className={`w-full py-4 rounded-2xl font-extrabold text-xs uppercase tracking-widest transition-all duration-150 active:scale-[0.98] shadow-sm cursor-pointer ${
                pendingConfirmationCount > 0
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
              }`}
            >
              {pendingConfirmationCount > 0 ? `Accept Orders (${pendingConfirmationCount})` : "View Orders"}
            </Button>
          </Link>
          <Link href="/boutique/inventory" className="flex-1">
            <Button 
              className={`w-full py-4 rounded-2xl font-extrabold text-xs uppercase tracking-widest transition-all duration-150 active:scale-[0.98] shadow-sm cursor-pointer ${
                lowStockCount > 0 || !isStockVerifiedToday
                  ? "bg-hive-gold hover:bg-hive-amber text-white"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
              }`}
            >
              Update Stock
            </Button>
          </Link>
        </div>

      </div>

      {/* 2. Secondary Sections Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start mt-2">
        
        {/* Left Column (Snapshot & Recent Orders) */}
        <div className="flex flex-col gap-6 w-full">
          
          {/* Today's Snapshot Card */}
          <div className="bg-hive-white border border-hive-border rounded-[28px] p-6 flex flex-col gap-4.5 shadow-[0_4px_16px_rgba(0,0,0,0.01)]">
            <h3 className="text-sm font-bold text-hive-text font-sans tracking-wide">Today's Snapshot</h3>
            
            <div className="grid grid-cols-3 gap-6 pt-1 select-none">
              <div className="flex flex-col gap-1 text-left">
                <span className="text-[10px] text-hive-text-muted font-bold uppercase tracking-wider">Sales Today</span>
                <span className={`text-xl font-bold ${salesToday === 0 ? "text-hive-text-muted/40 font-medium" : "text-hive-text"}`}>
                  {salesToday === 0 ? "₹—" : formatCurrency(salesToday)}
                </span>
              </div>
              <div className="flex flex-col gap-1 text-left">
                <span className="text-[10px] text-hive-text-muted font-bold uppercase tracking-wider">New Orders</span>
                <span className={`text-xl font-bold ${ordersNewToday === 0 ? "text-hive-text-muted/40 font-medium" : "text-hive-text"}`}>
                  {ordersNewToday === 0 ? "—" : ordersNewToday}
                </span>
              </div>
              <div className="flex flex-col gap-1 text-left">
                <span className="text-[10px] text-hive-text-muted font-bold uppercase tracking-wider">To Pack</span>
                <span className={`text-xl font-bold ${toPackCount === 0 ? "text-hive-text-muted/40 font-medium" : "text-hive-text"}`}>
                  {toPackCount === 0 ? "—" : toPackCount}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-hive-border pt-3.5 mt-0.5 select-none">
              <span className="text-[10px] text-hive-text-muted font-bold tracking-wider uppercase flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-hive-text-muted/80" /> 7-Day Trend
              </span>
              <div className="flex items-center gap-2 pr-1">
                {isTrendEmpty ? (
                  <span className="text-[10px] text-hive-text-muted/65 font-medium italic">
                    No sales activity yet
                  </span>
                ) : (
                  <svg className="w-[110px] h-[30px] overflow-visible">
                    <polyline
                      fill="none"
                      stroke="#C59A5B"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={sparklinePoints}
                      className="stroke-hive-gold"
                    />
                  </svg>
                )}
              </div>
            </div>
          </div>

          {/* Recent Orders Card */}
          <div className="bg-hive-white border border-hive-border rounded-[28px] p-6 flex flex-col gap-4 shadow-[0_4px_16px_rgba(0,0,0,0.01)]">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-hive-text font-sans tracking-wide">Recent Orders</h3>
              <Link href="/boutique/orders" className="text-[11px] font-bold text-hive-gold hover:text-hive-amber hover:underline flex items-center gap-0.5">
                All Orders <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {recentOrders.length === 0 ? (
              <p className="text-xs text-hive-text-muted italic py-4 text-center font-medium">No orders received yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {recentOrders.map((o: any) => (
                  <div key={o._id} className="flex items-center justify-between text-xs border-b border-hive-border/30 pb-2.5 last:border-0 last:pb-0">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono font-bold text-hive-text">{o.orderNumber}</span>
                      <span className="text-[10px] text-hive-text-muted font-medium">
                        {new Date(o._creationTime).toLocaleDateString([], { month: "short", day: "numeric" })}
                      </span>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <span className="font-bold text-hive-text">₹{(o.totalPrice ?? 0).toLocaleString('en-IN')}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide border ${
                        o.status === "delivered" 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-150" 
                          : o.status === "cancelled" 
                          ? "bg-red-50 text-red-700 border-red-150"
                          : "bg-brand-50 text-brand-700 border-brand-100"
                      }`}>
                        {o.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Column (Shop Standing & Onboarding) */}
        <div className="flex flex-col gap-6 w-full">
          
          {/* Shop Standing Card */}
          <div className="bg-hive-white border border-hive-border rounded-[28px] p-6 flex flex-col gap-4 shadow-[0_4px_16px_rgba(0,0,0,0.01)]">
            <span className="text-[10px] text-hive-text-muted font-bold tracking-wider uppercase">Shop Standing</span>
            
            <div className="flex flex-col gap-3.5 mt-2">
              <StatusRow
                title="Store status"
                description="Ready for selling"
                icon={Shield}
                iconBgClass="bg-[#EAF6ED]"
                iconColorClass="text-[#2E7D32]"
                iconBorderClass="border-[#C6EBD3]/30"
                badge={<StatusBadge variant="success" label="Approved" icon={Check} />}
              />

              <StatusRow
                title="Delivery rating"
                description={`${deliveryRatingData.percentage}% Order Fulfillment Rate`}
                icon={Star}
                iconBgClass={
                  deliveryRatingData.variant === "success" ? "bg-[#EAF6ED]" : 
                  deliveryRatingData.variant === "info" ? "bg-[#E8F0FE]" : "bg-[#FEF3D6]"
                }
                iconColorClass={
                  deliveryRatingData.variant === "success" ? "text-[#2E7D32]" : 
                  deliveryRatingData.variant === "info" ? "text-[#1A73E8]" : "text-[#B06000]"
                }
                iconBorderClass={
                  deliveryRatingData.variant === "success" ? "border-[#C6EBD3]/30" : 
                  deliveryRatingData.variant === "info" ? "border-[#D2E3FC]/30" : "border-[#FDE7B9]/30"
                }
                badge={<StatusBadge variant={deliveryRatingData.variant} label={deliveryRatingData.label} icon={deliveryRatingData.icon} />}
              />

              <StatusRow
                title="Seller tier"
                description={
                  tierStats.tier === "Bronze" ? "Standard tier" :
                  tierStats.tier === "Silver" ? "Algorithm boost active — priority rider routing unlocked" :
                  "Premium tier reached"
                }
                icon={Trophy}
                iconBgClass={
                  tierStats.tier === "Bronze" ? "bg-[#FEF3D6]" :
                  tierStats.tier === "Silver" ? "bg-[#E8F0FE]" : "bg-[#EAF6ED]"
                }
                iconColorClass={
                  tierStats.tier === "Bronze" ? "text-[#B06000]" :
                  tierStats.tier === "Silver" ? "text-[#1A73E8]" : "text-[#2E7D32]"
                }
                iconBorderClass={
                  tierStats.tier === "Bronze" ? "border-[#FDE7B9]/30" :
                  tierStats.tier === "Silver" ? "border-[#D2E3FC]/30" : "border-[#C6EBD3]/30"
                }
                badge={
                  <StatusBadge 
                    variant={
                      tierStats.tier === "Bronze" ? "warning" : 
                      tierStats.tier === "Silver" ? "info" : "success"
                    } 
                    label={tierStats.tier} 
                    icon={Trophy} 
                  />
                }
              />
            </div>
          </div>

          {/* Get Your Shop Ready Card (Routine Setup Onboarding) */}
          {!hasProducts && (
            <div className="bg-hive-white border border-hive-border rounded-[32px] p-6 flex flex-row items-center gap-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
              <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="38"
                    className="stroke-hive-border/40"
                    strokeWidth="6"
                    fill="transparent"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="38"
                    className="stroke-hive-gold"
                    strokeWidth="6"
                    fill="transparent"
                    strokeDasharray="238.76"
                    strokeDashoffset={238.76 - (238.76 * completedCount) / totalSteps}
                    strokeLinecap="round"
                    style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center leading-none text-center select-none">
                  <span className="text-base font-black text-hive-text font-sans">{completedCount}/{totalSteps}</span>
                  <span className="text-[9px] font-bold text-hive-text-muted mt-1 font-sans">{completionPercentage}%</span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 justify-center text-left w-full">
                <h2 className="text-lg md:text-xl font-serif font-extrabold text-hive-text leading-tight">Get Your Shop Ready</h2>
                <p className="text-[11px] md:text-xs font-semibold text-hive-text-muted leading-normal max-w-xs">
                  {completionPercentage === 100 
                    ? "Your storefront is completely ready for live orders." 
                    : "Welcome to Hive! Let's get your digital storefront ready for customers."}
                </p>
                <div className="mt-3.5 w-full">
                  <Link href="/boutique/products" className="w-full">
                    <Button className="w-full border-2 border-hive-gold bg-transparent text-hive-gold hover:bg-hive-cream rounded-full py-3.5 font-bold text-xs uppercase tracking-widest transition-all duration-150 active:scale-[0.98]">
                      ADD FIRST PRODUCT
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
