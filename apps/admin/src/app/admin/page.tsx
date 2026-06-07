"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { StatCard, Card, CardHeader, CardTitle, CardDescription, CardContent } from "@hive/ui";
import { Store, CheckCircle, FolderKanban, Image as ImageIcon, ArrowRight, Loader2, ShieldX } from "lucide-react";
import Link from "next/link";

export default function AdminDashboardPage() {
  const { isLoading: convexAuthLoading, isAuthenticated } = useConvexAuth();
  const boutiques = useQuery(api.boutiques.getBoutiques);
  const categories = useQuery(api.categories.getCategories, {});
  const banners = useQuery(api.banners.getBanners);

  // Track how long we've been waiting — if Convex auth is ready but queries
  // still return undefined, it means the query threw a role error (FORBIDDEN).
  const [waitedLong, setWaitedLong] = useState(false);
  useEffect(() => {
    if (convexAuthLoading) return;
    const t = setTimeout(() => setWaitedLong(true), 6000);
    return () => clearTimeout(t);
  }, [convexAuthLoading]);

  const isStillLoading = boutiques === undefined || categories === undefined || banners === undefined;

  if (isStillLoading) {
    if (waitedLong) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
          <ShieldX className="w-10 h-10 text-red-400" />
          <p className="text-base font-bold text-slate-700">Access Denied</p>
          <p className="text-sm text-slate-500 max-w-sm">
            Your account does not have admin privileges. Make sure your Convex
            user record has <code className="bg-slate-100 px-1 rounded">role: "admin"</code>.
          </p>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-hive-amber" />
        <p className="text-sm text-hive-text-muted font-medium">Gathering statistics from Convex...</p>
      </div>
    );
  }

  const totalBoutiquesCount = boutiques.length;
  const approvedBoutiquesCount = boutiques.filter((b: any) => b.status === "APPROVED").length;
  const categoriesCount = categories.length;
  const activeBannersCount = banners.filter((b: any) => b.active).length;

  return (
    <div className="flex flex-col gap-8 text-left">
      
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-serif font-black text-hive-dark">Overview Dashboard</h1>
        <p className="text-sm text-hive-text-muted">Central directory configuration and marketplace registry registry statistics.</p>
      </div>

      {/* Grid of Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Boutiques"
          value={totalBoutiquesCount}
          icon={<Store className="w-4 h-4" />}
        />
        <StatCard
          title="Approved Boutiques"
          value={approvedBoutiquesCount}
          icon={<CheckCircle className="w-4 h-4 text-green-500" />}
        />
        <StatCard
          title="Categories"
          value={categoriesCount}
          icon={<FolderKanban className="w-4 h-4" />}
        />
        <StatCard
          title="Active Banners"
          value={activeBannersCount}
          icon={<ImageIcon className="w-4 h-4" />}
        />
      </div>

      {/* Quick Setup Shortcuts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Categories Shortcut */}
        <Card className="hover:shadow-md transition-shadow duration-200 border-hive-border bg-white">
          <CardHeader>
            <CardTitle className="font-serif font-bold text-lg flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-hive-gold" /> Categories Registry
            </CardTitle>
            <CardDescription>
              Configure product category mappings, upload icons, and edit category slugs.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <Link href="/admin/categories">
              <span className="inline-flex items-center gap-1.5 text-sm font-bold text-hive-amber hover:text-hive-gold transition-colors cursor-pointer">
                Manage Categories <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
          </CardContent>
        </Card>

        {/* Banners Shortcut */}
        <Card className="hover:shadow-md transition-shadow duration-200 border-hive-border bg-white">
          <CardHeader>
            <CardTitle className="font-serif font-bold text-lg flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-hive-gold" /> Promo Banners
            </CardTitle>
            <CardDescription>
              Manage mobile and desktop homepage promotions, hyperlinks, and slide sorting.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <Link href="/admin/banners">
              <span className="inline-flex items-center gap-1.5 text-sm font-bold text-hive-amber hover:text-hive-gold transition-colors cursor-pointer">
                Manage Banners <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
          </CardContent>
        </Card>

        {/* Boutiques Shortcut */}
        <Card className="hover:shadow-md transition-shadow duration-200 border-hive-border bg-white md:col-span-2">
          <CardHeader>
            <CardTitle className="font-serif font-bold text-lg flex items-center gap-2">
              <Store className="w-5 h-5 text-hive-gold" /> Boutique Approvals & Registry
            </CardTitle>
            <CardDescription>
              Register new boutique designers, view details, search addresses on Leaflet maps, and confirm serviceable status.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <Link href="/admin/boutiques">
              <span className="inline-flex items-center gap-1.5 text-sm font-bold text-hive-amber hover:text-hive-gold transition-colors cursor-pointer">
                Manage Boutiques <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
