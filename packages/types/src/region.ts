// packages/types/src/region.ts

export interface Region {
  _id:             string;
  _creationTime:   number;
  name:            string;   // "Banjara Hills"
  city:            string;   // "Hyderabad"
  pincodes:        string[];
  polygonGeoJson?: string;
  isActive:        boolean;
  createdAt:       number;
  updatedAt:       number;
}

export interface ServiceabilityResult {
  serviceable:     boolean;
  regionId?:       string;
  regionName?:     string;
  nearbyRegions?:  Array<{ _id: string; name: string; city: string }>;
}
