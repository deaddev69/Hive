"use client";

import React, { useEffect, useRef, useState } from "react";
import { Search, MapPin, Loader2 } from "lucide-react";
import { Button } from "@hive/ui";

interface BoutiqueMapProps {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}

export default function BoutiqueMap({ lat, lng, onChange }: BoutiqueMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  // Load Leaflet assets dynamically from CDN
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if already loaded
    if ((window as any).L) {
      setLeafletLoaded(true);
      return;
    }

    // Load CSS
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    // Load JS
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.onload = () => {
      setLeafletLoaded(true);
    };
    document.body.appendChild(script);

    return () => {
      // Clean up script/style links if desired (or leave cached)
    };
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    // Destroy existing map if any
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    // Create map
    const initialLat = lat || 17.385044; // Default Hyderabad coordinates
    const initialLng = lng || 78.486671;

    const map = L.map(mapContainerRef.current).setView([initialLat, initialLng], 13);
    mapRef.current = map;

    // Add Tile Layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Add Marker
    const marker = L.marker([initialLat, initialLng], { draggable: true }).addTo(map);
    markerRef.current = marker;

    // Handle marker drag end
    marker.on("dragend", () => {
      const position = marker.getLatLng();
      onChange(position.lat, position.lng);
    });

    // Handle map click
    map.on("click", (e: any) => {
      const { lat: clickLat, lng: clickLng } = e.latlng;
      marker.setLatLng([clickLat, clickLng]);
      onChange(clickLat, clickLng);
    });

    // Set initial callback
    onChange(initialLat, initialLng);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [leafletLoaded]);

  // Update marker if lat/lng changes externally
  useEffect(() => {
    if (mapRef.current && markerRef.current) {
      const currentPos = markerRef.current.getLatLng();
      if (currentPos.lat !== lat || currentPos.lng !== lng) {
        markerRef.current.setLatLng([lat, lng]);
        mapRef.current.panTo([lat, lng]);
      }
    }
  }, [lat, lng]);

  // Nominatim Search handler
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}&limit=1`
      );
      if (!res.ok) throw new Error("Search geocode failed");
      const data = await res.json();
      
      if (data && data.length > 0) {
        const { lat: searchLat, lon: searchLng } = data[0];
        const numLat = parseFloat(searchLat);
        const numLng = parseFloat(searchLng);

        onChange(numLat, numLng);

        if (mapRef.current && markerRef.current) {
          markerRef.current.setLatLng([numLat, numLng]);
          mapRef.current.setView([numLat, numLng], 15);
        }
      } else {
        alert("Location not found. Please try a more specific search query.");
      }
    } catch (err) {
      console.error(err);
      alert("Geocoding failed. Please verify network or enter manual pins.");
    } finally {
      setSearching(false);
    }
  };

  if (!leafletLoaded) {
    return (
      <div className="h-[250px] w-full rounded-2xl bg-hive-cream/30 border border-hive-border flex items-center justify-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-hive-amber" />
        <span className="text-xs text-hive-text-muted font-bold">Loading interactive map...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Search inputs */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search location (e.g. Banjara Hills, Hyderabad)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-hive-border/60 rounded-xl focus:outline-none focus:ring-1.5 focus:ring-hive-gold"
          />
          <MapPin className="w-4 h-4 text-hive-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
        </div>
        <Button
          type="button"
          onClick={handleSearch}
          disabled={searching}
          className="text-xs py-2 px-4 flex items-center gap-1 hover:bg-hive-amber"
        >
          {searching ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Search className="w-3.5 h-3.5" />
          )}
          <span>Search</span>
        </Button>
      </div>

      {/* Map Element */}
      <div 
        ref={mapContainerRef} 
        className="h-[280px] w-full rounded-2xl border border-hive-border overflow-hidden shadow-inner z-10"
      />

      <span className="text-[10px] text-hive-text-muted leading-tight">
        💡 Drag the amber pin or tap anywhere on the map grid to adjust coordinates.
      </span>
    </div>
  );
}
