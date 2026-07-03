export {};

declare global {
  interface Window {
    mappls: {
      Map: new (container: HTMLDivElement | string, options: MapplsMapOptions) => MapplsMapInstance;
      Marker: new (options: MapplsMarkerOptions) => MapplsMarkerInstance;
    };
  }
}

interface MapplsMapOptions {
  center: [number, number] | { lat: number; lng: number }; // [Latitude, Longitude] or object
  zoom: number;
  zoomControl?: boolean;
  hybrid?: boolean;
}

interface MapplsMapInstance {
  on(event: 'click', callback: (e: { lngLat: { lat: number; lng: number } }) => void): void;
  addListener(event: 'click', callback: (e: { lngLat: { lat: number; lng: number } }) => void): void;
  remove(): void;
  setCenter(position: { lat: number; lng: number } | [number, number]): void;
  setZoom(zoom: number): void;
  getCenter(): { lat: number; lng: number };
  getZoom(): number;
}

interface MapplsMarkerOptions {
  position: { lat: number; lng: number } | [number, number];
  map: MapplsMapInstance;
  draggable?: boolean;
  html?: string;
  width?: number;
  height?: number;
}

interface MapplsMarkerInstance {
  setLngLat(position: [number, number] | { lat: number; lng: number }): void;
  setPosition(position: { lat: number; lng: number }): void;
  getPosition(): { lat: number; lng: number };
  addListener(event: string, callback: (e?: any) => void): void;
  remove(): void;
}
