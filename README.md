<p align="center">
  <img src="apps/customer/public/logo.png" alt="Hive by TailorBee" width="120" />
</p>

<h1 align="center">Hive by TailorBee</h1>

<p align="center">
  <strong>Hyperlocal Boutique Fashion, Delivered Today</strong>
</p>

<p align="center">
  A full-stack marketplace platform connecting customers with local boutique fashion stores for same-day delivery.
</p>

---

## Overview

Hive is a hyperlocal fashion marketplace built for the Indian boutique ecosystem. It connects customers with curated boutique stores in their city, enabling discovery, purchase, and same-day delivery of designer fashion.

The platform consists of three portals:

- **Customer App** — Browse collections, discover boutiques, place orders with real-time delivery tracking
- **Seller Center** — Boutique owners manage inventory, process orders, track deliveries, and view analytics
- **Admin Console** — Platform operators manage merchants, monitor compliance, handle claims, and oversee operations

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 15, React 19, TypeScript, Tailwind CSS |
| **Backend** | [Convex](https://convex.dev) (real-time database, serverless functions, cron jobs) |
| **Auth** | [Clerk](https://clerk.com) (OAuth, JWT, role-based access control) |
| **Payments** | [Razorpay](https://razorpay.com) (payment gateway, webhooks, refunds) |
| **Media** | Cloudflare R2 (object storage, presigned uploads) |
| **Email** | [Resend](https://resend.com) (transactional emails) |
| **Maps** | Google Maps Platform (geocoding, location picker) |
| **Monorepo** | [Turborepo](https://turbo.build) (build orchestration, workspace management) |

## Project Structure

```
hive-platform/
├── apps/
│   ├── customer/          # Customer-facing storefront (Next.js, port 3000)
│   └── admin/             # Seller Center + Admin Console (Next.js, port 3001)
├── convex/                # Backend: schema, mutations, queries, actions, webhooks, crons
│   ├── webhooks/          # Clerk, Razorpay, logistics webhook handlers
│   ├── lib/               # Shared backend utilities (auth, rate-limit, notifications)
│   └── media/             # Media upload pipeline (R2 integration)
├── packages/
│   ├── types/             # Shared TypeScript types (@hive/types)
│   ├── ui/                # Shared UI component library (@hive/ui)
│   └── utils/             # Shared utilities (@hive/utils)
├── .env.example           # Environment variable template
├── turbo.json             # Turborepo pipeline configuration
└── package.json           # Root workspace configuration
```

## Getting Started

### Prerequisites

- **Node.js** ≥ 20.0.0
- **npm** ≥ 9.0.0
- A [Convex](https://convex.dev) account
- A [Clerk](https://clerk.com) account

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/hive-platform.git
   cd hive-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**

   Copy the example file and fill in your credentials:
   ```bash
   cp .env.example .env.local
   ```

   See [`.env.example`](.env.example) for the full list of required variables with descriptions.

   You will also need `.env.local` files in:
   - `apps/customer/.env.local` — Clerk keys, Google Maps key, Razorpay key
   - `apps/admin/.env.local` — Clerk keys
   - `convex/.env.local` — Convex deployment URL

4. **Set up Convex**
   ```bash
   npx convex dev
   ```
   This starts the Convex development server and syncs your schema.

5. **Set up Clerk**
   - Create a JWT Template named `convex` in Clerk Dashboard → JWT Templates
   - Set `CLERK_JWT_ISSUER_DOMAIN` in Convex Dashboard → Settings → Environment Variables

6. **Start the development servers**
   ```bash
   npm run dev
   ```
   - Customer app: http://localhost:3000
   - Admin/Seller portal: http://localhost:3001

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start all apps in development mode |
| `npm run dev:customer` | Start only the customer app |
| `npm run dev:admin` | Start only the admin/seller app |
| `npm run build` | Build all apps for production |
| `npm run typecheck` | Run TypeScript type checking across all workspaces |
| `npm run lint` | Run ESLint across all workspaces |
| `npm run clean` | Clean all build artifacts and node_modules |
| `npm run convex:dev` | Start Convex development server |
| `npm run convex:deploy` | Deploy Convex to production |

## Architecture

```
┌──────────────┐     ┌──────────────┐
│  Customer    │     │ Admin/Seller │
│  (Next.js)   │     │  (Next.js)   │
│  Port 3000   │     │  Port 3001   │
└──────┬───────┘     └──────┬───────┘
       │                     │
       │   ┌─────────────┐   │
       └───┤   Convex     ├───┘
           │  (Backend)   │
           │  Real-time   │
           │  Database    │
           └──┬───┬───┬──┘
              │   │   │
     ┌────────┘   │   └────────┐
     ▼            ▼            ▼
  ┌──────┐   ┌────────┐   ┌────────┐
  │Clerk │   │Razorpay│   │  R2    │
  │(Auth)│   │(Pay)   │   │(Media) │
  └──────┘   └────────┘   └────────┘
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines, code style, and pull request process.

## Security

If you discover a security vulnerability, please see [SECURITY.md](SECURITY.md) for responsible disclosure guidelines.

## License

See [LICENSE](LICENSE) for details.
