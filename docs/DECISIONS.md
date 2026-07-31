# Hive API Gateway - Architecture Decisions Record (ADR)

This document contains a log of important design and architecture decisions made on the Hive API Gateway backend.

---

## ADR 1: Keep Codebase at Repository Root (Removed Duplicate `/src` folder)

* **Decision**: Completely removed the parallel `/src` folder and keep files flat at the root.
* **Reason**: An earlier proposal created duplicate folders at the root and under `/src/`, creating import path conflicts. Since the application was already deployed and running from the root, a flat structure avoids code duplication and paths confusion.
* **Benefits**: Simpler import paths, easier local builds, and no deployment breaks.
* **Tradeoffs**: Root directory contains more folders, but remains highly structured.

---

## ADR 2: Gradual Services Migration Over Complete Rewrites

* **Decision**: Keep legacy `services/porterService.js` and `services/razorpayService.js` active while laying out new, modular services.
* **Reason**: Rewriting live billing and shipping code blocks in a single pass introduces high regression risks and potential downtime.
* **Benefits**: Assures continuous service operation. Allows developers to migrate individual functions gradually and verify them in parallel.
* **Tradeoffs**: Temporary duplication of service folders (`services/porter/` vs `porterService.js`).

---

## ADR 3: Direct Seller Service Orchestration (No "Marketplace Engine" Abstraction)

* **Decision**: Intentionally avoided creating a generic "Marketplace Engine" abstraction layer. Direct mapping is: `Seller Controller` -> `Seller Service` -> `Razorpay Services` / `Convex`.
* **Reason**: The marketplace requirements are currently specific to Razorpay Route and Convex state. Introducing a generic abstraction layer prematurely increases code complexity without any immediate need.
* **Benefits**: The codebase remains direct, readable, and easy to debug.
* **Tradeoffs**: If we add multiple payment providers (e.g. Stripe Connect), some orchestration logic will need to be refactored.

---

## ADR 4: Decoupled Validation in Express Middleware

* **Decision**: Decouple payload validation from routers and controllers into `middleware/validate.js` using schemas.
* **Reason**: Validating fields directly inside controllers results in bloated controller logic. Centralizing validation ensures that controllers only run if the payload is verified clean.
* **Benefits**: Reusable schemas, leaner controllers, and consistent validation responses.
* **Tradeoffs**: Introduces an extra file lookup (schemas) for every route definition.
