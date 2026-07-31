# Hive API Gateway - System Architecture

This document describes the overall system architecture of the Hive API Gateway and maps out the request, response, and webhook lifecycles.

---

## 1. Overall System Architecture

The Hive platform separates core application state, client portals, and external third-party integrations into three distinct layers:
1. **Frontend Portals** (Next.js Apps for Customer, Admin, and Boutique Partner).
2. **Convex Backend** (Acts as the database, serverless schema validator, and core event engine).
3. **Hive API Gateway** (An Express Node.js application running on an Ubuntu VPS, acting as a public proxy and security gateway for webhook ingestions and logistics/payment integrations).

```mermaid
graph TD
    Client[Next.js Client Apps] <-->|WebSockets / Mutations| Convex[Convex Backend]
    Convex <-->|HTTP Actions / REST| Gateway[Hive API Gateway]
    Gateway <-->|Partner REST APIs| Porter[Porter Logistics API]
    Gateway <-->|Partner REST APIs| Razorpay[Razorpay Payment API]
    Porter -.->|Webhooks| Gateway
    Razorpay -.->|Webhooks| Gateway
```

---

## 2. Request & Response Lifecycle

When a client application or an external partner issues a request to the Hive API Gateway, it goes through our centralized request lifecycle:

```mermaid
sequenceDiagram
    autonumber
    actor Client as External Client / Partner
    participant CF as Cloudflare (DNS & Edge)
    participant Nginx as Nginx (Reverse Proxy)
    participant Express as Express App (Root)
    participant Auth as Webhook/Auth Middleware
    participant Val as Validate Middleware (Zod/Joi)
    participant Ctrl as Route Controller
    participant Svc as Feature Service
    participant Convex as Convex / Partner API

    Client->>CF: Send Request (HTTPS)
    CF->>Nginx: Forward Request
    Nginx->>Express: Proxy Pass to Local Port (3000)
    Express->>Auth: Signature Verification (for Webhooks)
    Auth-->>Express: Signature Verified (or throws 401/403)
    Express->>Val: Ingest Schema Validation
    Val-->>Express: Schema Valid (or throws 400 Validation Error)
    Express->>Ctrl: Trigger Controller Action
    Ctrl->>Svc: Execute Business Logic
    Svc->>Convex: Outbound Request (Convex / Partner API)
    Convex-->>Svc: Success Response
    Svc-->>Ctrl: Returns Processed Data
    Ctrl-->>Client: Send HTTP 200 OK Response
```

### Request Phase:
1. **Edge Filter**: The request passes through Cloudflare (for DDoS protection and SSL enforcement) to the target Ubuntu VPS.
2. **Reverse Proxy**: Nginx intercepts the request on port 443, appends the headers (`X-Real-IP`, `X-Forwarded-For`), and proxies it to local port 3000.
3. **Global Middlewares**: Express parses the payload (`express.json()`), compresses the output (`compression`), and adds standard security headers (`helmet`).
4. **Signature Check (Webhooks only)**: The payload is cryptographically validated using HMAC SHA256 against a shared secret to confirm authenticity.
5. **Payload Validation**: The schema-validator middleware compares the request body against standard models.
6. **Controller Mapping**: The clean payload is handed off to the router and matched with a controller.

### Response Phase:
1. **Centralized Error Interceptor**: If any validation, network, or server error occurs, it is thrown as a custom `ApiError` class. The `errorHandler` middleware catches it and maps it to a standard JSON error response:
   ```json
   {
     "error": "Error Message Here",
     "statusCode": 400
   }
   ```
2. **Successful Execution**: The controller responds with an HTTP status code (200, 201) and returns a clean JSON schema.

---

## 3. Webhook Lifecycle

Webhooks from logistics partners (like Porter) or payment processors (like Razorpay) report asynchronous updates about physical transactions (e.g. driver assigned, payment captured). Since these partners cannot establish direct WebSockets to Convex, they ping the Express API Gateway.

```mermaid
sequenceDiagram
    autonumber
    actor Partner as Porter / Razorpay API
    participant Gateway as Express Gateway (Port 3000)
    participant Validate as Webhook Signature Validator
    participant Service as Gateway Webhook Service
    participant Convex as Convex HTTP Webhook Action
    participant Client as Next.js Client App

    Partner->>Gateway: POST /v1/webhooks/porter (Payload + Signature)
    Gateway->>Validate: Extract and verify X-Razorpay-Signature / X-API-Key
    alt Signature Invalid
        Validate-->>Partner: HTTP 401 Unauthorized
    else Signature Valid
        Validate-->>Gateway: Signature Validated
        Gateway->>Service: Parse payload and map status
        Service->>Convex: POST /api/webhooks/porter (Signed payload)
        Convex-->>Service: HTTP 200 OK (State Updated in DB)
        Service-->>Partner: HTTP 200 OK (Acknowledge Receipt)
        Convex-->>Client: WebSocket Push (UI Live Update)
    end
```

### Webhook Verification Process:
* For **Porter**: Validates incoming API keys or signature headers against the server-configured `PORTER_WEBHOOK_SECRET`.
* For **Razorpay**: Recomputes the SHA256 signature using the raw payload body and `RAZORPAY_ROUTE_WEBHOOK_SECRET` and matches it against `x-razorpay-signature` header.
* **Database Sync**: The validated webhook parameters are mapped into a standardized payload and forwarded to Convex HTTP actions, which patch database documents and trigger WebSocket push alerts to partner and client dashboards.
