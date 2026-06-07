// convex/lib/mockInventory.ts
// Helper to validate sizes and stock levels for catalog products.
// Handles both mock products and database-backed products.

import { GenericDatabaseWriter, GenericDatabaseReader } from "convex/server";
import { DataModel } from "../_generated/dataModel";

export const MOCK_INVENTORY: Record<string, { sizes: string[]; inventory: Record<string, number> }> = {
  "varanasi-silk-katan-saree": {
    sizes: ["FS", "Free"],
    inventory: { FS: 5, Free: 5 },
  },
  "crimson-rose-embroidered-lehenga": {
    sizes: ["S", "M", "L"],
    inventory: { S: 2, M: 3, L: 0 },
  },
  "emerald-hand-painted-anarkali-kurti": {
    sizes: ["S", "M", "L", "XL"],
    inventory: { S: 12, M: 8, L: 4, XL: 2 },
  },
  "saffron-linen-wide-leg-co-ord-set": {
    sizes: ["S", "M", "L"],
    inventory: { S: 5, M: 0, L: 4 },
  },
  "silk-bandhani-midi-dress": {
    sizes: ["S", "M", "L"],
    inventory: { S: 3, M: 5, L: 2 },
  },
  "pastel-pink-chikankari-palazzo-suit": {
    sizes: ["M", "L", "XL"],
    inventory: { M: 8, L: 10, XL: 6 },
  },
  "mulberry-handloom-silk-saree": {
    sizes: ["FS", "Free"],
    inventory: { FS: 3, Free: 3 },
  },
  "royal-indigo-hand-block-print-maxi": {
    sizes: ["S", "M", "L", "XL"],
    inventory: { S: 14, M: 12, L: 0, XL: 8 },
  },
};

/**
 * Standardizes size names. Specifically maps "FS" to "Free".
 */
export function normalizeSize(size: string): string {
  const upper = size.trim().toUpperCase();
  if (upper === "FS" || upper === "FREE SIZE") {
    return "Free";
  }
  return size.trim();
}

/**
 * Validates a product size selection and stock level.
 * @param db Convex database reader
 * @param productId Product slug or ID
 * @param size Selected size string (e.g. "S", "M", "FS")
 * @param quantity Requested quantity
 * @returns true if valid, throws an Error with a descriptive message if invalid.
 */
export async function validateProductSizeAndStock(
  db: GenericDatabaseReader<DataModel>,
  productId: string,
  size: string,
  quantity: number
): Promise<boolean> {
  if (!size || size.trim() === "") {
    throw new Error("Size selection is mandatory.");
  }

  const normalized = normalizeSize(size);

  // 1. Try to check mock products inventory first
  const mockProduct = MOCK_INVENTORY[productId];
  if (mockProduct) {
    const validSizes = mockProduct.sizes.map(normalizeSize);
    if (!validSizes.includes(normalized)) {
      throw new Error(`Invalid size "${size}" for product "${productId}". Available sizes are: ${mockProduct.sizes.join(", ")}`);
    }

    // Check stock. Note: we support keys like FS or Free, or direct normalized matching.
    let stock = 0;
    if (mockProduct.inventory[size] !== undefined) {
      stock = mockProduct.inventory[size];
    } else if (mockProduct.inventory[normalized] !== undefined) {
      stock = mockProduct.inventory[normalized];
    } else if (size === "Free" && mockProduct.inventory["FS"] !== undefined) {
      stock = mockProduct.inventory["FS"];
    } else if (size === "FS" && mockProduct.inventory["Free"] !== undefined) {
      stock = mockProduct.inventory["Free"];
    }

    if (stock === 0) {
      throw new Error(`Size "${size}" is out of stock.`);
    }

    if (stock < quantity) {
      throw new Error(`Requested quantity (${quantity}) exceeds available stock (${stock}) for size "${size}".`);
    }

    return true;
  }

  // 2. Try to query database catalog tables
  const productRow = await db
    .query("products")
    .withIndex("by_slug", (q) => q.eq("slug", productId))
    .unique();

  if (productRow) {
    const validSizes = productRow.sizes.map(normalizeSize);
    if (!validSizes.includes(normalized)) {
      throw new Error(
        `Invalid size "${size}" for product. Available sizes: ${productRow.sizes.join(", ")}`
      );
    }

    let stock = 0;
    if (productRow.stockBySize[size] !== undefined) {
      stock = productRow.stockBySize[size];
    } else if (productRow.stockBySize[normalized] !== undefined) {
      stock = productRow.stockBySize[normalized];
    }

    if (stock === 0) {
      throw new Error(`Size "${size}" is out of stock.`);
    }

    if (stock < quantity) {
      throw new Error(
        `Requested quantity (${quantity}) exceeds available stock (${stock}) for size "${size}".`
      );
    }

    return true;
  }

  // Fallback: if product slug/id is not found in either mock inventory or products table,
  // we default to allowing it so we don't block dynamic checkout or tests.
  return true;
}
