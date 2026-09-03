// packages/types/src/index.ts
// Hive Platform — Shared TypeScript Types
// All types derived from HIVE_CONVEX_DATA_MODEL.md and HIVE_SYSTEM_ARCHITECTURE.md

// ─── RE-EXPORTS ──────────────────────────────────────────────────────────────
export * from "./user";
export * from "./boutique";
export * from "./product";
// Vertical registry. Imports from ./product, so it is exported from the barrel
// rather than re-exported by ./product, which would create an import cycle.
export * from "./verticals";
export * from "./order";
export * from "./payment";
export * from "./shipment";
export * from "./claim";
export * from "./notification";
export * from "./region";
export * from "./common";
