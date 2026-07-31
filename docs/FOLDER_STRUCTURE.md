# Hive API Gateway - Folder Structure & File Manifest

This document explains the organization of directories and files in the Hive API Gateway backend.

---

## 1. Directory Structure Overview

The project is structured around the repository root, avoiding nesting packages within duplicate `src/` folders. This layout separates configuration, request routing, validations, business execution (services), and system-wide utilities.

```
config/             ← Server-side environment & client initializations
constants/          ← Static variables and configuration options
controllers/        ← Handlers extracting HTTP parameters and passing to services
middleware/         ← Request interceptors (auth, webhooks, schema validation)
routes/             ← Route paths mapping HTTP verbs to controllers
schemas/            ← API request validation schemas
services/           ← Internal logic orchestrating database & partner client calls
utils/              ← Custom helpers and global error structures
index.js            ← Boots HTTP server and handles process termination
```

---

## 2. Directory Manifests

### A. Config Folder (`config/`)
Holds server environment configurations and initializes third-party API SDKs.
* **`env.js`**: Parses and validates env properties (e.g. `PORT`, `RAZORPAY_KEY_ID`, etc.) at startup using Joi/Zod schema validators. Exports a frozen config object via `Object.freeze()` to prevent runtime modifications of system constants.
* **`porter.js`**: Initializes connection settings, auth tokens, and endpoint base paths for the Porter Logistics API.
* **`razorpay.js`**: Instantiates and exports the Razorpay payments client using authenticated server keys.

### B. Constants Folder (`constants/`)
Maintains enumerations to prevent spelling issues across schemas and queries.
* **`sellerStatus.js`**: Exports system-wide status constants for Boutique owners:
  ```javascript
  module.exports = Object.freeze({
    NOT_STARTED: "not_started",
    CREATED: "created",
    UNDER_REVIEW: "under_review",
    ACTIVATED: "activated",
    NEEDS_CLARIFICATION: "needs_clarification"
  });
  ```

### C. Controllers Folder (`controllers/`)
Controllers act as the entrance gate for API execution. They extract inputs (`req.body`, `req.query`, `req.params`) and trigger services.
* **`porterController.js`**: Triggers logistics quote generation and booking requests.
* **`razorpayController.js`**: Orchestrates checkout session updates and webhook captures.
* **`sellerController.js`**: Directs onboarding checks and Razorpay account setup.

### D. Middleware Folder (`middleware/`)
Global or route-specific interceptors that execute in the Express pipeline.
* **`porterWebhook.js`**: Verifies signature headers against `PORTER_WEBHOOK_SECRET`.
* **`razorpayWebhook.js`**: Verifies HMAC SHA256 signatures against `RAZORPAY_ROUTE_WEBHOOK_SECRET` before parsing payloads.
* **`validate.js`**: Middleware that compares the incoming request parameters (`req.body`) against a schema model. If it fails, it calls `next(new ApiError(400, "Validation failed..."))`.
* **`errorHandler.js`**: Captures thrown `ApiError` instances, logs details to the console via `pino`, and formats clean JSON error responses.

### E. Routes Folder (`routes/`)
Binds HTTP verbs (GET, POST, PUT, DELETE) and middleware configurations to controllers.
* **`porter.js`**: Exposes `/v1/logistics` endpoints.
* **`razorpay.js`**: Exposes `/v1/payments` endpoints.
* **`seller.js`**: Exposes `/v1/sellers` onboarding pathways.

### F. Schemas Folder (`schemas/`)
Declares structural verification schemas using verification frameworks (like Joi or Zod).
* **`seller.schema.js`**: Defines schemas for incoming registration packets.

### G. Services Folder (`services/`)
Separates application code into two layers:
1. **Legacy Files (`porterService.js` and `razorpayService.js`)**: These files remain in the root of the services directory and continue to run the live production gateway.
2. **Modular Features Folders (`porter/`, `razorpay/`, `marketplace/`)**: Modular folders containing separated task scripts (e.g. `porter/quotes.js`, `porter/orders.js`, `razorpay/accounts.js`, etc.) preparing for future migrations.

#### Gradual Migration Strategy:
Rewriting active billing and shipping pipelines in a single pass introduces significant downtime risks. Instead, we use a gradual migration strategy. The modular subfolders act as placeholders; code is migrated piece-by-piece and verified via parallel production deployments, leaving active legacy files untouched until each piece is fully validated.

### H. Utils Folder (`utils/`)
Holds general helper components.
* **`ApiError.js`**: Custom error class that extends standard JavaScript `Error` by adding an `httpStatusCode` property, standardizing error formatting.
