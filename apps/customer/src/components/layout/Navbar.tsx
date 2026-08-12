"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useLocation } from "@/context/LocationContext";
import { useCart } from "@/context/CartContext";
import { Badge, cn } from "@hive/ui";
import { HiveLogo } from "@/components/shared/HiveLogo";
import { PremiumShoppingBag } from "@/components/shared/PremiumShoppingBag";
import { SocialTooltip } from "@/components/shared/SocialTooltip";
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
  ChevronRight,
  Zap,
  ArrowLeft,
  ArrowRight,
  Check,
  User,
  UserCheck,
  Tag,
  ShoppingBag,
  Timer,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/context/SessionContext";
import { useWishlistStore } from "@/store/wishlist-store";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { getSignInUrl, getSignUpUrl, navigateToSignIn, navigateToSignUp } from "@/lib/auth-redirect";
import { HeaderStatusPill } from "@/components/shared/HeaderStatusPill";

export const Navbar: React.FC = () => {
  const { locality, city, setDrawerOpen, isServiceable, updateLocationDetails } = useLocation();
  const { itemsCount, setSidebarOpen } = useCart();
  const wishlistCount = useWishlistStore((state) => state.items.length);
  const [hydrated, setHydrated] = useState(false);
  
  const deliveryPromise = useMemo(() => {
    const now = new Date();
    const currentHour = now.getHours();

    // Operational boutique delivery hours (9:00 AM to 8:00 PM)
    if (currentHour >= 9 && currentHour < 20) {
      return {
        prefix: "Delivery",
        suffix: "90 MINS",
        isToday: true,
      };
    } else {
      return {
        prefix: "Next Slot",
        suffix: "Tomorrow 10:30 AM",
        isToday: false,
      };
    }
  }, []);

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
  // Dynamic 2-second placeholder keywords loop
  const keywords = [
    'Search "Kurtis"',
    'Search "Sarees"',
    'Search "Lehengas"',
    'Search "Salwar Sets"',
    'Search "Western Wear"',
    'Search "Local Boutiques"'
  ];
  const [placeholderText, setPlaceholderText] = useState(keywords[0]);
  const [placeholderFade, setPlaceholderFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderFade(false);
      setTimeout(() => {
        setPlaceholderText((current) => {
          const nextIdx = (keywords.indexOf(current) + 1) % keywords.length;
          return keywords[nextIdx];
        });
        setPlaceholderFade(true);
      }, 300);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Static micro trust indicator strip is displayed below search input on desktop and mobile views.

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

  const SELLER_PORTAL_URL = process.env.NEXT_PUBLIC_SELLER_PORTAL_URL || "https://seller.hivenow.in";

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
          <div className="h-14 sm:h-16 flex items-center justify-between gap-2.5 sm:gap-4 w-full">
            
            {/* Zone 1: Logo */}
            <div className="flex-shrink-0 shrink-0 mr-4 sm:mr-4 lg:mr-6">
              <HiveLogo />
            </div>

            {/* Zone 2: Location pill with popover dropdown */}
            <div className="relative shrink min-w-0">
              <button
                onClick={handleLocationClick}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-50 hover:bg-stone-100/80 border border-stone-200/60 text-[9px] sm:text-[10px] font-semibold transition-all duration-200 min-w-0 max-w-[170px] min-[400px]:max-w-[220px] sm:max-w-[280px] md:max-w-[340px] lg:max-w-[380px] select-none cursor-pointer shadow-none sm:shadow-sm ${
                  hydrated && !(locality || city)
                    ? "animate-location-glow text-stone-600"
                    : "text-stone-800"
                }`}
                aria-label="Change location"
              >
                <MapPin className={`w-3.5 h-3.5 flex-shrink-0 shrink-0 ${hydrated && !(locality || city) ? "text-stone-400" : "text-hive-gold"}`} />
                {hydrated && (locality || city) ? (
                  <span className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span className="font-semibold text-stone-800 truncate">
                      <span className="hidden min-[400px]:inline">Delivering to </span>{locality || city}
                    </span>
                  </span>
                ) : (
                  <span className={`truncate flex-1 font-semibold ${hydrated && !(locality || city) ? "text-stone-600" : "text-stone-800"}`}>
                    Set Location
                  </span>
                )}
                <ChevronDown className="w-3.5 h-3.5 text-stone-400 shrink-0 ml-0.5" />
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

            {/* Mobile-only Action Icons (Cart & Hamburger) on top row */}
            <div className="flex sm:hidden items-center gap-1 shrink-0">
              {/* Cart bag */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="relative p-2 text-hive-dark hover:text-hive-gold hover:bg-stone-100/50 rounded-full transition-colors duration-150 outline-none flex items-center justify-center min-w-[40px] min-h-[40px]"
                aria-label="Open cart"
              >
                <PremiumShoppingBag className="w-5 h-5" strokeWidth={1.8} />
                {itemsCount > 0 && (
                  <Badge
                    variant="primary"
                    className="absolute top-1 right-1 scale-90 min-w-[16px] h-[16px] px-1 bg-hive-dark text-hive-gold border border-white rounded-full flex items-center justify-center text-[9px] font-bold"
                  >
                    {itemsCount}
                  </Badge>
                )}
              </button>

              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileMenuOpen((v) => !v)}
                className="p-2 text-hive-dark hover:text-hive-gold hover:bg-stone-100/50 rounded-full transition-colors duration-150 outline-none flex items-center justify-center min-w-[40px] min-h-[40px]"
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5 stroke-[1.75]" />
                ) : (
                  <Menu className="w-5 h-5 stroke-[1.75]" />
                )}
              </button>
            </div>

            {/* Zone 3: Search bar (Desktop only) */}
            <div className="hidden sm:flex flex-grow flex-1 max-w-lg relative min-w-0 items-center gap-2.5">
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="flex-1 h-11 px-4 rounded-xl bg-slate-100 hover:bg-slate-200/70 text-left flex items-center gap-2.5 cursor-pointer transition-all duration-200"
              >
                <Search className="w-5 h-5 text-slate-500 flex-shrink-0" />
                <span className="relative flex-1 h-5 overflow-hidden flex items-center">
                  <span
                    className={cn(
                      "absolute inset-0 truncate text-sm font-medium text-slate-400 flex items-center transition-all duration-300 ease-in-out transform",
                      placeholderFade ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1.5"
                    )}
                  >
                    {placeholderText}
                  </span>
                </span>
              </button>
              {hydrated && (locality || city) && (
                <HeaderStatusPill className="hover:bg-[#FFFDF9] dark:hover:bg-neutral-900/70 hover:shadow-[0_2px_8px_rgba(183,131,36,0.06)] cursor-default">
                  <Timer className="w-3.5 h-3.5 text-stone-700 dark:text-stone-300 shrink-0" strokeWidth={2.2} />
                  <span className="text-[11px] tracking-wide font-sans flex items-center gap-1.5">
                    <span className="text-stone-500 dark:text-neutral-400 font-medium">
                      {deliveryPromise.prefix}
                    </span>
                    <span className="text-stone-300 dark:text-neutral-700 select-none">•</span>
                    <span className={cn(
                      "px-2 py-0.5 rounded-md font-extrabold text-[10px] tracking-tight select-none shadow-2xs",
                      deliveryPromise.isToday 
                        ? "bg-[#F5C22B] text-stone-950" 
                        : "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300"
                    )}>
                      {deliveryPromise.suffix}
                    </span>
                  </span>
                </HeaderStatusPill>
              )}
            </div>

            {/* Zone 4: Action icons (Desktop only, hidden on mobile) */}
            <div className="hidden sm:flex items-center gap-3 sm:gap-4 flex-shrink-0">
              {/* My Orders */}
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
                className="relative p-2 text-hive-dark hover:text-hive-gold transition-colors duration-150 outline-none"
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

              {/* Auth Zone */}
              <div className="flex items-center border-l border-slate-200 pl-3 sm:pl-4 relative">
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
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => navigateToSignIn(router)}
                        className="h-10 px-5 rounded-xl border border-slate-200 text-xs font-medium text-hive-dark hover:bg-slate-50 transition-colors duration-200 cursor-pointer shadow-sm"
                      >
                        Sign In
                      </button>
                      <button 
                        onClick={() => navigateToSignUp(router)}
                        className="h-10 px-5 rounded-xl bg-[#111111] text-white hover:bg-neutral-800 text-xs font-medium active:scale-[0.98] transition-all duration-200 shadow-sm cursor-pointer"
                      >
                        Create Account
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

          </div>
        </div>

      </nav>

      {/* ── Mobile Search Bar (Non-sticky, scrolls away on Mobile) ── */}
      <div className="w-full bg-white dark:bg-hive-dark border-b border-slate-200/80 sm:hidden flex flex-col gap-2 px-4 py-3">
        <div className="w-full flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex-1 h-11 px-3.5 rounded-xl bg-slate-100 border border-transparent text-left flex items-center gap-2.5 cursor-pointer hover:bg-slate-200/70 transition-all duration-200"
          >
            <Search className="w-5 h-5 text-slate-500 flex-shrink-0" />
            <span className="relative flex-1 h-5 overflow-hidden flex items-center">
              <span
                className={cn(
                  "absolute inset-0 truncate text-sm font-medium text-slate-400 flex items-center transition-all duration-300 ease-in-out transform",
                  placeholderFade ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1.5"
                )}
              >
                {placeholderText}
              </span>
            </span>
          </button>
          {hydrated && (locality || city) && (
            <HeaderStatusPill className="px-3 cursor-default">
              <Timer className="w-3.5 h-3.5 text-stone-700 dark:text-stone-300 shrink-0" strokeWidth={2.2} />
              <span className="text-[10px] tracking-wide font-sans flex items-center gap-1.5">
                <span className="text-stone-500 dark:text-neutral-400 font-medium">
                  {deliveryPromise.prefix}
                </span>
                <span className="text-stone-300 dark:text-neutral-700 select-none">•</span>
                <span className={cn(
                  "px-1.5 py-0.5 rounded-md font-extrabold text-[9.5px] tracking-tight select-none shadow-2xs",
                  deliveryPromise.isToday 
                    ? "bg-[#F5C22B] text-stone-950" 
                    : "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300"
                )}>
                  {deliveryPromise.suffix}
                </span>
              </span>
            </HeaderStatusPill>
          )}
        </div>

      </div>

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
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#FAF9F6] border-b border-stone-200/70 flex-shrink-0 gap-3">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8.5 h-8.5 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white font-serif font-bold text-xs flex items-center justify-center shadow-xs shrink-0">
                {(user.name?.[0] || "U").toUpperCase()}
              </div>
              <div className="flex flex-col text-left truncate">
                <span className="text-xs font-extrabold text-stone-900 truncate leading-tight">
                  Hi, {user.name?.split(" ")[0] || "User"}
                </span>
                <span className="text-[10px] text-stone-500 font-medium flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-amber-600 shrink-0" />
                  <span className="truncate">{hydrated && (locality || city) ? locality || city : "Location"}</span>
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <HiveLogo />
              {hydrated && (locality || city) && (
                <span className="text-[10px] text-stone-500 font-medium flex items-center gap-1 bg-stone-100/80 px-2 py-0.5 rounded-full border border-stone-200/60">
                  <MapPin className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                  <span className="truncate">{locality || city}</span>
                </span>
              )}
            </div>
          )}
          
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="w-8 h-8 rounded-full bg-stone-200/60 hover:bg-stone-200 flex items-center justify-center text-stone-600 hover:text-stone-900 active:scale-95 transition-all flex-shrink-0"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Scrollable body ─────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto overscroll-contain">

          {/* ── Compact Luxury Campaign Banner ────────────────────────────── */}
          <div className="px-4 pt-3.5 pb-1.5">
            <Link
              href={hydrated && locality ? `/search?q=${encodeURIComponent(locality + " collections")}` : "/search?q=monsoon+collection"}
              onClick={() => setMobileMenuOpen(false)}
              className="relative block w-full h-[105px] rounded-2xl overflow-hidden active:scale-[0.98] transition-transform shadow-xs"
            >
              <img
                src="/images/drawer/campaign-monsoon.png"
                alt="Monsoon Edit 2026"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-transparent" />
              <div className="absolute inset-y-0 left-0 px-4 flex flex-col justify-center text-left max-w-[240px]">
                <p className="text-[8.5px] font-extrabold uppercase tracking-[0.25em] text-amber-300 mb-0.5">
                  {hydrated && locality ? `${locality.toUpperCase()} EDITS` : "PREMIUM EDIT"}
                </p>
                <p className="text-[14px] font-serif font-bold text-white leading-tight mb-1">
                  Curated Styles Near You
                </p>
                <p className="text-[10.5px] font-semibold text-amber-200 hover:underline flex items-center gap-1">
                  <span>Explore Edits</span>
                  <span>→</span>
                </p>
              </div>
            </Link>
          </div>

          {/* ── Grouped Navigation ─────────────────────────────────── */}
          <div className="px-4 py-3 flex flex-col gap-4 border-b border-stone-100 select-none text-left">
            {/* SHOP / CATEGORIES Group */}
            <div className="flex flex-col gap-1.5">
              <p className="text-[9.5px] font-extrabold uppercase tracking-[0.2em] text-stone-400 px-1">Explore Collections</p>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/search?q=ethnic"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-stone-50/80 hover:bg-amber-50/60 border border-stone-200/50 hover:border-amber-300/60 transition-all text-left group"
                >
                  <Sparkles className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform flex-shrink-0" />
                  <span className="text-[11.5px] font-bold text-stone-800">Ethnic Wear</span>
                </Link>
                <Link
                  href="/collections"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-stone-50/80 hover:bg-amber-50/60 border border-stone-200/50 hover:border-amber-300/60 transition-all text-left group"
                >
                  <Store className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform flex-shrink-0" />
                  <span className="text-[11.5px] font-bold text-stone-800">Boutiques</span>
                </Link>
                <Link
                  href="/products/women"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-stone-50/80 hover:bg-amber-50/60 border border-stone-200/50 hover:border-amber-300/60 transition-all text-left group"
                >
                  <ShoppingBag className="w-4 h-4 text-stone-700 group-hover:text-amber-600 group-hover:scale-110 transition-transform flex-shrink-0" />
                  <span className="text-[11.5px] font-bold text-stone-800">All Products</span>
                </Link>
                <Link
                  href="/products/sale"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-red-50/60 hover:bg-red-50 border border-red-200/60 transition-all text-left group"
                >
                  <Tag className="w-4 h-4 text-red-600 group-hover:scale-110 transition-transform flex-shrink-0" />
                  <span className="text-[11.5px] font-bold text-red-600">Sale</span>
                </Link>
              </div>
            </div>

            {/* ACCOUNT Group */}
            <div className="flex flex-col gap-1.5">
              <p className="text-[9.5px] font-extrabold uppercase tracking-[0.2em] text-stone-400 px-1">My Account</p>
              <div className="grid grid-cols-3 gap-2">
                <Link
                  href="/orders"
                  prefetch={false}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-stone-50/80 hover:bg-amber-50/60 border border-stone-200/50 hover:border-amber-300/60 transition-all text-center group"
                >
                  <Package className="w-4 h-4 text-stone-700 group-hover:text-amber-600 group-hover:scale-110 transition-transform mb-1" />
                  <span className="text-[11.5px] font-bold text-stone-800">Orders</span>
                </Link>
                <Link
                  href="/wishlist"
                  prefetch={false}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-stone-50/80 hover:bg-amber-50/60 border border-stone-200/50 hover:border-amber-300/60 transition-all text-center group"
                >
                  <Heart className="w-4 h-4 text-stone-700 group-hover:text-red-500 group-hover:scale-110 transition-transform mb-1" />
                  <span className="text-[11.5px] font-bold text-stone-800">Wishlist</span>
                </Link>
                <Link
                  href="/account"
                  prefetch={false}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-stone-50/80 hover:bg-amber-50/60 border border-stone-200/50 hover:border-amber-300/60 transition-all text-center group"
                >
                  <UserCheck className="w-4 h-4 text-stone-700 group-hover:text-amber-600 group-hover:scale-110 transition-transform mb-1" />
                  <span className="text-[11.5px] font-bold text-stone-800">Profile</span>
                </Link>
              </div>
            </div>

            {/* PARTNERS Golden Banner */}
            <div className="flex flex-col gap-1.5 pt-1">
              <p className="text-[9.5px] font-extrabold uppercase tracking-[0.2em] text-stone-400 px-1">Boutique Partners</p>
              {isApprovedMerchant ? (
                <a
                  href={SELLER_PORTAL_URL}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block"
                >
                  <div className="w-full p-3 rounded-2xl bg-stone-900 text-white shadow-sm flex items-center justify-between group active:scale-[0.98] transition-transform">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 backdrop-blur-xs flex items-center justify-center">
                        <Store className="w-4 h-4 text-amber-400" />
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-xs font-bold leading-tight">Manage Boutique</span>
                        <span className="text-[10px] text-stone-400 font-medium">Boutique Merchant Portal</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                </a>
              ) : isPendingMerchant ? (
                <Link
                  href="/become-seller"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block"
                >
                  <div className="w-full p-3 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-900 flex items-center justify-between">
                    <span className="text-xs font-bold italic">Application Under Review</span>
                    <span className="text-[10px] bg-amber-200/80 px-2 py-0.5 rounded-full font-bold">Pending</span>
                  </div>
                </Link>
              ) : (
                <Link
                  href="/become-seller"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block group"
                >
                  <div className="w-full p-3.5 rounded-2xl bg-stone-900 border border-amber-500/30 text-white shadow-md shadow-stone-900/20 flex items-center justify-between active:scale-[0.98] transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-8.5 h-8.5 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-400 flex items-center justify-center">
                        <Store className="w-4.5 h-4.5 text-amber-400" />
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-xs font-bold text-white tracking-tight">Sell on Hive</span>
                        <span className="text-[10.5px] text-stone-300 font-medium">Partner your boutique with us →</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-amber-400/80 group-hover:text-amber-300 group-hover:translate-x-1 transition-all" />
                  </div>
                </Link>
              )}
            </div>
          </div>

          {/* Social Links */}
          <div className="px-5 pt-4 pb-2 flex justify-center">
            <SocialTooltip variant="light" />
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
                href={getSignInUrl(redirectUrl)}
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-hive-gold transition-colors"
              >
                Sign In
              </Link>
              <span className="text-stone-200 select-none">|</span>
              <Link
                href={getSignUpUrl(redirectUrl)}
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
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSearchSubmit(e);
                  } else if (e.key === "Escape") {
                    setSearchOpen(false);
                  }
                }}
                className="w-full h-11 pl-4 pr-10 rounded-xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent text-sm font-medium text-slate-800 dark:text-white placeholder-slate-400"
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
                          router.push(`/products/${subcat.slug}`);
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