# Hive Monorepo (`hivenow.in`)

## 1. Domain & Business Overview
- **Domain:** `hivenow.in` — Hyper-local boutique fashion aggregator marketplace based in Kochi / Kerala, India.
- **Mission:** Connect local fashion boutiques & designers with shoppers through quick delivery (Porter), PWA, and AI-assisted workflows.
- **Tone & Mindset:** Fast execution, clean architecture, strict unit economics (e.g. avoiding unnecessary SMS fees via WhatsApp / Web Push), founder mentality.

---

## 2. Monorepo Architecture (Turborepo)

```
├── apps/
│   ├── customer/        # Next.js App Router (Customer storefront, PWA, SEO, Web Push, Zustand)
│   ├── boutique/        # Next.js App Router (Boutique owner portal, inventory, catalog, AI copy)
│   └── admin/           # Next.js App Router (Internal admin operations, TipTap blog, campaigns)
├── packages/
│   ├── ui/              # Shared UI components & design tokens (Tailwind CSS)
│   ├── types/           # Shared TypeScript interfaces & validators
│   └── eslint-config/   # Shared linting configs
└── convex/              # Convex Backend (Schema, Queries, Mutations, Actions, Auth, Crons)
```

---

## 3. Tech Stack & Key Services

- **Frontend:** Next.js (App Router), React 18/19, Tailwind CSS, Lucide Icons, Zustand (Cart & Wishlist), Clerk Auth.
- **Backend & Database:** Convex (`convex/`) — Reactive queries, transactional mutations, edge actions.
- **Media & Infrastructure:** Cloudflare R2 (`/api/upload/r2`), Vercel Deployment.
- **Logistics:** Porter API integration for on-demand hyper-local pickup and delivery.
- **Messaging & Notifications:** Meta WhatsApp Cloud API (WABA templates), Web Push API (VAPID).
- **Payment Gateway:** Razorpay Standard & Razorpay Route (marketplace split payouts).

---

## 4. Essential Workflows & Commands

### Development
```bash
# Start all apps in dev mode
npm run dev

# Start specific app
npm run dev --filter=customer
npm run dev --filter=boutique
npm run dev --filter=admin

# Start Convex local dev backend
npx convex dev
```

### Build & Typecheck
```bash
# Build all workspaces
npm run build

# Build individual apps
npm run build --filter=customer
npm run build --filter=boutique
npm run build --filter=admin

# Typecheck with TypeScript
npm run typecheck
```

### Convex Deployment & Migrations
```bash
# Deploy Convex schema and functions to production
npx convex deploy -y

# Run Convex functions or migrations from CLI
npx convex run migrations:recalculateAllProductPrices
npx convex run --inline-query "await ctx.db.query('products').first()"
```

---

## 5. Critical Pricing & Financial Rules

1. **Database Unit Conventions:**
   - Database prices in `products` table are stored in **PAISE** (`price`, `basePrice`, `discountPrice`, `mrp`).
   - Example: ₹900 base price = `90000` paise.

2. **All-Inclusive Upfront Storefront Pricing:**
   - Storefront display price includes platform fees and taxes upfront:
     `Customer Price = Seller Base Price + Handling Fee (₹29) + Platform Fee (₹20) + GST (18% on fees = ₹8.82)`.
   - On the customer storefront (PDP, Catalog, Cart), prices display the complete price.
   - At checkout, zero hidden fees are added. Grand Total = `Product Total + Delivery Fee - Discount`.

3. **Seller Payouts:**
   - Sellers are paid their listed base price minus platform commission & GST on commission:
     `Seller Net Payout = Base Price - Commission - (Commission × GST Rate)`.

---

## 6. Authentication & User Management

- **Clerk Integration:** Frontend authenticates with Clerk (`@clerk/nextjs`).
- **Convex Auto-Linking:** `convex/users.ts` automatically associates Clerk accounts with existing boutique/customer documents via verified email addresses.
- **Role-Based Access Control (RBAC):** Gated using `requireRole(ctx, "admin" | "boutique" | "customer")` in `convex/lib/auth.ts`.

---

## 7. Code Style & Engineering Standards

- **TypeScript:** Strict type checking. Avoid `any` where possible.
- **Component Design:** Modular, responsive (mobile-first for customer PWA), accessible, and performance-optimized (Next.js Image, lazy loading).
- **Convex Best Practices:**
  - Index lookups with `.withIndex()` for high performance.
  - Separate read-only queries from state-modifying mutations.
  - Use actions only for external third-party API calls (Porter, Razorpay, WhatsApp, R2).

---

## 8. Skills

### Skill: Caveman Mode
- **Trigger:** When requested or invoked with `/caveman` or `caveman mode`.
- **Core Directives:**
  1. Zero fluff. No greetings, no filler ("Sure thing!", "I'd be happy to help!"), no boilerplate apologies.
  2. Speak in concise, high-density statements (Caveman/Telegraphic style).
  3. Lead directly with the code diff, exact file paths, or executable shell commands.
  4. Explain only the *why* in 1–2 bullet points maximum.
  5. Ruthlessly prioritize speed and execution over polite discourse.

