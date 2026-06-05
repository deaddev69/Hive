## **Hive by TailorBee** 

## **Product Requirements Document (PRD)** 

## **1. Executive Summary** 

Hive by TailorBee is a hyperlocal boutique fashion marketplace that enables customers to discover and purchase curated ready-to-wear fashion from local boutiques with scheduled delivery. The platform addresses the gap between fashion discovery and purchase by providing a structured digital marketplace for independent boutiques that typically rely on Instagram and physical footfall. 

Unlike traditional fashion marketplaces, Hive operates as an asset-light platform with no inventory ownership or warehousing. Boutiques maintain their own inventory while Hive manages discovery, ordering, payments, and logistics orchestration through third-party delivery partners. The initial launch focuses on validating customer demand, boutique participation, and operational viability within a limited geographic area before broader expansion. 

## **2. Product Overview** 

Hive is a multi-sided marketplace connecting customers, boutique partners, and logistics providers. Customers can browse boutique collections available within predefined delivery regions, review detailed product measurements, place orders, and track deliveries. Boutique partners can manage inventory, upload products, process orders, and monitor sales activity. 

The platform emphasizes purchase confidence through detailed measurement matrices, product media, and inventory accuracy. Delivery fulfillment is handled through integrated third-party logistics providers rather than an in-house fleet. Hive's business model is commission-based, generating revenue from successful marketplace transactions while remaining operationally lightweight and scalable. Hive operates on a region-based delivery model where deliveries are available only within approved service regions. Serviceability is determined by region membership rather than customer distance from a boutique. 

## **3. Business Goals** 

- Validate demand for hyperlocal boutique fashion commerce. 

- Increase average order value compared to traditional TailorBee services. 

- Create a scalable marketplace without inventory ownership or warehousing. 

- Provide boutiques with a digital sales channel and broader customer reach. 

- Achieve positive unit economics before geographic expansion. 

## **4. User Personas** 

## **Customers** 

Fashion-conscious consumers seeking unique boutique apparel with the convenience of online purchasing and delivery within supported service regions. They value product quality, fit confidence, convenience, and fast fulfillment. 

## **Boutique Partners** 

Independent fashion boutiques seeking additional sales channels, increased visibility, and access to customers beyond their physical location without investing in custom e-commerce infrastructure. 

## **Platform Administrators** 

Marketplace operators responsible for quality control, moderation, dispute resolution, analytics, and overall marketplace governance. 

## **Logistics Providers** 

Third-party delivery partners responsible for pickup, transportation, and delivery execution through API integrations. 

## **5. Role Matrix** 

|**Role**|**Primary Responsobilities**|
|---|---|
|Customer|Browse products, place orders, track deliveries, submit claims|
|Boutique Partner|Manage products, inventory, pricing, and order fulfillment|
|Admin|Moderate boutiques and products, manage claims, monitor<br>operations|
|Logistics Provider|Execute deliveries and provide shipment updates via APIs|



## **6. User Journeys** 

## **Customer Journey** 

Discover Products → View Product → Select Size → Add to Cart / Buy Now → Checkout → Choose Delivery Address & Slot → Order Confirmation → Delivery Tracking → Delivery→ Replacement / Claim (if required) 

## **Non-Serviceable Customer** 

Open Website → Location Request → Serviceability Check → Location Not Serviceable → Show Deliverable Regions Page → Exit or Change Location 

## **Boutique Journey** 

Register → Verification → Product Upload → Inventory Management → Order Confirmation → Package Preparation → Pickup Coordination 

## **Claim & Replacement Journey** 

Receive Order → Inspect Product → Upload Continuous Unboxing Video → Submit Claim Within 48 Hours → Admin Review 

If Approved: 

→ Replacement Available→ Replacement Order Created→ Replacement Delivered 

If Replacement Not Available: 

→ Refund Evaluation→ Refund Approval→ Refund Processed 

## **Admin Journey** 

Review Applications → Moderate Products → Monitor Orders → Resolve Claims → Analyze Marketplace Performance 

## **7. Functional Requirements** 

## **Customer Features** 

- Authentication and profile management 

- Mandatory location capture on first visit 

- Serviceability validation based on predefined delivery regions 

- Deliverable area discovery page 

- Region-based catalog visibility 

- Occasion-based product discovery 

- Occasion-based browsing and filtering 

- Product detail viewing with measurements 

- Cart and checkout management 

- Online payment processing 

- Shipment tracking 

- Return request submission 

- Replacement request submission 

- Damage claim submission 

- Claim evidence upload 

- Claim status tracking 

## **Boutique Features** 

- Boutique onboarding and verification 

- Product catalog management 

- Occasion assignment during product creation 

- Inventory management 

- Order processing 

- Replacement fulfillment management 

- Replacement inventory validation 

- Sales visibility 

## **Admin Features** 

- Boutique moderation 

- Product moderation 

- Claims management 

- Replacement approval workflow 

- Refund escalation workflow 

- Return verification management 

- Marketplace analytics 

- Operational monitoring 

## **Platform Features** 

- Logistics integration 

- Notification management 

- Payment processing 

- Real-time inventory synchronization 

## **7A Returns, Replacement and Refund Policy** 

- Claims must be submitted within 48 hours of delivery with a continuous unboxing video. 

- Products must be unused, with original tags and packaging intact. 

- Hive follows a Replacement-First Policy for all approved claims. 

- Refunds are issued only when replacement is unavailable or cannot be fulfilled. 

- Claims without valid evidence, late submissions, change-of-mind requests, or preference-based returns are not eligible for refund or replacement. 

## **8. Module Breakdown** 

## **Customer Portal** 

Handles discovery, purchasing, tracking, and customer account management. 

## **Boutique Portal** 

Provides inventory, catalog, and order management capabilities. 

## **Admin Portal** 

Supports moderation, reporting, dispute resolution, and operational oversight. 

## **Serviceability Module** 

Responsible for capturing customer location, mapping location to delivery regions, determining serviceability, restricting access to non-deliverable areas, displaying supported delivery regions. 

## **Product Catalog Module** 

Manages products, categories, occasion classifications, product media, and measurements. 

## **Order Management Module** 

Handles order creation, lifecycle management, and status tracking. 

## **Occasion Management Module** 

Responsible for maintaining predefined occasion list, occasion-product mapping, occasion browsing, occasion-based merchandising 

## **Logistics Module** 

Creates and tracks shipments through external logistics providers. 

## **Claims & Replacement Module** 

Manages damage claims and evidence review, replacement processing, refund escalation. 

## **Analytics Module** 

Tracks marketplace performance and operational metrics. 

## **9. Integrations** 

## **Razorpay** 

Online payment processing for UPI, cards, and digital payments. 

## **Logistics Providers** 

Third-party shipment creation, tracking, and delivery status updates. 

## **Cloudinary** 

Storage and delivery of product images, videos, and claim evidence. 

## **OpenStreetMap (OSM) + Nominatim** 

Address search, geocoding, reverse geocoding, customer location capture, and region mapping for serviceability validation. 

## **WhatsApp & Email Services** 

Transactional notifications and communication. 

## **10. Technical Architecture** 

The platform follows a modern serverless architecture using Next.js for the frontend and Convex for backend services and database operations. 

Core business services include: 

- Authentication 

- Product Management 

- Inventory Management 

- Orders 

- Payments 

- Logistics 

- Claims 

- Notifications 

The architecture is designed for low operational overhead, real-time synchronization, and scalability without dedicated infrastructure management. 

## **11. Database Overview** 

## **Core Entities** 

- Users 

- Boutiques 

- Products 

- Occasions 

- Inventory 

- Orders 

- Payments 

- Shipments 

- Claims 

- ClaimEvidence 

- ReturnRequests 

- ReplacementRequests 

- ReplacementOrders 

- Notification 

- Reviews 

- Analytics Events 

- Regions 

- DeliverableAreas 

These entities support marketplace operations, transaction processing, shipment tracking, and reporting. 

## **12. Non-Functional Requirements** 

## **Performance** 

- Product search response under 500ms 

- Core API responses under 500ms 

- Shipment updates reflected within 60 seconds 

## **Availability** 

- Minimum 99.5% platform uptime 

## **Security** 

- Role-based access control 

- Encrypted data transmission 

- Secure payment processing 

## **Scalability** 

- Support 50,000+ registered users 

- Support 100,000+ products 

## **Compliance** 

- Terms acceptance 

- Data privacy compliance 

- Audit logging and retention 

## **13. Acceptance Criteria** 

## **Customer Module** 

Customers can verify serviceability, browse occasion-based catalogs, purchase products, track deliveries, and submit claims. 

## **Boutique Module** 

Boutiques can manage products, inventory, and order fulfillment activities. 

## **Admin Module** 

Administrators can moderate marketplace content and resolve disputes. 

## **Product Catalog Module** 

Products can be assigned to one or more predefined occasions and are discoverable through occasion-based browsing. 

## **Serviceability Module** 

Customers outside supported delivery regions are prevented from ordering and are shown available delivery regions. 

## **Claims & Replacement Module** 

Claims must be submitted within 48 hours of delivery with a continuous unboxing video; approved claims are processed as replacements by default, with refunds issued only if replacement is unavailable, and claim status remains trackable throughout resolution. 

## **Logistics Module** 

Shipments are created, tracked, and updated successfully through external providers. 

## **Payment Module** 

Payments are securely processed and verified before order confirmation. 

## **14. KPIs** 

## **Marketplace KPIs** 

- Gross Merchandise Value (GMV) 

- Total Orders 

- Average Order Value (AOV) 

- Conversion Rate 

- Repeat Purchase Rate 

## **Operational KPIs** 

- Order Completion Rate 

- Cancellation Rate 

- Delivery Success Rate 

- Boutique Response SLA 

- Claim Resolution Time 

## **Growth KPIs** 

- Active Customers 

- Active Boutiques 

- Product Catalog Growth 

## **15. Risks** 

## **Inventory Accuracy** 

Boutiques may not update stock levels in real time, causing order failures. 

## **Sizing Mismatch** 

Customers may experience fit issues despite measurement guidance. 

## **Region Mapping Accuracy** 

Incorrect mapping of customer locations to delivery regions may result in valid customers being blocked or invalid customers being accepted. 

## **Logistics Dependency** 

Delivery performance depends on external logistics providers. 

## **Boutique Responsiveness** 

Delayed confirmations may impact customer experience. 

## **Claims Fraud** 

Customers may attempt fraudulent claims through manipulated or incomplete evidence. 

## **Replacement Inventory Risk** 

Replacement requests may exceed available boutique inventory. 

## **16. Assumptions** 

- Boutique partners maintain accurate inventory information. 

- Customers review measurement information before purchase. 

- Third-party logistics providers meet agreed service levels. 

- Online payments are the primary transaction method. 

- The marketplace operates without warehousing or inventory ownership. 

- Initial demand can be validated within a focused geographic market. 

- Customers retain original packaging and tags when raising claims. 

- Customers provide valid continuous unboxing video evidence for claim verification. 

- Boutique partners maintain sufficient inventory for approved replacements. 

- Replacement requests are fulfilled before refund evaluation whenever feasible. 

## **17. Future Scope** 

## **Customer Experience** 

- AI-powered size recommendations 

- Personalized product recommendations 

- Wishlist enhancements 

- Loyalty and rewards programs 

## **Boutique Enablement** 

- Advanced analytics 

- Boutique performance benchmarking 

- Marketing and promotional tools 

## **Platform Expansion** 

- Multi-city operations 

- Additional logistics providers 

- Premium memberships 

- Regional marketplace expansion 

## **Operational Intelligence** 

- Advanced delivery optimization 

- Automated marketplace insights 

- Enhanced fraud detection and risk management 

## **18 . MVP Scope Summary** 

The initial release focuses on validating marketplace demand through core capabilities: 

- Customer purchasing workflow 

- Boutique inventory and order management 

- Secure payment processing 

- Third-party logistics integration 

- Marketplace moderation 

- Claims and replacement management 

- Evidence verification workflows 

- Refund fallback processing 

- Operational analytics 

All future enhancements are intentionally deferred until marketplace demand, operational reliability, and unit economics are validated. 

