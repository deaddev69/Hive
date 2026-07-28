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
    viewBox="0 0 271.165 528.156"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    shapeRendering="geometricPrecision"
    textRendering="geometricPrecision"
    imageRendering="optimizeQuality"
    fillRule="evenodd"
    clipRule="evenodd"
  >
    <path
      fill="currentColor"
      d="M176.298 90.008c-1.433 9.349-5.865 17.741-12.275 24.151-7.881 7.881-19.981 12.774-31.948 12.774-11.968 0-24.066-4.893-31.947-12.774-5.99-5.989-10.252-13.708-11.954-22.321-5.461-8.597-8.816-18.937-9.236-30.111 16.559-4.11 35.086-6.023 52.195-6.023 18.003 0 36.942 2.124 53.285 6.042-.393 10.385-3.322 20.05-8.12 28.262zm-23.766 46.541h52.734a63.385 63.385 0 00-4.546-3.474c-8.031-5.584-17.493-9.395-28.529-11.129-3.403 3.979-9.383 7.776-16.652 10.553-7.26 2.772-15.886 4.585-24.554 4.585-8.141 0-16.079-1.826-22.896-4.463-7.687-2.972-14.006-7.02-17.641-10.68-11.382 1.77-20.911 5.746-28.919 11.597-8.321 6.079-15.04 14.201-20.518 23.992l-24.166 48.878h28.527c3.702 0 6.379-8.094 8.215-11.489 1.903-3.517 3.585-7.238 5.243-10.907 5.145-11.388 10.084-22.314 21.345-27.439a2.566 2.566 0 014.006 2.118h.005v54.024a18.025 18.025 0 0111.517-4.462c.405-.026.813-.04 1.224-.04h52.213v-42.271a3.705 3.705 0 01-2.943-3.625v-19.433a6.343 6.343 0 016.335-6.335zm60.349 0h51.949c3.482 0 6.335 2.858 6.335 6.335v19.433a3.705 3.705 0 01-2.945 3.626v65.9a3.704 3.704 0 01-3.704 3.705H262.3v.001h.514a11.245 11.245 0 01-2.094 2.894l-.005-.005c-2.029 2.027-4.823 3.286-7.889 3.286H217.231a11.13 11.13 0 01-7.32-2.747 11.236 11.236 0 01-2.662-3.429h-22.33v.001h2.89l27.55 50.916c2.422 3.41 3.709 6.954 4.388 10.876.662 3.833.732 7.936.732 12.633v92.89l-.006.181c.084 5.565-.515 9.613-2.554 12.542-2.193 3.152-5.73 4.75-11.398 5.163l-.18.007-23.283.003a2.569 2.569 0 01-2.569-2.569v-93.548c0-.106.006-.21.019-.313.276-6.393-.402-11.549-1.563-15.536-1.283-4.4-3.09-7.26-4.779-8.707H89.127c-1.606 1.37-3.2 3.912-4.407 8.052-1.164 3.997-1.913 9.387-1.913 16.504v93.548a2.57 2.57 0 01-2.569 2.569H56.954l-.18-.01c-5.668-.413-9.205-2.011-11.399-5.163-2.038-2.929-2.637-6.977-2.553-12.542l-.006-.181v-92.89c0-4.697.07-8.8.733-12.633.678-3.922 1.965-7.466 4.387-10.877l28.743-52.153H56.768a11.21 11.21 0 01-3.193 4.666 11.125 11.125 0 01-7.32 2.747H11.174C5.029 241.724 0 236.692 0 230.55v-11.612c0-3.075 1.256-5.87 3.28-7.894a11.151 11.151 0 017.165-3.256l25.983-52.552.061-.111c5.844-10.469 13.048-19.175 22.009-25.722 8.958-6.545 19.634-10.915 32.414-12.712a2.566 2.566 0 012.435.834c2.938 3.378 8.968 7.373 16.588 10.32 6.265 2.423 13.561 4.101 21.05 4.101 8.025 0 16.009-1.678 22.728-4.243 7.077-2.704 12.654-6.325 15.245-9.923a2.562 2.562 0 012.489-1.125c12.5 1.736 23.176 5.929 32.203 12.205a69.856 69.856 0 019.231 7.689zm50.578 94.78h.543v-64.794H153.358v41.714h13.465c4.979 0 9.504 2.036 12.783 5.314a18.287 18.287 0 012.623 3.314h24.021a11.164 11.164 0 012.939-5.671l.148-.162a11.147 11.147 0 017.894-3.28h35.081c3.076 0 5.87 1.257 7.894 3.28a11.142 11.142 0 013.28 7.894v11.612c0 .262-.009.522-.027.779zm-110.414-90.563h111.271a2.645 2.645 0 012.631 2.632v18.405H150.415v-18.405a2.638 2.638 0 012.63-2.632zm31.348 81.249c.344 1.389.526 2.839.526 4.331v2.827h23.791a2.569 2.569 0 012.56 2.361 6.058 6.058 0 002.013 3.57c.183.159.376.308.578.445h.514a5.987 5.987 0 003.37 1.037h34.567a6.01 6.01 0 004.261-1.765l-0.005-0.005-0.005-0.005a6.017 6.017 0 001.775-4.261v-11.612c0-1.657-.68-3.166-1.775-4.261a6.014 6.014 0 00-4.261-1.775h-35.081c-1.657 0-3.166.68-4.261 1.775l-.114.107a6.03 6.03 0 00-1.661 4.154v.508a2.569 2.569 0 01-2.569 2.569h-24.233zM78.134 284.191a18.106 18.106 0 01-.169-2.468v-39.12l-25.586 46.426a2.565 2.565 0 01-.265.392c-1.922 2.708-2.954 5.577-3.508 8.783-.59 3.41-.652 7.294-.652 11.77v92.89c0 .09-.005.179-.014.267-.067 4.489.318 7.613 1.65 9.527 1.213 1.743 3.517 2.664 7.412 2.964h20.667v-90.979c0-7.593.835-13.469 2.135-17.929 1.136-3.898 2.657-6.769 4.321-8.794-1.355-1.079-2.527-2.236-3.476-3.573-1.601-2.258-2.515-4.906-2.515-8.333v-1.823zm-.169-55.018v-2.827c0-1.492.182-2.942.526-4.331H54.86a2.57 2.57 0 01-2.569-2.569v-.508c0-3.318-2.713-6.036-6.036-6.036H11.174c-1.658 0-3.166.68-4.261 1.775a6.017 6.017 0 00-1.775 4.261v11.612c0 3.322 2.715 6.036 6.036 6.036h35.081c1.506 0 2.888-.56 3.948-1.482a6.053 6.053 0 002.013-3.57 2.57 2.57 0 012.561-2.361h23.188zm88.858-15.786H96.061l-.146.002a13.688 13.688 0 00-6.807 2.402 13.817 13.817 0 00-5.978 11.357v4.333c.092.264.142.547.142.841v51.483a12.968 12.968 0 003.639 7.068c2.35 2.35 5.589 3.808 9.15 3.808h70.762c3.561 0 6.8-1.458 9.15-3.808 2.35-2.35 3.808-5.589 3.808-9.15v-49.17a2.585 2.585 0 01-.131-.811v-4.594a13.594 13.594 0 00-1.555-6.351 2.567 2.567 0 01-.383-1.351l.002-.096a13.091 13.091 0 00-1.741-2.154c-2.35-2.35-5.589-3.809-9.15-3.809zm-41.69-120.424a2.472 2.472 0 111.726-4.634c1.687.626 3.393.84 5.112.792 1.777-.052 3.624-.4 5.503-.88a2.482 2.482 0 011.222 4.81c-2.152.549-4.336.95-6.589 1.015-2.311.066-4.634-.234-6.974-1.103zm-2.248 233.858h17.339c3.709 0 7.079 1.517 9.521 3.958a13.44 13.44 0 013.957 9.521v165.709c0 6.374-2.342 11.904-6.293 15.854-3.95 3.951-9.48 6.293-15.854 6.293-6.375 0-11.906-2.342-15.856-6.293-3.951-3.95-6.293-9.479-6.293-15.854V340.3c0-3.709 1.516-7.08 3.957-9.522a13.444 13.444 0 019.522-3.957zm53.007 97.136h36.378c4.354 0 7.166 2.414 8.416 5.507a9.82 9.82 0 01.7 3.66 9.827 9.827 0 01-.695 3.661c-1.242 3.09-4.052 5.507-8.421 5.517l-51.303.128a2.559 2.559 0 01-2.559-2.559h-.01V338.63c0-4.776-1.956-9.12-5.106-12.27-3.15-3.15-7.494-5.106-12.269-5.106h-19.238c-4.775 0-9.119 1.956-12.269 5.106-3.15 3.15-5.106 7.494-5.106 12.27v101.114c0 2.008-6.288 2.675-14.868 2.675-7.101 0-22.076-.057-31.448-.092-2.224-.008-3.523-.014-7.459-.014-4.364 0-7.176-2.422-8.422-5.521a9.866 9.866 0 01-.694-3.657h-.01a9.84 9.84 0 01.705-3.657c1.245-3.099 4.057-5.521 8.421-5.521h36.282V319.365c0-3.996 1.633-7.627 4.263-10.257s6.26-4.263 10.256-4.263h59.936c3.995 0 7.626 1.634 10.256 4.264 2.63 2.63 4.264 6.262 4.264 10.256v104.592zm36.378 5.138h-38.947a2.57 2.57 0 01-2.57-2.569V319.365a9.354 9.354 0 00-2.758-6.624 9.352 9.352 0 00-6.623-2.758h-59.936a9.356 9.356 0 00-6.624 2.758 9.353 9.353 0 00-2.757 6.624v107.161a2.57 2.57 0 01-2.569 2.569H50.635c-1.931 0-3.148 1.005-3.665 2.29a4.728 4.728 0 00-.323 1.75h-.01c0 .597.111 1.197.333 1.75.517 1.285 1.734 2.29 3.665 2.29 2.105 0 2.107.015 7.459.034 7.307.027 19.028.072 31.448.072 5.615 0 9.73.26 9.73-1.59V338.63c0-6.193 2.532-11.823 6.611-15.902 4.079-4.079 9.708-6.612 15.902-6.612h19.238c6.193 0 11.823 2.533 15.902 6.612 4.079 4.079 6.611 9.709 6.611 15.902v98.676l48.734-.121c1.928-.005 3.146-1.016 3.665-2.307a4.733 4.733 0 00-.005-3.507c-.517-1.278-1.733-2.276-3.66-2.276zm-72.046-97.136h-17.339c-2.291 0-4.376.94-5.889 2.452a8.317 8.317 0 00-2.452 5.889v165.709c0 4.956 1.782 9.217 4.787 12.222 3.006 3.005 7.266 4.787 12.223 4.787 4.957 0 9.218-1.782 12.223-4.787 3.005-3.006 4.787-7.266 4.787-12.222V340.3a8.312 8.312 0 00-2.452-5.888 8.311 8.311 0 00-5.888-2.453zm-8.289-101.695a25.998 25.998 0 0118.443 7.64 26.001 26.001 0 017.639 18.442c0 7.202-2.92 13.723-7.639 18.442a26.002 26.002 0 01-18.443 7.64 25.998 25.998 0 01-18.442-7.64 25.994 25.994 0 01-7.64-18.442c0-7.202 2.92-13.723 7.64-18.442a25.994 25.994 0 0118.442-7.64zm14.81 11.272a20.878 20.878 0 00-14.81-6.134 20.878 20.878 0 00-14.81 6.134 20.883 20.883 0 00-6.134 14.81c0 5.784 2.345 11.02 6.134 14.81a20.878 20.878 0 0014.81 6.134c5.784 0 11.02-2.344 14.81-6.134a20.88 20.88 0 006.134-14.81c0-5.784-2.344-11.02-6.134-14.81zm-89.509-24.659h21.812v-53.821c-7.362 4.962-11.379 13.849-15.542 23.063-1.692 3.745-3.409 7.542-5.403 11.228-2.135 3.949-3.423 8.464-6.732 11.663a11.277 11.277 0 015.865 7.867zm153.67 72.132l-25.745-47.579v44.584c0 3.427-.914 6.075-2.515 8.333-.95 1.339-2.125 2.498-3.483 3.578 1.793 2.17 3.494 5.312 4.698 9.445 1.305 4.476 2.069 10.195 1.764 17.188l.002 91.064h20.666c3.895-.3 6.199-1.221 7.412-2.964 1.331-1.914 1.717-5.038 1.65-9.527a2.622 2.622 0 01-.014-.267v-92.89c0-4.476-.062-8.36-.652-11.77-.555-3.21-1.588-6.081-3.516-8.793a2.647 2.647 0 01-.267-.402zM116.274 51.697c-6.186.37-12.386.998-18.557 1.896a205.582 205.582 0 00-18.049 3.451 2.567 2.567 0 01-3.14-2.814c.955-12.269 5.313-23.474 12.032-32.466 6.878-9.204 16.238-16.102 26.967-19.47a2.565 2.565 0 013.328 2.448h.004v44.387a2.57 2.57 0 01-2.569 2.569l-.016-.001zm-19.279-3.181a223.848 223.848 0 0116.726-1.791V8.382c-8.283 3.331-15.53 9.07-21.047 16.453-5.535 7.408-9.323 16.465-10.669 26.406a212.723 212.723 0 0114.99-2.725zm52.681-45.605c10.234 3.653 19.129 10.562 25.67 19.614 6.433 8.902 10.588 19.876 11.493 31.85a2.565 2.565 0 01-3.261 2.66 221.024 221.024 0 00-17.244-3.246 231.283 231.283 0 00-17.848-1.936 2.565 2.565 0 01-2.394-2.559h-.004V5.27a2.569 2.569 0 013.588-2.359zm21.516 22.605c-5.222-7.227-12.086-12.944-19.966-16.462v37.86a235.49 235.49 0 0115.85 1.797c4.827.714 9.595 1.576 14.282 2.579-1.299-9.661-4.899-18.487-10.166-25.774zM131.677 0c1.527 0 3.567.086 5.594.254 1.727.142 3.477.352 4.929.627a2.563 2.563 0 012.087 2.655l-.047 45.378a2.559 2.559 0 01-2.559 2.559l-.1-.002a252.467 252.467 0 00-17.025-.089 2.559 2.559 0 01-2.488-2.629l-.101-45.76A2.56 2.56 0 01124.029.6a49.065 49.065 0 013.666-.447A49.452 49.452 0 01131.677 0zm5.172 5.371a66.528 66.528 0 00-5.172-.233 44.404 44.404 0 00-4.728.239l.09 40.826a262.547 262.547 0 0112.086.062l.042-40.661a62.399 62.399 0 00-2.318-.233zm42.894 61.82c-2.019-.445-3.736-.717-6.005-.098v16.679l.443.098c2.994-3.857 4.571-11.636 5.562-16.679zm-96.824 0c2.019-.445 3.736-.717 6.005-.098v16.679l-.442.098c-2.994-3.857-4.571-11.636-5.563-16.679zm49.084-6.911c-11.004-.108-27.335 1.333-38.329 4.59v21.646c0 9.079 4.233 18.88 10.223 24.87 5.99 5.991 19.067 10.737 28.147 10.737 9.079 0 22.157-4.746 28.148-10.737 5.99-5.99 10.222-15.791 10.222-24.87V65.003c-11.056-2.952-27.418-4.615-38.411-4.723z"/>
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
            <div className="flex-shrink-0 shrink-0 mr-1 sm:mr-4 lg:mr-6">
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