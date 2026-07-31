# Hive API Gateway - Architecture Documentation

This document describes the architecture of the Hive API Gateway backend, its historical context, the rationale behind the recent directory restructure, and the engineering decisions guiding its development.

---

## 1. Overview

The **Hive API Gateway** is a backend integration layer built with **Node.js**, **Express**, and **JavaScript**. Its primary role is to orchestrate integrations between the core frontend client apps, the database backend (Convex), and third-party logistics/payment partners.

Currently, it manages live integrations for:
* **Porter** (Logistics & Delivery)
* **Razorpay** (Standard Payment Processing)

In the future, the gateway will expand to orchestrate:
* **Razorpay Route** (Marketplace split settlements and seller payouts)
* **Convex** (Dynamic marketplace state synchronizations)

---

## 2. Previous Architecture

Originally, the backend was a lightweight, flat Express structure. Everything was grouped into a few large files:

```
config/
controllers/
middleware/
routes/
services/
    porterService.js
    razorpayService.js
index.js
```

### Problems Identified:
* **Low Modularity**: The core integrations (`porterService.js` and `razorpayService.js`) had grown into massive files carrying multiple responsibilities: parsing payloads, constructing API requests, handling webhooks, and implementing error states.
* **Controller Bloat**: Route controllers were directly handling request validation, error try-catches, and business logic execution.
* **No Unified Contract/Validation**: Incoming request validation was ad-hoc, making API boundaries fragile.
* **Decentralized Configurations**: Environment variables and client configurations were instantiated in-place within the services, rather than being parsed and validated at initialization.

---

## 3. Mistake Avoided: The Parallel Src/ Directory

During an early refactoring proposal, an attempt was made to move the active codebase into a nested `src/` directory. This resulted in two parallel project structures existing simultaneously:

```
/
config/
controllers/
routes/
services/

src/
config/
controllers/
routes/
services/
```

This dual structure created immediate path conflicts, duplicate import references, and deployment confusion. 

**Decision**: The redundant `src/` folder was completely removed. The project strictly maintains the flat, root-level directory layout to preserve simplicity, clean imports, and compatibility with the existing build pipelines.

---

## 4. Current Folder Structure

The project has been restructured to cleanly separate configuration, schemas, controllers, middleware, and granular service domains:

```
config/
    env.js
    porter.js
    razorpay.js

constants/
    sellerStatus.js

controllers/
    porterController.js
    razorpayController.js
    sellerController.js

middleware/
    porterWebhook.js
    razorpayWebhook.js
    validate.js
    errorHandler.js

routes/
    porter.js
    razorpay.js
    seller.js

schemas/
    seller.schema.js

services/
    marketplace/
        sellerService.js
        paymentService.js
        transferService.js

    porter/
        quotes.js
        orders.js

    razorpay/
        accounts.js
        payments.js
        transfers.js
        webhooks.js

    porterService.js
    razorpayService.js

utils/
    ApiError.js

index.js
```

---

## 5. Folder & File Responsibilities

### Root Directories:
* **`config/`**: Centralizes client initializations and environment variable loaders. 
  * `env.js`: Parses and validates all `.env` requirements on startup.
  * `porter.js` & `razorpay.js`: Initialize and export client SDKs/headers.
* **`constants/`**: Holds static system values (e.g., `sellerStatus.js` defining status states like `PENDING`, `ACTIVE`, `SUSPENDED`). Keeping statuses here prevents magic-string bugs.
* **`controllers/`**: Thin handlers that ingest HTTP requests, hand over execution to services, and return responses. They do not contain business logic.
* **`middleware/`**: Shared route execution pipelines.
  * `porterWebhook.js` & `razorpayWebhook.js`: Verify webhook cryptographic signatures securely.
  * `validate.js`: Generic Joi/Zod middleware to validate request bodies against schemas before they reach controllers.
  * `errorHandler.js`: Intercepts thrown exceptions, formats them, and returns standard HTTP responses.
* **`routes/`**: Registers Express router paths and maps them to their respective validation middlewares and controllers.
* **`schemas/`**: Request validation definitions (e.g., `seller.schema.js` validating onboarding payloads). Separating validation schemas from controllers ensures reusable API contracts.
* **`utils/`**: Shared helper utility classes.
  * `ApiError.js`: A custom operational error wrapper extending standard `Error` to easily attach HTTP status codes.

### Restructured `services/` Directory:
Services are grouped into granular subfolders by vendor/module to support future modularization:
* **`services/marketplace/`**: Orchestrates local seller onboarding database updates, payments, and splits.
* **`services/porter/`**: Preparation files separating Porter operations into quotes and order management.
* **`services/razorpay/`**: Preparation files separating Razorpay actions into accounts, payments, and transfer operations.
* **`services/porterService.js` & `services/razorpayService.js`**: Legacy files that currently run the active production application.

---

## 6. Architectural & Design Decisions

### A. Gradual Services Migration (Important Safety Decision)
While the new subdirectories (`services/porter/` and `services/razorpay/`) have been laid out, the live integrations continue to run on the legacy `porterService.js` and `razorpayService.js` modules. 

* **Why?**: A complete rewrite of live logistics and payment services introduces a high regression risk. By keeping legacy files active, we ensure service continuity while allowing engineers to migrate individual functions to the new directories module-by-module.

### B. Avoiding Premature Abstractions in Marketplace Design
Instead of building a complex "Marketplace Engine" abstraction layer, the gateway uses a direct choreography model:

$$\text{Seller Controller} \longrightarrow \text{Seller Service} \longrightarrow \begin{cases} \text{Razorpay Service} \\ \text{Convex} \\ \text{Future Integrations} \end{cases}$$

* **Why?**: Premature abstraction increases complexity. By placing orchestration inside `sellerService.js`, we keep the flow readable and easily debuggable. An engine abstraction will only be introduced once the complexity justifies it.

### C. Pausing Razorpay Route Implementation
Although the folder skeleton is prepared for Razorpay Route account creation and split payouts, the coding implementation has been paused.

* **Why?**: Official payload contracts and sandbox credentials are still pending from Razorpay Support. Building API payloads based on assumptions or third-party blogs creates fragile integrations. We wait for official API documentation to ensure a reliable implementation.

---

## 7. Current Status & Roadmap

The refactoring leaves the codebase in a clean, stable state:
* **Restructured Layout**: Clean separation of concerns with a verified root structure.
* **Validation**: Request validation is decoupled from controllers.
* **Error Handling**: A centralized, custom `ApiError` format is established.
* **Live Features**: Porter and Razorpay integrations continue to run reliably via legacy service modules.

### Next Steps:
1. Complete validation audits on legacy routes.
2. Resume Razorpay Route implementation once official API documentation is provided.
3. Migrate legacy `porterService` and `razorpayService` code gradually into the modularized subfolders.
