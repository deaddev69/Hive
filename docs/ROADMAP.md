# Hive API Gateway - Development Roadmap

This document outlines the current integration status and future roadmap of the Hive API Gateway.

---

## 1. Current Integration Status

* **Porter Logistics**: **COMPLETED**  
  * Real-time local route quotes, order bookings, and driver updates webhook synchronization are live.
* **Razorpay Basic Payments**: **COMPLETED**  
  * Standard checkout session creation, card charging, and capture confirmation hooks are fully integrated.
* **Marketplace (Razorpay Route)**: **PAUSED**  
  * **Reason**: Official API endpoints and sandbox testing configurations are pending from Razorpay Partner Support.
  * **Rationale**: To prevent rewriting custom code blocks based on assumptions or outdated docs, Route development is paused until official verification payloads are delivered.

---

## 2. Razorpay Route Implementation Roadmap

Once the official API endpoints are validated by Razorpay Support, Route integration will be implemented in the following order:

```mermaid
grid
    direction LR
    A[Phase 1: Accounts Onboarding] --> B[Phase 2: Split Transfers]
    B --> C[Phase 3: Webhook Observers]
    C --> D[Phase 4: Hold Release on Delivery]
```

### Phase 1: Partner Accounts Onboarding
* **Goal**: Enable sellers to link their bank accounts securely via Razorpay KYC Hosted Links.
* **Actions**: Expose `/api/seller/onboard-razorpay` to generate onboarding URLs dynamically.

### Phase 2: Split checkout Transfers
* **Goal**: Split customer transaction totals at checkout into boutique payouts and platform commissions.
* **Actions**: Update payment creation calls in Convex (`payments.ts`) to include transfer splits:
  ```json
  {
    "amount": 500000,
    "currency": "INR",
    "transfers": [
      {
        "account": "acc_BoutiqueAccountID",
        "amount": 450000,
        "on_hold": true
      }
    ]
  }
  ```

### Phase 3: Webhook Observers
* **Goal**: Observe Route account status and KYC reviews.
* **Actions**: Integrate signature-verified listeners for `account.activated`, `account.under_review`, and `account.needs_clarification`.

### Phase 4: Hold Payout Release on Delivery
* **Goal**: Release payout splits once the delivery agent marks a package as successfully hand-delivered.
* **Actions**: Hook into Porter's `order_end_job` webhook or Convex delivery transitions, executing:
  `POST /v1/transfers/{transfer_id}` with `on_hold: false`.
