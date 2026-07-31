# Hive API Gateway - Flow Diagrams

This document contains flowcharts and sequence maps for all core operations executed within the Hive ecosystem.

---

## 1. Customer Order Creation & Logistics Dispatch

This flowchart outlines the complete path from a checkout click on the customer storefront to the booking of a local delivery agent via the Porter service.

```mermaid
flowchart TD
    Customer[Customer Storefront Checkout] -->|1. Place Order| Convex{Convex Backend}
    Convex -->|2. Verify Inventory & Pricing| Convex
    Convex -->|3. Trigger Payments API| Gateway[Hive API Gateway]
    Gateway -->|4. Charge Customer Card| Razorpay[Razorpay API]
    Razorpay -->|5. Payment Success Callback| Gateway
    Gateway -->|6. Save Order & Mark Paid| Convex
    Convex -->|7. Push Order to Partner Dashboard| Seller[Boutique Partner Portal]
    Seller -->|8. Dispatch Order| Convex
    Convex -->|9. Get Delivery Quote| Gateway
    Gateway -->|10. Request Quote| Porter[Porter Delivery API]
    Porter -->|11. Return Quote Price| Gateway
    Gateway -->|12. Return Quote| Convex
    Convex -->|13. Accept Quote & Book| Gateway
    Gateway -->|14. Create Order Request| Porter
    Porter -->|15. Return Delivery CRN| Gateway
    Gateway -->|16. Attach CRN & Mark Booked| Convex
```

---

## 2. Webhook Event Ingestion Flow

The webhook ingest pipeline ensures that third-party events (like Porter driver movements or Razorpay payouts) are cryptographically verified before touching database states.

```mermaid
flowchart TD
    Partner[Third-Party Partner: Porter / Razorpay] -->|1. Dispatch HTTP POST Event| Cloudflare{Cloudflare DNS & SSL}
    Cloudflare -->|2. Proxy HTTPS| Nginx[Nginx Reverse Proxy]
    Nginx -->|3. Forward HTTP to Local Port 3000| Express[Express Server Root]
    Express -->|4. Extract Headers & Payload| SignatureCheck{Verify Signature / Secret}
    
    SignatureCheck -->|Failed Validation| ErrorResponse[Return 401 Unauthorized / Drop Payload]
    SignatureCheck -->|Passed Verification| SchemaCheck{Validate Schema}
    
    SchemaCheck -->|Invalid Fields| ValidationFail[Return 400 Bad Request]
    SchemaCheck -->|Valid Schema| Controller[Controller Action]
    
    Controller -->|5. Extract Event Details| Service[Webhook Service]
    Service -->|6. Map Event to State| Service
    Service -->|7. POST Webhook Payload| Convex{Convex DB}
    Convex -->|8. Mutate database records| Convex
    Convex -.->|9. Live Update Dashboard| PartnerUI[Partner / Client Store UI]
    Service -->|10. Return 200 OK Response| Partner
```

---

## 3. Seller Onboarding Flow (Razorpay Hosted KYC)

Instead of collecting banking and personal identity data on our frontend, we use Razorpay's KYC Hosted Portal.

```mermaid
flowchart TD
    Partner[Boutique Owner] -->|1. Clicks Set Up Payout Account| Frontend[Boutique Partner UI]
    Frontend -->|2. POST /api/seller/onboard-razorpay| Gateway[Next.js Server API]
    Gateway -->|3. Check razorpayAccountId| Convex{Convex DB}
    
    Convex -->|Account ID Exists| GetLink[Fetch Fresh KYC Link]
    Convex -->|Account ID Missing| CreateAccount[Create Account v2/accounts]
    
    CreateAccount -->|4. POST Minimal Business Info| Razorpay[Razorpay API]
    Razorpay -->|5. Return acc_12345| CreateAccount
    CreateAccount -->|6. Update razorpayAccountId & kycStatus: created| Convex
    CreateAccount --> GetLink
    
    GetLink -->|7. POST /onboarding_links| Razorpay
    Razorpay -->|8. Return hosted URL| GetLink
    GetLink -->|9. Return redirectUrl| Frontend
    Frontend -->|10. Opens Hosted Portal| HostedPage[Razorpay KYC Verification Page]
    
    HostedPage -->|Partner Fills Details & Bank Account| Razorpay
    Razorpay -.->|11. Webhook account.activated / account.under_review| GatewayWebhook[Webhook Listener]
    GatewayWebhook -->|12. Patch kycStatus: activated / under_review| Convex
```

---

## 4. Error Handling & Validation Pipelines

This flowchart describes the path of an incoming Express request failing validation or encountering runtime exceptions.

```mermaid
flowchart TD
    Request[Incoming Express Request] --> Router[Express Router]
    Router --> Validate{Validate Middleware}
    
    Validate -->|Fails Schema check| ApiError[Throw ApiError: 400 Bad Request]
    Validate -->|Passes check| Controller[Execute Controller]
    
    Controller -->|Throws DB / API Exception| SvcError[Catch & Throw ApiError]
    Controller -->|Succeeds| Response[Send 200 OK Response]
    
    ApiError --> ErrorHandler[errorHandler Middleware]
    SvcError --> ErrorHandler
    
    ErrorHandler -->|Log to Console| Log[Pino-HTTP Logger]
    ErrorHandler -->|Format clean JSON response| Client[Return formatted Error Payload to client]
```
