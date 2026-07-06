"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useLocation } from "@/context/LocationContext";
import { useCart } from "@/context/CartContext";
import { Badge } from "@hive/ui";
import { HiveLogo } from "@/components/shared/HiveLogo";
import { PremiumShoppingBag } from "@/components/shared/PremiumShoppingBag";
import {
  MapPin,
  Search,
  List,
  Menu,
  X,
  Package,
  Home,
  Heart,
  Sparkles,
  Store,
  Phone,
  FileText,
  ChevronDown,
  Zap,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/context/SessionContext";
import { useWishlistStore } from "@/store/wishlist-store";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../../../convex/_generated/api";

export const Navbar: React.FC = () => {
  const { locality, city, setDrawerOpen, isServiceable, updateLocationDetails } = useLocation();
  const { itemsCount, setSidebarOpen } = useCart();
  const wishlistCount = useWishlistStore((state) => state.items.length);
  const [hydrated, setHydrated] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState("/");
  useEffect(() => {
    setHydrated(true);
    if (typeof window !== "undefined") {
      setRedirectUrl(window.location.pathname);
    }
  }, []);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const { user, isAuthenticated, logout, token } = useSessionStore();
  const router = useRouter();

  // Focus search input when overlay opens
  useEffect(() => {
    if (searchOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [searchOpen]);

  // Global Escape key listener to close overlay
  useEffect(() => {
    if (!searchOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchOpen]);

  // Search placeholder animation loop
  const placeholders = [
    "Search sarees, kurtis, lehengas...",
    "Search Kochi's local boutiques...",
    "Search designer wedding wear...",
    "Search same-day delivery outfits...",
  ];
  const [placeholderIdx, setPlaceholderIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIdx((idx) => (idx + 1) % placeholders.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Recent searches cache
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("hive_recent_searches");
      if (stored) {
        try {
          setRecentSearches(JSON.parse(stored));
        } catch {}
      }
    }
  }, []);

  const searchProductsAction = useAction(api.products.searchProducts);
  const [searchResults, setSearchResults] = useState<{ products: any[]; totalMatchedCount: number } | null>(null);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 3 || !searchOpen) {
      setSearchResults(null);
      return;
    }

    const delayDebounce = setTimeout(() => {
      searchProductsAction({ searchTerm: trimmed })
        .then((res) => {
          setSearchResults(res);
        })
        .catch((err) => {
          console.error("Suggestions failed:", err);
          setSearchResults({ products: [], totalMatchedCount: 0 });
        });
    }, 200);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, searchOpen, searchProductsAction]);

  const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const highlightMatch = (text: string, query: string) => {
    if (!query) return <span>{text}</span>;
    const parts = text.split(new RegExp(`(${escapeRegExp(query)})`, "gi"));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <span key={i} className="font-semibold text-gray-900 dark:text-white font-sans">
              {part}
            </span>
          ) : (
            part
          )
        )}
      </>
    );
  };

  const suggestions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];

    const trendingKeywords = [
      "Sarees",
      "Lehengas",
      "Kurtis",
      "Bridal Wear",
      "Onam Collection",
      "Salwar Sets",
      "Party Wear",
      "Office Wear",
      "Red Saree",
      "Black Kurti",
      "Reception Look",
      "Engagement Outfit",
      "Wedding Guest"
    ];

    const matchedKeywords = trendingKeywords.filter((kw) =>
      kw.toLowerCase().includes(query)
    );

    const matchedProductNames = (searchResults?.products || [])
      .map((p: any) => p.name)
      .filter((name: string) => name.toLowerCase().includes(query));

    const combined = Array.from(new Set([...matchedKeywords, ...matchedProductNames]));
    return combined.slice(0, 8);
  }, [searchQuery, searchResults]);

  const SELLER_PORTAL_URL = process.env.NEXT_PUBLIC_SELLER_PORTAL_URL || "http://seller.localhost:3001";

  // Fetch boutique status
  const boutiqueSafe = useQuery(api.boutiques.getMyBoutiqueSafeCustomer, { token: token || undefined });
  const boutique = boutiqueSafe?.boutique;
  const isApprovedMerchant = boutique && boutique.status === "APPROVED";
  const isPendingMerchant = boutique && boutique.status === "PENDING";

  // Prevent body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const savedAddresses = useQuery(api.addresses.list, { token: token || undefined }) ?? [];
  const categories = useQuery(api.categories.getCategories, { onlyActive: true }) ?? [];
  const subcategories = React.useMemo(() => {
    return categories.filter((c: any) => c.parentId && c.showOnHomepage);
  }, [categories]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const query = searchQuery.trim();
      const updated = [query, ...recentSearches.filter((s) => s !== query)].slice(0, 5);
      setRecentSearches(updated);
      if (typeof window !== "undefined") {
        localStorage.setItem("hive_recent_searches", JSON.stringify(updated));
      }
      router.push(`/search?q=${encodeURIComponent(query)}`);
      setMobileMenuOpen(false);
    }
  };

  const handleLocationClick = () => {
    if (typeof window !== "undefined" && window.innerWidth < 640) {
      setDrawerOpen(true);
    } else {
      setLocationDropdownOpen(!locationDropdownOpen);
    }
  };

  return (
    <>
      <nav className="sticky top-0 z-40 w-full bg-white/95 dark:bg-hive-dark/95 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* ── Shared single-row bar ─────────────────────────────────── */}
          <div className="h-16 flex items-center justify-between gap-4">

            {/* ── Zone 1: Logo (fixed, left anchor) ─────────────────── */}
            <div className="flex-shrink-0 mr-2 sm:mr-6 lg:mr-8">
              <HiveLogo />
            </div>

            {/* ── Zone 2: Location pill with popover dropdown ───────── */}
            <div className="relative">
              <button
                onClick={handleLocationClick}
                className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-[8.5px] sm:text-[10px] font-medium text-hive-dark/95 transition-all duration-200 min-w-0 max-w-[115px] sm:max-w-[200px] shadow-sm select-none cursor-pointer"
              >
                <MapPin className="w-2.5 h-2.5 sm:w-3 h-3 text-hive-gold flex-shrink-0" />
                <div className="flex flex-col items-start text-left min-w-0 leading-none">
                  <span className="truncate w-full max-w-[70px] sm:max-w-[140px] font-medium text-hive-dark/95">
                    {hydrated && (locality || city) ? `${locality || city} ▾` : "Set Location"}
                  </span>
                  {hydrated && city && !isServiceable && (
                    <span className="text-[7.5px] text-amber-700 bg-amber-50/50 border border-amber-200/30 px-0.5 py-0.2 rounded font-extrabold mt-0.5 tracking-wide whitespace-nowrap leading-none scale-90 origin-left">
                      Launching Soon
                    </span>
                  )}
                </div>
              </button>

              {locationDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40 bg-transparent hidden sm:block" onClick={() => setLocationDropdownOpen(false)} />
                  <div className="absolute left-0 mt-2.5 w-64 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl shadow-xl py-2 z-50 text-left font-sans animate-in fade-in slide-in-from-top-1 duration-150 hidden sm:block">
                    <div className="px-4 py-2 border-b border-slate-100 dark:border-neutral-800/60">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-white">Delivering To</span>
                    </div>
                    <button
                      onClick={() => {
                        setLocationDropdownOpen(false);
                        setDrawerOpen(true);
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs text-hive-gold hover:bg-slate-50 dark:hover:bg-neutral-800/40 hover:text-hive-dark transition-all font-bold flex items-center gap-2"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Change Location</span>
                    </button>
                    {isAuthenticated && token && savedAddresses.length > 0 && (
                      <div className="border-t border-slate-100 dark:border-neutral-800/60 mt-1 pt-1">
                        <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Saved Addresses
                        </div>
                        <div className="max-h-40 overflow-y-auto">
                          {savedAddresses.map((addr: any) => (
                            <button
                              key={addr._id}
                              onClick={async () => {
                                setLocationDropdownOpen(false);
                                await updateLocationDetails({
                                  latitude: addr.lat,
                                  longitude: addr.lng,
                                  city: addr.city,
                                  state: addr.state,
                                  country: "India",
                                  postcode: addr.pincode,
                                });
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-neutral-800/40 transition-all text-xs font-semibold text-slate-700 dark:text-slate-300 flex flex-col gap-0.5"
                            >
                              <span className="font-bold text-slate-900 dark:text-white">{addr.label}</span>
                              <span className="truncate text-[10px] text-slate-500 dark:text-neutral-400">{addr.formattedAddress || `${addr.houseNumber ? addr.houseNumber + ', ' : ''}${addr.landmark ? addr.landmark + ', ' : ''}${addr.city}`}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* ── Zone 3: Desktop/Mobile search bar (button trigger for full-screen overlay) ── */}
            <div className="flex-1 max-w-md relative min-w-0">
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="w-full h-8 md:h-10 pl-3 md:pl-4 pr-8 md:pr-10 rounded-xl bg-slate-50 md:bg-white border border-slate-200 text-[10px] md:text-xs font-semibold text-hive-text-muted text-left flex items-center justify-between shadow-sm cursor-pointer hover:bg-slate-100/50 transition-all duration-250"
              >
                <span className="truncate">
                  {hydrated && typeof window !== "undefined" && window.innerWidth < 640
                    ? "Search..."
                    : placeholders[placeholderIdx]}
                </span>
                <Search className="w-3.5 h-3.5 md:w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* ── Zone 4: Action icons (right anchor) ───────────────── */}
            <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">

              {/* My Orders — desktop only */}
              <Link
                href="/orders"
                prefetch={false}
                className="hidden md:flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest text-hive-dark hover:text-hive-gold transition-colors duration-150"
              >
                <List className="w-4 h-4" />
                <span>My Orders</span>
              </Link>

              {/* Wishlist */}
              <Link
                href="/wishlist"
                className="hidden sm:flex relative p-2 text-hive-dark hover:text-hive-gold transition-colors duration-150 outline-none"
                aria-label="Open wishlist"
              >
                <Heart className="w-5 h-5 stroke-[1.8]" />
                {hydrated && wishlistCount > 0 && (
                  <Badge
                    variant="primary"
                    className="absolute top-0 right-0 scale-90 min-w-5 h-5 flex items-center justify-center font-bold px-1.5 bg-hive-dark text-hive-gold border border-white rounded-full"
                  >
                    {wishlistCount}
                  </Badge>
                )}
              </Link>

              {/* Cart bag */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="relative p-2 text-hive-dark hover:text-hive-gold transition-colors duration-150 outline-none"
                aria-label="Open cart"
              >
                <PremiumShoppingBag className="w-5 h-5" strokeWidth={1.8} />
                {itemsCount > 0 && (
                  <Badge
                    variant="primary"
                    className="absolute top-0 right-0 scale-90 min-w-5 h-5 flex items-center justify-center font-bold px-1.5 bg-hive-dark text-hive-gold border border-white rounded-full"
                  >
                    {itemsCount}
                  </Badge>
                )}
              </button>

              {/* ── Auth zone — same width slot regardless of state ──── */}
              <div className="hidden sm:flex items-center border-l border-slate-200 pl-3 sm:pl-4 relative">
                {!hydrated ? (
                  <div className="h-10 w-24 bg-slate-50 animate-pulse rounded-xl" />
                ) : isAuthenticated && user ? (
                  <div>
                    <button
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      className="w-8 h-8 rounded-full bg-hive-comb/60 border border-hive-border/60 hover:scale-[1.03] active:scale-[0.97] transition-all flex items-center justify-center font-bold text-xs text-hive-dark select-none cursor-pointer"
                    >
                      {user.name ? user.name.charAt(0).toUpperCase() : (user.email ? user.email.charAt(0).toUpperCase() : "U")}
                    </button>
                    
                    {dropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setDropdownOpen(false)} />
                        <div className="absolute right-0 mt-2.5 w-48 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl shadow-xl py-2 z-50 text-left font-sans animate-in fade-in slide-in-from-top-1 duration-150">
                          <div className="px-4 py-2 border-b border-slate-100 dark:border-neutral-800/60">
                            <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                              {user.name || "User"}
                            </p>
                            <p className="text-[10px] text-slate-400 dark:text-neutral-500 truncate">
                              {user.email || ""}
                            </p>
                          </div>
                          <Link
                            href="/account"
                            onClick={() => setDropdownOpen(false)}
                            className="block px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-neutral-800/40 hover:text-hive-gold transition-all"
                          >
                            My Profile
                          </Link>
                          <Link
                            href="/orders"
                            onClick={() => setDropdownOpen(false)}
                            className="block px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-neutral-800/40 hover:text-hive-gold transition-all"
                          >
                            My Orders
                          </Link>
                          {isApprovedMerchant ? (
                            <a
                              href={SELLER_PORTAL_URL}
                              onClick={() => setDropdownOpen(false)}
                              className="block px-4 py-2 text-xs font-semibold text-hive-gold hover:bg-slate-50 dark:hover:bg-neutral-800/40 transition-all"
                            >
                              Manage Boutique
                            </a>
                          ) : isPendingMerchant ? (
                            <Link
                              href="/become-seller"
                              onClick={() => setDropdownOpen(false)}
                              className="block px-4 py-2 text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-neutral-800/40 transition-all italic"
                            >
                              Application Under Review
                            </Link>
                          ) : (
                            <Link
                              href="/become-seller"
                              onClick={() => setDropdownOpen(false)}
                              className="block px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-neutral-800/40 hover:text-hive-gold transition-all font-semibold"
                            >
                              Sell on Hive
                            </Link>
                          )}
                          <button
                            onClick={async () => {
                              setDropdownOpen(false);
                              await logout();
                              router.push("/");
                            }}
                            className="w-full text-left px-4 py-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all font-semibold cursor-pointer border-t border-slate-100 dark:border-neutral-800/60 mt-1"
                          >
                            Log Out
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Desktop: Sign In + Create Account */}
                    <div className="hidden sm:flex items-center gap-3">
                      <button 
                        onClick={() => router.push(`/sign-in?redirect_url=${encodeURIComponent(window.location.pathname)}`)}
                        className="h-10 px-5 rounded-xl border border-slate-200 text-xs font-medium text-hive-dark hover:bg-slate-50 transition-colors duration-200 cursor-pointer shadow-sm"
                      >
                        Sign In
                      </button>
                      <button 
                        onClick={() => router.push(`/sign-up?redirect_url=${encodeURIComponent(window.location.pathname)}`)}
                        className="h-10 px-5 rounded-xl bg-[#111111] text-white hover:bg-neutral-800 text-xs font-medium active:scale-[0.98] transition-all duration-200 shadow-sm cursor-pointer"
                      >
                        Create Account
                      </button>
                    </div>

                    {/* Mobile: compact Sign In button only */}
                    <button 
                      onClick={() => router.push(`/sign-in?redirect_url=${encodeURIComponent(window.location.pathname)}`)}
                      className="sm:hidden h-9 px-4 rounded-xl border border-slate-200 text-[10px] font-medium text-hive-dark hover:bg-slate-50 transition-colors duration-200 whitespace-nowrap cursor-pointer shadow-sm"
                    >
                      Sign In
                    </button>
                  </>
                )}
              </div>

              {/* Mobile hamburger — opens slide-out menu */}
              <button
                onClick={() => setMobileMenuOpen((v) => !v)}
                className="md:hidden p-2 text-hive-dark hover:text-hive-gold transition-colors duration-150 outline-none"
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>




        </div>
      </nav>

      {/* ── Mobile drawer backdrop ──────────────────────────────────── */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-[48] bg-black/50 backdrop-blur-[2px] transition-opacity duration-300"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* ── Mobile drawer — Mini Fashion Magazine ───────────────────── */}
      <div
        className={`md:hidden fixed inset-y-0 right-0 z-[49] w-[88vw] max-w-[360px] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          mobileMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* ── Dedicated Drawer Header ─────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 flex-shrink-0 gap-3">
          {isAuthenticated && user ? (
            <span className="text-sm font-medium text-stone-850 truncate text-left">
              Hi, {user.name?.split(" ")[0] || "User"}
            </span>
          ) : (
            <HiveLogo />
          )}
          
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="w-8 h-8 rounded-full bg-stone-50 hover:bg-stone-100 flex items-center justify-center text-stone-500 hover:text-stone-800 active:scale-95 transition-all flex-shrink-0"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Location Context line ──────────────────────────────── */}
        <div className="px-5 py-2.5 text-left border-b border-stone-100 flex items-center gap-1.5 text-[11px] text-stone-400 font-medium select-none flex-shrink-0">
          <MapPin className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" />
          <span className="truncate max-w-[200px]">{hydrated && (locality || city) ? locality || city : "Set Location"}</span>
        </div>

        {/* ── Scrollable body ─────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto overscroll-contain">

          {/* ── Campaign hero ──────────────────────────────────────── */}
          <div className="px-4 pt-4 pb-3">
            <Link
              href={hydrated && locality ? `/search?q=${encodeURIComponent(locality + " collections")}` : "/search?q=monsoon+collection"}
              onClick={() => setMobileMenuOpen(false)}
              className="relative block w-full h-[200px] rounded-2xl overflow-hidden active:scale-[0.98] transition-transform shadow-[0_4px_20px_rgba(0,0,0,0.04)]"
            >
              <img
                src="/images/drawer/campaign-monsoon.png"
                alt="Monsoon Edit 2026"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/5" />
              <div className="absolute bottom-0 left-0 right-0 px-5 pb-5 text-left">
                <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-amber-300/90 mb-1.5">
                  {hydrated && locality ? `${locality.toUpperCase()} TRENDS` : "PREMIUM EDIT"}
                </p>
                <p className="text-[18px] font-serif font-bold text-white leading-snug mb-0.5 whitespace-pre-line">
                  {hydrated && locality ? "Curated collections\nfound nearby" : `Handpicked designer\ncollections`}
                </p>
                <p className="text-[12px] font-medium text-white/70 mt-1">View Collection →</p>
              </div>
            </Link>
          </div>

          {/* ── Grouped Navigation ─────────────────────────────────── */}
          <div className="px-5 py-4 flex flex-col gap-6 border-b border-stone-100 select-none text-left">
            {/* SHOP Group */}
            <div className="flex flex-col gap-2">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-stone-400">Categories</p>
              <div className="flex flex-col gap-3 pl-1">
                <Link
                  href="/products?category=women"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-[13px] font-medium text-stone-850 hover:text-hive-gold active:text-hive-gold transition-colors"
                >
                  Women
                </Link>
                <Link
                  href="/products?category=men"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-[13px] font-medium text-stone-850 hover:text-hive-gold active:text-hive-gold transition-colors"
                >
                  Men
                </Link>
                <Link
                  href="/products?category=sale"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-[13px] font-medium text-red-500 hover:text-red-650 transition-colors"
                >
                  Sale
                </Link>
              </div>
            </div>

            {/* ACCOUNT Group */}
            <div className="flex flex-col gap-2">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-stone-400">Account</p>
              <div className="flex flex-col gap-3 pl-1">
                <Link
                  href="/orders"
                  prefetch={false}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-[13px] font-medium text-stone-850 hover:text-hive-gold active:text-hive-gold transition-colors"
                >
                  Orders
                </Link>
                <Link
                  href="/wishlist"
                  prefetch={false}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-[13px] font-medium text-stone-850 hover:text-hive-gold active:text-hive-gold transition-colors"
                >
                  Wishlist
                </Link>
                <Link
                  href="/account"
                  prefetch={false}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-[13px] font-medium text-stone-850 hover:text-hive-gold active:text-hive-gold transition-colors"
                >
                  Account
                </Link>
              </div>
            </div>

            {/* PARTNERS Group */}
            <div className="flex flex-col gap-2">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-stone-400">Partners</p>
              <div className="pl-1 flex flex-col gap-2">
                {isApprovedMerchant ? (
                  <a
                    href={SELLER_PORTAL_URL}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block mt-1"
                  >
                    <span className="inline-flex w-full items-center justify-center gap-2 py-3 px-4 rounded-xl border border-hive-gold bg-white text-hive-dark text-[10px] font-semibold tracking-[0.2em] uppercase hover:bg-hive-gold hover:text-hive-dark transition-all duration-200 text-center cursor-pointer">
                      <Store className="w-3.5 h-3.5 text-hive-gold" />
                      Manage Boutique
                    </span>
                  </a>
                ) : isPendingMerchant ? (
                  <Link
                    href="/become-seller"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block mt-1"
                  >
                    <span className="inline-block w-full py-3 px-4 rounded-xl border border-stone-200 bg-stone-50 text-stone-500 text-[10px] font-semibold tracking-[0.2em] uppercase hover:bg-stone-100 transition-all duration-200 text-center cursor-pointer italic">
                      Application Under Review
                    </span>
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/become-seller"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block mt-1"
                    >
                      <span className="inline-block w-full py-3 px-4 rounded-xl border border-hive-gold bg-white text-hive-dark text-[10px] font-semibold tracking-[0.2em] uppercase hover:bg-hive-gold hover:text-hive-dark transition-all duration-200 text-center cursor-pointer">
                        Sell on Hive
                      </span>
                    </Link>
                    <a
                      href={SELLER_PORTAL_URL}
                      onClick={() => setMobileMenuOpen(false)}
                      className="block mt-1"
                    >
                      <span className="inline-block w-full py-3 px-4 rounded-xl border border-stone-200 bg-stone-50 text-stone-600 text-[10px] font-semibold tracking-[0.2em] uppercase hover:bg-stone-100 transition-all duration-200 text-center cursor-pointer">
                        Partner Portal
                      </span>
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ── Support | Terms | Privacy ──────────────────────────── */}
          <div className="px-5 py-4 text-center">
            <div className="flex items-center justify-center gap-3 text-[10.5px] text-stone-400 font-semibold">
              <a href="mailto:support@hivenow.in" className="hover:text-hive-gold transition-colors">
                Support
              </a>
              <span className="text-stone-200 select-none">|</span>
              <Link href="/terms" onClick={() => setMobileMenuOpen(false)} className="hover:text-hive-gold transition-colors">
                Terms
              </Link>
              <span className="text-stone-200 select-none">|</span>
              <Link href="/terms#privacy-policy" onClick={() => setMobileMenuOpen(false)} className="hover:text-hive-gold transition-colors">
                Privacy
              </Link>
            </div>
          </div>
        </div>

        {/* ── Drawer footer: Auth ────────────────────────────────── */}
        <div className="flex-shrink-0 border-t border-stone-100 py-4 pb-[calc(1rem+max(0.25rem,env(safe-area-inset-bottom)))] flex justify-center bg-white select-none">
          {isAuthenticated && user ? (
            <button
              onClick={async () => {
                setMobileMenuOpen(false);
                await logout();
                router.push("/");
              }}
              className="text-xs font-semibold text-red-500 hover:text-red-750 transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          ) : (
            <div className="flex items-center gap-4 text-xs font-semibold text-stone-500">
              <Link
                href={`/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}`}
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-hive-gold transition-colors"
              >
                Sign In
              </Link>
              <span className="text-stone-200 select-none">|</span>
              <Link
                href="/sign-up"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-hive-gold transition-colors"
              >
                Create Account
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ── Full-Screen Search Overlay ────────────────────────────────── */}
      {searchOpen && (
        <div className="absolute top-0 left-0 w-full min-h-screen bg-white dark:bg-neutral-950 z-50 flex flex-col animate-search-overlay-in font-sans pb-[64px] text-left">
          {/* Header row */}
          <div className="flex items-center h-16 border-b border-gray-100 dark:border-neutral-800/60 px-4 gap-2 bg-white dark:bg-neutral-950 flex-shrink-0">
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              className="w-11 h-11 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-hive-gold hover:bg-slate-100 dark:hover:bg-neutral-900 rounded-full transition-colors cursor-pointer"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <div className="flex-1 relative flex items-center">
              <input
                ref={inputRef}
                type="text"
                placeholder="Search sarees, kurtis, lehengas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSearchSubmit(e);
                  } else if (e.key === "Escape") {
                    setSearchOpen(false);
                  }
                }}
                className="w-full h-10 pl-4 pr-10 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 focus:outline-none focus:ring-1.5 focus:ring-hive-gold focus:border-transparent text-xs font-semibold text-hive-dark dark:text-white placeholder-hive-text-muted"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 p-1 rounded-full hover:bg-slate-200 dark:hover:bg-neutral-800 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Content area */}
          {!searchQuery.trim() ? (
            <div className="flex-grow overflow-y-auto p-4 space-y-6 pb-20">
              {/* Trending Searches */}
              <div className="flex flex-col gap-3 text-left">
                <span className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">
                  Trending Searches
                </span>
                <div className="flex flex-wrap gap-2">
                  {["Sarees", "Lehengas", "Kurtis", "Bridal Wear", "Onam Collection", "Salwar Sets", "Party Wear", "Office Wear"].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => {
                        setSearchQuery(chip);
                        const updated = [chip, ...recentSearches.filter((s) => s !== chip)].slice(0, 5);
                        setRecentSearches(updated);
                        if (typeof window !== "undefined") {
                          localStorage.setItem("hive_recent_searches", JSON.stringify(updated));
                        }
                        router.push(`/search?q=${encodeURIComponent(chip)}`);
                        setSearchOpen(false);
                      }}
                      className="px-3 py-1.5 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-850 rounded-full text-[13px] font-semibold text-slate-700 dark:text-slate-300 hover:border-hive-gold hover:text-hive-gold transition-all cursor-pointer"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Shop by Category */}
              {subcategories.length > 0 && (
                <div className="flex flex-col gap-3 text-left">
                  <span className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">
                    Shop by Category
                  </span>
                  <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar pl-1">
                    {subcategories.map((subcat: any) => (
                      <button
                        key={subcat._id}
                        type="button"
                        onClick={() => {
                          router.push(`/products?category=${subcat.slug}`);
                          setSearchOpen(false);
                        }}
                        className="flex flex-col items-center gap-2 flex-shrink-0 group cursor-pointer"
                      >
                        <div className="relative w-16 h-16 rounded-full overflow-hidden border border-slate-200/80 bg-slate-50">
                          <img
                            src={subcat.homepageImageUrl || subcat.imageUrl || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=600&q=80"}
                            alt={subcat.name}
                            className="w-full h-full object-cover pointer-events-none"
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-850 dark:text-neutral-300 text-center truncate max-w-[72px]">
                          {subcat.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-grow overflow-y-auto p-4 space-y-1 pb-20">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => {
                    setSearchQuery(suggestion);
                    const updated = [suggestion, ...recentSearches.filter((s) => s !== suggestion)].slice(0, 5);
                    setRecentSearches(updated);
                    if (typeof window !== "undefined") {
                      localStorage.setItem("hive_recent_searches", JSON.stringify(updated));
                    }
                    router.push(`/search?q=${encodeURIComponent(suggestion)}`);
                    setSearchOpen(false);
                  }}
                  className="w-full flex items-center justify-between py-3 border-b border-gray-100 dark:border-neutral-800/60 text-left text-slate-700 dark:text-slate-300 hover:text-hive-gold transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className="text-sm font-normal">
                      {highlightMatch(suggestion, searchQuery)}
                    </span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                </button>
              ))}
              {suggestions.length === 0 && (
                <div className="text-center py-8 text-xs text-gray-400 font-medium">
                  No suggestions found for "{searchQuery}"
                </div>
              )}
            </div>
          )}

          <style>{`
            @keyframes searchOverlayIn {
              from {
                opacity: 0;
                transform: translateY(20px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
            .animate-search-overlay-in {
              animation: searchOverlayIn 0.2s ease-out forwards;
            }
            /* Ensure mobile bottom nav sits above the search overlay */
            div.fixed.bottom-0.inset-x-0.z-40 {
              z-index: 60 !important;
            }
          `}</style>
        </div>
      )}
    </>
  );
};