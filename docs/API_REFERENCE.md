# Hive API Gateway - API Endpoint Reference

This document provides a catalog of all endpoints exposed by the Hive API Gateway.

---

## 1. Logistics Endpoints (Porter Integration)

### POST `/v1/logistics/quote`
Gets a localized delivery price estimate from Porter based on pickup and delivery coordinates.

* **Controller**: `porterController.js`
* **Service**: `services/porterService.js` (legacy) or `services/porter/quotes.js` (modular)
* **Authentication**: None (internal gateway authentication via IP whitelisting / internal network check)
* **Validation Schema**: Yes (validates presence of pickup lat/lng and delivery lat/lng)

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `pickup.lat` | Number | Yes | Latitude of boutique store |
| `pickup.lng` | Number | Yes | Longitude of boutique store |
| `delivery.lat` | Number | Yes | Latitude of customer address |
| `delivery.lng` | Number | Yes | Longitude of customer address |

#### Output Response (200 OK):
```json
{
  "quote_id": "qte_908124981",
  "amount_rupees": 45,
  "distance_km": 3.2,
  "expires_at": 179090124980
}
```

#### Possible Errors:
* `400 Bad Request`: Invalid coordinates, missing fields.
* `502 Bad Gateway`: Porter API unreachable or rejected the request.

---

### POST `/v1/logistics/order`
Creates a live logistics order on Porter and requests a rider.

* **Controller**: `porterController.js`
* **Service**: `services/porterService.js`
* **Authentication**: None

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `quote_id` | String | Yes | Valid quote token |
| `order_id` | String | Yes | Convex order document identifier |
| `recipient_name` | String | Yes | Name of customer |
| `recipient_phone` | String | Yes | Phone number of customer |

#### Output Response (201 Created):
```json
{
  "crn": "CRN-90812498",
  "status": "booking",
  "estimated_pickup_time": 179090126580
}
```

---

## 2. Onboarding Endpoints (Seller Module)

### POST `/api/seller/onboard-razorpay`
Triggers Razorpay Partner Account creation and generates hosted onboarding KYC links.

* **Controller**: `sellerController.js`
* **Service**: `services/marketplace/sellerService.js`
* **Authentication**: Clerk User JWT session token (validated via Next.js backend)
* **Validation Schema**: `seller.schema.js`

| Header Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `Authorization` | String | Yes | Bearer clerk JWT token |

#### Output Response (200 OK):
```json
{
  "redirectUrl": "https://easy.razorpay.com/onboarding/acc_908124"
}
```

#### Possible Errors:
* `401 Unauthorized`: Missing or expired Clerk user token.
* `404 Not Found`: Boutique profile does not exist in Convex database.
* `500 Internal Server Error`: Razorpay v2 account creation failed.

---

## 3. Platform Settings (Admin API)

### GET `/api/admin/platform-config`
Retrieves current system markups and fee configurations.

* **Controller**: Next.js App Router (direct query)
* **Authentication**: Clerk Admin JWT session token

#### Output Response (200 OK):
```json
{
  "markupRate": 15,
  "platformFeeRate": 2,
  "markupType": "tiered",
  "markupTiers": [
    { "min_price": 0, "max_price": 499, "rate": 18 },
    { "min_price": 500, "max_price": 999, "rate": 16 },
    { "min_price": 1000, "max_price": null, "rate": 12 }
  ]
}
```

---

### PUT `/api/admin/platform-config`
Updates system markups and fee configurations with strict validation.

* **Controller**: Next.js App Router (direct mutation)
* **Authentication**: Clerk Admin JWT session token

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `markupRate` | Number | Yes | Fallback markup percentage (0-100) |
| `platformFeeRate` | Number | Yes | Platform processing fee percentage (0-100) |
| `markupType` | String | Yes | `"flat"` or `"tiered"` |
| `markupTiers` | Array | Yes | Continuous slabs array starting at ₹0 |

#### Output Response (200 OK):
```json
{
  "success": true
}
```
