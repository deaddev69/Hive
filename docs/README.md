# Hive Backend Documentation Index

This directory contains the engineering documentation for the Hive API Gateway and the database/payment integration architecture.

---

## Document Index

* **[ARCHITECTURE.md](file:///e:/HivebyTailorBee/HivebyTailorBee/docs/ARCHITECTURE.md)**: Describes overall system design, request-response lifecycles, and webhook ingestion loops using Mermaid sequence diagrams.
* **[FLOWS.md](file:///e:/HivebyTailorBee/HivebyTailorBee/docs/FLOWS.md)**: Visual flowchart guides for logistics quotes, checkout bookings, hosted KYC onboarding, and error validations.
* **[FOLDER_STRUCTURE.md](file:///e:/HivebyTailorBee/HivebyTailorBee/docs/FOLDER_STRUCTURE.md)**: File-by-file breakdown of Express gateway directories and the gradual service migration strategy.
* **[API_REFERENCE.md](file:///e:/HivebyTailorBee/HivebyTailorBee/docs/API_REFERENCE.md)**: OpenAPI-style parameters tables and return payload descriptions for all logistics and payment endpoints.
* **[WEBHOOKS.md](file:///e:/HivebyTailorBee/HivebyTailorBee/docs/WEBHOOKS.md)**: In-depth guide to cryptographic signature verification (HMAC SHA256) and callback event mapping.
* **[CONFIGURATION.md](file:///e:/HivebyTailorBee/HivebyTailorBee/docs/CONFIGURATION.md)**: Complete list of environment variables, dotenv config loaders, and secrets rotation guides.
* **[DEPLOYMENT.md](file:///e:/HivebyTailorBee/HivebyTailorBee/docs/DEPLOYMENT.md)**: Instructions on configuring Nginx reverse proxy mappings and PM2 background process lifecycles.
* **[SECURITY.md](file:///e:/HivebyTailorBee/HivebyTailorBee/docs/SECURITY.md)**: Explains the Helmet security headers, rate-limiting, and compression middlewares.
* **[ROADMAP.md](file:///e:/HivebyTailorBee/HivebyTailorBee/docs/ROADMAP.md)**: Timeline of current integration states and the upcoming Razorpay Route marketplace roadmap.
* **[DECISIONS.md](file:///e:/HivebyTailorBee/HivebyTailorBee/docs/DECISIONS.md)**: Architecture Decision Records (ADRs) detailing core decisions, benefits, and development tradeoffs.

---

## Onboarding Guide for New Engineers

1. Read **[FOLDER_STRUCTURE.md](file:///e:/HivebyTailorBee/HivebyTailorBee/docs/FOLDER_STRUCTURE.md)** to understand where to place config variables, routes, schemas, and controllers.
2. Review **[CONFIGURATION.md](file:///e:/HivebyTailorBee/HivebyTailorBee/docs/CONFIGURATION.md)** to clone the `.env.example` configurations.
3. Walk through **[ARCHITECTURE.md](file:///e:/HivebyTailorBee/HivebyTailorBee/docs/ARCHITECTURE.md)** and **[FLOWS.md](file:///e:/HivebyTailorBee/HivebyTailorBee/docs/FLOWS.md)** to understand how client actions trigger database mutations and partner updates.
4. Reference **[API_REFERENCE.md](file:///e:/HivebyTailorBee/HivebyTailorBee/docs/API_REFERENCE.md)** and **[WEBHOOKS.md](file:///e:/HivebyTailorBee/HivebyTailorBee/docs/WEBHOOKS.md)** when writing new route integrations.
5. Refer to **[DEPLOYMENT.md](file:///e:/HivebyTailorBee/HivebyTailorBee/docs/DEPLOYMENT.md)** to reload background PM2 services safely.
