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
  Zap,
  ArrowLeft,
  ArrowRight,
  Check,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/context/SessionContext";
import { useWishlistStore } from "@/store/wishlist-store";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { getSignInUrl, getSignUpUrl, navigateToSignIn, navigateToSignUp } from "@/lib/auth-redirect";
import { HeaderStatusPill } from "@/components/shared/HeaderStatusPill";

const DeliveryScooterIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 255 512.535"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    shapeRendering="geometricPrecision"
    textRendering="geometricPrecision"
    imageRendering="optimizeQuality"
    fillRule="evenodd"
    clipRule="evenodd"
  >
    <path fill="#fff" d="M74.536 51.121c1.664-22.082 14.931-40.574 33.015-47.82 10.628-4.256 25.758-4.184 36.354.022 18.149 7.2 31.707 25.638 33.146 47.785 1.232 18.962-15.705 40.489-32.177 47.454-11.25 4.753-26.891 4.761-38.157-.001-17.49-7.394-32.841-26.761-32.181-47.44z"/>
    <path fill="#313131" d="M50.943 217.292H77.87a15.801 15.801 0 00-1.889 7.503v4.475H50.862c-.571 4.067-4.085 7.222-8.302 7.222H8.383c-4.611 0-8.383-3.772-8.383-8.383v-11.312c0-4.611 3.772-8.383 8.383-8.383H42.56c4.61 0 8.383 3.772 8.383 8.383v.495z"/>
    <path fill="#3A3B3F" d="M116.212 316.392h18.895c5.845 0 10.627 4.782 10.627 10.628v165.44c0 11.041-9.033 20.075-20.075 20.075-11.041 0-20.075-9.034-20.075-20.075V327.02c0-5.846 4.782-10.628 10.628-10.628z"/>
    <path fill="#5C5C5C" d="M116.212 316.392h18.895c5.846 0 10.627 4.782 10.627 10.628v145.025c0 11.042-9.033 20.075-20.074 20.075h-.001c-11.042 0-20.075-9.033-20.075-20.075V327.02c0-5.846 4.783-10.628 10.628-10.628z"/>
    <path fill="#4B5E71" d="M76.119 233.84l-29.784 44.031c-4.366 6.049-4.623 12.669-4.623 21.608v90.493c-.183 10.025 1.875 14.247 11.271 14.933h22.683v-91.136c-.206-4.445.431-8.143 1.798-11.195 1.314-2.937 3.305-5.277 5.87-7.108-4.337-2.858-7.215-7.77-7.215-13.323V233.84zM175.381 233.84l29.783 44.031c4.367 6.049 4.624 12.669 4.624 21.608v90.493c.183 10.025-1.876 14.247-11.271 14.933h-22.683v-91.136c.206-4.445-.431-8.143-1.798-11.195-1.315-2.937-3.305-5.277-5.87-7.108 4.337-2.858 7.215-7.77 7.215-13.323V233.84z"/>
    <path fill="#F5C22B" d="M86.55 113.634c5.609 6.449 21.602 14.909 38.555 14.909 16.952 0 33.728-7.386 39.076-14.925l10.301 38.545.008.004v67.011c-2.284-6.019-8.12-10.327-14.915-10.327h-67.65c-6.795 0-12.63 4.308-14.915 10.327v-67.082l9.54-38.462z"/>
    <path fill="#313131" d="M164.181 113.617l10.301 38.546c13.871 6.008 17.541 22.411 25.115 36.41 2.355 4.354 4.72 12.513 10.204 12.513h31.813l-25.339-51.251c-11.039-19.774-27.923-32.86-52.094-36.218zm-77.631.015l-9.551 38.51c-13.841 6.045-17.531 22.448-25.097 36.431-2.354 4.354-4.719 12.513-10.203 12.513H9.885l25.34-51.251c11.039-19.774 27.154-32.845 51.325-36.203z"/>
    <path fill="#323840" d="M167.351 413.025h36.943c8.51 0 8.523 12.857 0 12.876l-49.981.125v-98.631c0-10.687-8.744-19.43-19.43-19.43h-18.741c-10.687 0-19.43 8.744-19.43 19.43v98.506c0 .233-45.604 0-49.886 0-8.518 0-8.516-12.876 0-12.876h36.848V309.628c0-6.403 5.239-11.642 11.642-11.642h60.393c6.404 0 11.642 5.239 11.642 11.642v103.397z"/>
    <path fill="#313131" d="M169.249 85.185c-1.395 9.107-5.714 17.283-11.958 23.528-7.678 7.678-19.466 12.445-31.125 12.445-11.659 0-23.445-4.767-31.123-12.445-5.835-5.835-9.987-13.354-11.645-21.745-5.321-8.376-8.589-18.449-8.998-29.335 16.132-4.004 34.182-5.868 50.849-5.868 17.538 0 35.989 2.07 51.911 5.887-.383 10.117-3.236 19.532-7.911 27.533zM110.788 45.359c-12.176.719-24.371 2.445-36.254 5.277 1.763-23.2 16.532-42.327 36.254-48.518v43.241zm31.533-42.728c18.948 6.689 32.996 25.428 34.705 48.026-11.097-2.563-22.775-4.309-34.705-5.136V2.631zM125.779 0c2.671 0 6.996.279 9.792.81l-.046 44.34a246.88 246.88 0 00-16.752-.088L118.675.551A43.504 43.504 0 01125.779 0z"/>
    <path fill="#FFDBCE" d="M170.103 68.462c-1.967-.433-3.64-.698-5.851-.096v13.246l.432.095c2.917-3.757 4.453-8.332 5.419-13.245zm-89.322 0c1.967-.433 3.64-.698-5.851-.096v13.246l-.431.095c-2.917-3.757-4.454-8.332-5.42-13.245zm45.315-6.233c-10.72-.105-22.625 1.3-33.335 4.472v12.078c0 8.845 3.623 16.892 9.458 22.727 5.836 5.836 15.071 9.459 23.917 9.459 8.846 0 18.083-3.623 23.918-9.459 5.836-5.836 9.459-13.882 9.459-22.727V66.831c-10.771-2.876-22.706-4.496-33.417-4.602z"/>
    <path fill="#F3BCAC" fill-rule="nonzero" d="M119.403 88.064a2.41 2.41 0 011.682-4.515c1.643.609 3.306.819 4.98.771 1.731-.05 3.531-.389 5.361-.857a2.418 2.418 0 011.19 4.686c-2.096.535-4.224.926-6.419.989-2.25.065-4.514-.228-6.794-1.074z"/>
    <path fill="#EAC6B9" d="M126.096 62.229c-10.72-.105-22.625 1.3-33.335 4.472v1.808c22.251-2.833 44.501-2.793 66.752 0v-1.678c-10.771-2.876-22.706-4.496-33.417-4.602z"/>
    <path fill="#2C2C2C" fill-rule="nonzero" d="M139.426 132.027h109.402c3.393 0 6.172 2.784 6.172 6.172v18.931a3.61 3.61 0 01-2.869 3.533v62.199a3.61 3.61 0 01-3.609 3.609H139.731a3.61 3.61 0 01-3.609-3.609v-62.199a3.612 3.612 0 01-2.868-3.533v-18.931a6.18 6.18 0 016.172-6.172z"/>
    <path fill="#F9B25F" d="M248.522 160.739v62.123H139.731v-62.123z"/>
    <path fill="#FDB45F" d="M139.426 135.635h109.402c1.41 0 2.563 1.16 2.563 2.564v18.932H136.863v-18.932a2.57 2.57 0 012.563-2.564z"/>
    <path fill="#BE7F40" d="M139.729 160.74h108.796v10.189H139.729z"/>
    <path fill="#313131" d="M201.244 217.292H173.63a15.801 15.801 0 011.889 7.503v4.475h25.807c.57 4.067 4.084 7.222 8.301 7.222h34.177c4.611 0 8.383-3.772 8.383-8.383v-11.312c0-4.611-3.772-8.383-8.383-8.383h-34.177c-4.61 0-8.383 3.772-8.383 8.383v.495z"/>
    <path fill="#fff" d="M91.925 208.851h67.65c8.769 0 15.944 7.174 15.944 15.944v57.348c0 8.769-7.175 15.943-15.944 15.943h-67.65c-8.769 0-15.944-7.174-15.944-15.943v-57.348c0-8.77 7.175-15.944 15.944-15.944z"/>
    <rect fill="#323840" x="84.376" y="216.434" width="83.307" height="73.612" rx="8.866" ry="8.917"/>
    <circle fill="#FB9C78" cx="126.03" cy="253.24" r="22.907"/>
  </svg>
);

export const Navbar: React.FC = () => {
  const { locality, city, setDrawerOpen, isServiceable, updateLocationDetails } = useLocation();
  const { itemsCount, setSidebarOpen } = useCart();
  const wishlistCount = useWishlistStore((state) => state.items.length);
  const [hydrated, setHydrated] = useState(false);
  
  const deliveryPromise = useMemo(() => {
    const now = new Date();
    const currentHour = now.getHours();

    if (currentHour >= 10 && currentHour < 19) {
      const deliveryHour = currentHour + 2;
      const ampm = deliveryHour >= 12 ? "PM" : "AM";
      const displayHour = deliveryHour > 12 ? deliveryHour - 12 : (deliveryHour === 0 ? 12 : deliveryHour);
      return {
        prefix: "Today",
        suffix: `${displayHour} ${ampm}`,
        isToday: true,
      };
    } else {
      return {
        prefix: "Tomorrow",
        suffix: "11 AM",
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
                  <DeliveryScooterIcon className="h-[22px] w-[11px] shrink-0" />
                  <span className="text-[11px] tracking-wide font-sans flex items-center gap-1.5">
                    <span className="text-stone-500 dark:text-neutral-400 font-medium">
                      {deliveryPromise.prefix}
                    </span>
                    <span className="text-stone-300 dark:text-neutral-700 select-none">•</span>
                    <span className="bg-[#F5C22B] text-[#111111] px-2 py-0.5 rounded-lg font-bold text-[10px] tracking-normal select-none">
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
              <DeliveryScooterIcon className="h-[22px] w-[11px] shrink-0" />
              <span className="text-[10px] tracking-wide font-sans flex items-center gap-1.5">
                <span className="text-stone-500 dark:text-neutral-400 font-medium">
                  {deliveryPromise.prefix}
                </span>
                <span className="text-stone-300 dark:text-neutral-700 select-none">•</span>
                <span className="bg-[#F5C22B] text-[#111111] px-1.5 py-0.5 rounded-lg font-bold text-[9.5px] tracking-normal select-none">
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
                  href="/products/women"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-[13px] font-medium text-stone-850 hover:text-hive-gold active:text-hive-gold transition-colors"
                >
                  Women
                </Link>
                <Link
                  href="/products/men"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-[13px] font-medium text-stone-850 hover:text-hive-gold active:text-hive-gold transition-colors"
                >
                  Men
                </Link>
                <Link
                  href="/products/sale"
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