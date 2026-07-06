"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { 
  BookOpen, 
  Search, 
  Printer, 
  Download, 
  ChevronRight, 
  ArrowLeft, 
  Scale, 
  FileText,
  FileCheck,
  Building,
  HelpCircle,
  Clock
} from "lucide-react";

interface Section {
  id: string;
  num: string;
  title: string;
  content: string[];
}

const SECTIONS: Section[] = [
  {
    id: "acceptance",
    num: "1",
    title: "Acceptance of Terms",
    content: [
      `By accessing, browsing, registering on, or placing an order through the Hive by TailorBee platform, available at https://hive.tailorbee.in (the "Platform"), you ("User," "Customer," or "you") confirm that you have read, understood, and unconditionally agree to be bound by these Terms and Conditions ("Terms") and all policies incorporated herein by reference, including the Privacy Policy.`,
      `If you do not agree with any part of these Terms, you must immediately discontinue your use of the Platform.`,
      `These Terms constitute a legally binding agreement between you and BEELYN LLP, a limited liability partnership incorporated under the laws of India, having its registered office at 55/4379, Door No. 3623, Valanjambalam Junction, Kochi M.G. Road, Ernakulam Town South Police Station, Ernakulam, Kerala – 682016, India ("BEELYN LLP," "we," "us," or "our").`,
      `Hive by TailorBee is owned and operated by BEELYN LLP. These Terms apply exclusively to the Hive by TailorBee Platform and do not govern any other products, brands, or services operated by BEELYN LLP.`
    ]
  },
  {
    id: "definitions",
    num: "2",
    title: "Definitions",
    content: [
      `In these Terms, the following expressions carry the meanings set out below unless the context requires otherwise:`,
      `"Hive" or "Platform" means the Hive by TailorBee online marketplace accessible at https://hive.tailorbee.in, including its website, mobile applications, and related digital interfaces operated by BEELYN LLP.`,
      `"BEELYN LLP" means the limited liability partnership registered under LLPIN ACS-4901, being the legal entity that owns and operates the Platform.`,
      `"Customer" means any individual who accesses the Platform to browse, discover, or purchase products listed by Sellers.`,
      `"Seller" means an independent boutique, designer studio, artisan seller, fashion retailer, or other business entity that has been approved by Hive to list and sell products on the Platform.`,
      `"Product" means any item of fashion, apparel, accessory, or related merchandise listed for sale on the Platform by a Seller.`,
      `"Order" means a purchase request placed by a Customer for one or more Products listed on the Platform.`,
      `"Transaction" means the complete commercial event comprising Order placement, Seller acceptance, payment processing, fulfillment, and post-purchase administration.`,
      `"Marketplace Settlement" means the process by which BEELYN LLP disburses collected payments to Sellers following expiry of the applicable return period and subject to any eligible refund or dispute adjustments.`,
      `"Return Period" means the window within which a Customer may initiate an eligible return request, as set out in these Terms.`,
      `"Grievance Officer" means the designated person responsible for receiving and addressing grievances raised by Users in accordance with applicable Indian law.`,
      `"Applicable Law" means all central and state statutes, rules, regulations, guidelines, circulars, and notifications applicable to the Platform, Customers, and Sellers in India, including without limitation the Consumer Protection Act, 2019, the Consumer Protection (E-Commerce) Rules, 2020, the Information Technology Act, 2000, and the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021.`
    ]
  },
  {
    id: "eligibility",
    num: "3",
    title: "Eligibility",
    content: [
      `3.1 The Platform is intended for use by individuals who are at least eighteen (18) years of age. By creating an account or placing an Order, you represent and warrant that you are at least eighteen (18) years old and have the legal capacity to enter into a binding agreement.`,
      `3.2 Individuals below the age of eighteen (18) years may only access or use the Platform under the active supervision and with the prior consent of a parent or legal guardian. The parent or legal guardian assumes full responsibility for all activities conducted on behalf of the minor.`,
      `3.3 BEELYN LLP reserves the right to suspend, restrict, or terminate any account where it reasonably believes the eligibility requirements set out in this clause have not been met.`,
      `3.4 By using the Platform, you further represent and warrant that you are not barred or otherwise legally prohibited from accessing or using the Platform under any Applicable Law.`
    ]
  },
  {
    id: "nature-of-marketplace",
    num: "4",
    title: "Marketplace Nature of Hive",
    content: [
      `4.1 Facilitated Marketplace. Hive by TailorBee is a technology-enabled marketplace platform that connects Customers with independent Sellers offering fashion products. BEELYN LLP facilitates product discovery, order placement, payment processing, transaction administration, and post-purchase support processes.`,
      `4.2 Not the Seller. BEELYN LLP is generally not the manufacturer, owner, merchant, or seller of any Product listed on the Platform. Unless expressly stated otherwise in a specific listing, all Products are offered for sale by independent Sellers.`,
      `4.3 No Endorsement. The listing of a Product on the Platform does not constitute an endorsement, representation, or warranty by BEELYN LLP regarding the quality, safety, legality, authenticity, or accuracy of that Product or its associated information.`,
      `4.4 Seller Independence. Sellers are independent businesses. BEELYN LLP does not control, supervise, or independently verify every representation made by Sellers regarding their Products. Sellers retain sole responsibility for product quality, product compliance, the accuracy of their listings, inventory management, and fulfilment obligations.`,
      `4.5 Regulatory Approach. Hive endeavours to operate in accordance with applicable e-commerce regulations, including the Consumer Protection (E-Commerce) Rules, 2020, in its capacity as a marketplace platform.`
    ]
  },
  {
    id: "user-accounts",
    num: "5",
    title: "User Accounts",
    content: [
      `5.1 Account Requirement. Guest checkout is not available on the Platform. Customers must create a registered account to place Orders. By creating an account, you agree to provide accurate, current, and complete information and to promptly update such information as and when it changes.`,
      `5.2 Account Confidentiality. You are solely responsible for maintaining the confidentiality of your account credentials, including your username and password. You must not share your account access with any third party.`,
      `5.3 Account Responsibility. You are fully responsible for all activities, Orders, and transactions conducted through your account, whether or not authorised by you. If you become aware of any unauthorised access to or use of your account, you must notify Hive immediately at support@hivenow.in.`,
      `5.4 Identity Verification. BEELYN LLP reserves the right to verify a User's identity and account information where reasonably necessary for the purposes of fraud prevention, regulatory compliance, or Platform security.`,
      `5.5 One Account Per User. Each User may maintain only one active Customer account. BEELYN LLP reserves the right to merge or terminate duplicate accounts.`,
      `5.6 Account Suspension. BEELYN LLP may suspend or permanently disable any account that it reasonably determines to have been created using false information, to be in violation of these Terms, or to have been used for abusive, fraudulent, or unlawful purposes.`
    ]
  },
  {
    id: "user-obligations",
    num: "6",
    title: "User Obligations",
    content: [
      `6.1 By using the Platform, you agree to:`,
      `(a) provide truthful, accurate, and complete information at all times;`,
      `(b) review product descriptions, material information, size charts, and care instructions carefully before placing an Order;`,
      `(c) verify delivery details, including address and contact information, before confirming an Order;`,
      `(d) cooperate fully and in good faith during any return, refund, or dispute resolution process;`,
      `(e) use the Platform solely for lawful personal or business purposes;`,
      `(f) refrain from misusing Platform features, including returns, reviews, and promotions;`,
      `(g) comply with all Applicable Laws.`,
      `6.2 You agree not to engage in any conduct that disrupts, undermines, or interferes with the Platform's operation, integrity, or the experience of other Users.`
    ]
  },
  {
    id: "seller-responsibilities",
    num: "7",
    title: "Seller Responsibilities",
    content: [
      `7.1 Sellers approved to participate on the Platform are solely and exclusively responsible for:`,
      `(a) the accuracy, completeness, and truthfulness of product descriptions, titles, images, and specifications;`,
      `(b) disclosures regarding product materials, fabrics, components, and composition;`,
      `(c) provision of accurate size information and size charts;`,
      `(d) inclusion of care and maintenance instructions;`,
      `(e) accuracy of pricing information;`,
      `(f) maintenance of real-time or regularly updated stock availability;`,
      `(g) timely fulfilment of accepted Orders;`,
      `(h) compliance with all Applicable Laws, including consumer protection, product safety, labelling, and intellectual property legislation.`,
      `7.2 BEELYN LLP reserves the right to remove, modify, or restrict the visibility of any product listing that it reasonably determines to be inaccurate, misleading, non-compliant, or inconsistent with Platform standards.`,
      `7.3 Counterfeit and Prohibited Products. Sellers are strictly prohibited from listing, offering, or selling counterfeit, infringing, unlawful, unsafe, hazardous, prohibited, or misleading products on the Platform. In the event of such a violation, BEELYN LLP reserves the right to:`,
      `(a) immediately remove the offending listing;`,
      `(b) suspend the Seller's participation on the Platform;`,
      `(c) permanently terminate the Seller's account;`,
      `(d) withhold any pending settlements;`,
      `(e) cooperate fully with law enforcement authorities, regulatory bodies, or intellectual property rights holders.`,
      `7.4 Seller participation on the Platform is subject to BEELYN LLP's approval and the execution of a separate Seller Agreement. In the event of any conflict between a Seller Agreement and these Terms as they apply to Customers, the rights of Customers shall be interpreted in accordance with Applicable Law.`,
      `7.5 Seller Data Protection. Sellers shall use Customer information — including contact details, delivery addresses, and Order data — solely for the purposes of order fulfilment, customer support, and discharging obligations arising from the relevant Transaction. Sellers shall not use Customer information for unsolicited marketing, profiling, resale, or any other unrelated commercial purpose. Any use of Customer data by a Seller inconsistent with this clause shall constitute a material breach of Seller participation terms and may result in immediate suspension or termination of the Seller's account.`
    ]
  },
  {
    id: "product-listings",
    num: "8",
    title: "Product Listings and Availability",
    content: [
      `8.1 Products displayed on the Platform are subject to availability. The display of a Product does not constitute a guarantee of its availability at the time an Order is placed.`,
      `8.2 Product images are provided for illustrative purposes. Actual colours, textures, and appearances may vary slightly due to photographic conditions, display settings, and natural product characteristics.`,
      `8.3 BEELYN LLP does not independently verify every product listing submitted by Sellers and relies on Sellers to maintain accurate and up-to-date information. Where BEELYN LLP becomes aware of inaccuracies, it may take corrective action in accordance with Clause 7.2.`,
      `8.4 Hive reserves the right to withdraw, suspend, or remove any product listing at any time at its sole discretion, including for reasons of quality standards, legal compliance, or operational requirements.`
    ]
  },
  {
    id: "pricing",
    num: "9",
    title: "Pricing",
    content: [
      `9.1 All prices displayed on the Platform are in Indian Rupees (INR) and are inclusive of applicable taxes unless expressly stated otherwise.`,
      `9.2 Prices are set by individual Sellers and may be subject to change without prior notice. The price applicable to an Order shall be the price displayed at the time the Order is confirmed.`,
      `9.3 BEELYN LLP does not warrant that prices displayed on the Platform are accurate, complete, or error-free. In the event of a manifest pricing error, BEELYN LLP reserves the right to cancel the affected Order and issue a full refund to the Customer.`,
      `9.4 Shipping charges, if applicable, will be disclosed to the Customer prior to Order confirmation.`,
      `9.5 Promotional pricing, discount codes, and offers are subject to their respective terms and conditions and may be withdrawn or modified at any time.`
    ]
  },
  {
    id: "order-placement",
    num: "10",
    title: "Order Placement and Seller Acceptance",
    content: [
      `10.1 Placing an Order. An Order placed by a Customer on the Platform constitutes an offer to purchase the selected Product at the stated price and on the terms set out in the listing. An Order does not, by itself, constitute a binding contract of sale.`,
      `10.2 Seller Acceptance Window. Following Order placement, the relevant Seller has fifteen (15) minutes to accept or reject the Order. This mechanism exists to address inventory availability, stock discrepancies, and operational constraints at the Seller's end.`,
      `10.3 Automatic Cancellation. If the Seller does not accept or reject the Order within the fifteen (15) minute window, Hive may automatically cancel the Order. In such cases, Hive shall promptly notify the Customer of the cancellation and its reason, and any payment collected shall generally be refunded within five (5) business days.`,
      `10.4 Order Confirmation. A binding contract of sale between the Customer and the Seller is formed upon the Seller's acceptance of the Order. BEELYN LLP will issue an Order confirmation to the Customer upon acceptance.`,
      `10.5 Post-Acceptance Cancellation by Seller. Once an Order has been accepted, the Seller may not unilaterally cancel it except where such cancellation is required by law or is expressly permitted by Hive in accordance with these Terms or the applicable Seller Agreement. BEELYN LLP may intervene in cases involving fraud, force majeure, regulatory requirements, or other exceptional circumstances.`,
      `10.6 Seller Rejection. A Seller may reject an Order within the acceptance window, in which case BEELYN LLP shall notify the Customer and, where applicable, initiate a refund within five (5) business days.`
    ]
  },
  {
    id: "payments",
    num: "11",
    title: "Payments",
    content: [
      `11.1 Payment Facilitation. Payments on the Platform are facilitated through Razorpay, a third-party payment gateway. By making a payment on the Platform, you agree to comply with Razorpay's terms of service and privacy policy, in addition to these Terms.`,
      `11.2 Supported Payment Methods. Hive currently supports the following payment methods, subject to availability:`,
      `(a) Unified Payments Interface (UPI);`,
      `(b) Debit Cards;`,
      `(c) Credit Cards;`,
      `(d) Net Banking.`,
      `Hive reserves the right to add, modify, or remove supported payment methods at any time without prior notice.`,
      `11.3 Payment at Checkout. Payment for an Order is collected at the time of Order placement. By initiating payment, you authorise BEELYN LLP and Razorpay to process the transaction in accordance with these Terms.`,
      `11.4 Payment Failures. An Order may be cancelled if payment fails, is reversed, is declined, or is suspected of fraud. In such cases, no binding contract of sale will be formed. Where a payment amount has been debited from your account but the Order has not been confirmed, BEELYN LLP will endeavour to ensure the amount is returned to your source account within a reasonable period.`,
      `11.5 Refund to Source. Refunds, where applicable, will generally be issued to the original payment source used at the time of the Transaction.`,
      `11.6 Currency. All transactions on the Platform are conducted in Indian Rupees (INR).`
    ]
  },
  {
    id: "settlement-model",
    num: "12",
    title: "Marketplace Settlement Model",
    content: [
      `12.1 Collection of Payments. BEELYN LLP collects payments from Customers on behalf of Sellers through the Platform as part of its marketplace facilitation function.`,
      `12.2 Temporary Retention. Following successful Order fulfilment, BEELYN LLP may temporarily retain the payment collected during the applicable Return Period to allow for the resolution of any eligible return or refund requests.`,
      `12.3 Seller Settlement. Seller settlements are generally initiated after the expiry of the applicable Return Period, subject to the absence of any pending return, refund, or dispute in relation to the relevant Transaction.`,
      `12.4 Settlement Adjustments. Where an eligible return or refund claim is upheld in respect of a Transaction, the corresponding Seller settlement may be withheld, adjusted, reduced, or cancelled to the extent necessary to fund the Customer refund or to account for Seller-attributable failures.`,
      `12.5 Consumer Rights Unaffected. This settlement framework relates solely to the administration of the marketplace and internal financial operations between BEELYN LLP and Sellers. It does not in any way affect, restrict, or override the statutory consumer rights available to Customers under the Consumer Protection Act, 2019 or any other Applicable Law.`
    ]
  },
  {
    id: "shipping-delivery",
    num: "13",
    title: "Shipping and Delivery",
    content: [
      `13.1 Delivery Timelines. Delivery timelines communicated on the Platform are estimates only. BEELYN LLP does not guarantee delivery within any stated timeline.`,
      `13.2 Liability for Delays. BEELYN LLP shall not be liable for delays in delivery caused by or attributable to:`,
      `(a) the Seller, including delays in dispatch or fulfilment;`,
      `(b) third-party logistics or courier partners;`,
      `(c) natural disasters, floods, or severe weather events;`,
      `(d) government orders, restrictions, curfews, or regulatory interventions;`,
      `(e) strikes, lockouts, or labour disruptions;`,
      `(f) force majeure events as described in Clause 23;`,
      `(g) any other circumstances beyond BEELYN LLP's reasonable control.`,
      `13.3 Delivery Address. Customers are responsible for providing an accurate and complete delivery address. BEELYN LLP and Sellers shall not be responsible for non-delivery or misdelivery resulting from inaccurate or incomplete address information provided by the Customer.`,
      `13.4 Delivery Partners. BEELYN LLP may engage third-party logistics providers for the fulfilment of deliveries. The performance of such logistics partners is independent of BEELYN LLP, and BEELYN LLP shall not be liable for acts, omissions, or failures of third-party logistics providers, except to the extent required by Applicable Law.`,
      `13.5 Failed Deliveries. In the event of a failed delivery attempt, logistics partners may attempt re-delivery or require the Customer to collect the shipment from a designated facility. BEELYN LLP may, at its discretion, facilitate resolution of failed delivery situations in coordination with Sellers and logistics partners.`
    ]
  },
  {
    id: "returns-refunds-cancellations",
    num: "14",
    title: "Returns, Refunds and Cancellations",
    content: [
      `14.1 Return Window. Customers wishing to initiate a return must generally do so within three (3) days from the date of delivery of the Product.`,
      `14.2 No Change-of-Mind Returns. Returns will not be accepted for any of the following reasons:`,
      `(a) change of mind after purchase;`,
      `(b) change in personal preference;`,
      `(c) no longer wanting or needing the product.`,
      `14.3 Eligible Returns. Subject to these Terms, return requests may be accepted only in the following circumstances:`,
      `(a) the Product delivered is physically damaged;`,
      `(b) a Product different from the one ordered has been delivered;`,
      `(c) the Product is materially defective and the defect is not attributable to customer use or mishandling;`,
      `(d) a size discrepancy exists as described in Clause 14.4 below.`,
      `14.4 Size-Related Returns. A return on the basis of size may be accepted in the following circumstances:`,
      `(a) the Seller delivers a size that is different from the size expressly ordered by the Customer; or`,
      `(b) the actual garment measurements of the delivered Product substantially differ from the measurements represented in the product description or size chart.`,
      `In assessing size-related return claims, BEELYN LLP may act reasonably and in good faith, taking into consideration the nature and category of the product, any manufacturing tolerances disclosed or customary in the relevant product category, and the accuracy of the information presented in the listing at the time of purchase. Where a Customer has ordered an incorrect size despite the Seller having provided accurate size information in the listing, BEELYN LLP may decline the return request.`,
      `14.5 Unboxing Evidence Requirement. For claims involving damaged products, defective products, missing items, or wrong products delivered, BEELYN LLP may request that the Customer provide supporting evidence, including a continuous, uninterrupted unboxing video recorded from the moment the outer packaging is opened. The requirement to submit evidence is intended to prevent fraudulent claims, protect Sellers from unwarranted returns, and facilitate prompt resolution of legitimate claims. Failure to provide reasonable supporting evidence when requested may result in BEELYN LLP declining the return claim. This provision shall not be interpreted to exclude or override any statutory rights available to Customers under Applicable Law.`,
      `14.6 Return Shipping. Where a return claim is accepted as eligible, BEELYN LLP may arrange and bear the cost of return logistics. Return shipping arrangements shall be communicated to the Customer at the time of return approval.`,
      `14.7 Refund Processing. Where a return is approved, refunds will generally be issued to the original payment source. BEELYN LLP will endeavour to process approved refunds within a reasonable period following receipt and verification of the returned Product.`,
      `14.8 Seller Accountability for Returns. Where BEELYN LLP identifies a pattern of returns attributable to Seller-side errors, including but not limited to repeated dispatch of incorrect products, repeated dispatch of damaged products, or persistent description inaccuracies, BEELYN LLP reserves the right to take escalating corrective action against the Seller, including:`,
      `(a) formal warnings;`,
      `(b) seller counselling and remediation;`,
      `(c) imposition of monetary penalties, fines, or additional charges;`,
      `(d) reduction in listing visibility;`,
      `(e) temporary suspension of Seller participation;`,
      `(f) permanent termination of Seller participation.`,
      `BEELYN LLP shall determine the appropriate corrective action at its reasonable discretion, taking into account the nature, frequency, and impact of the violations.`,
      `14.9 Customer-Initiated Order Cancellations. Customers may request cancellation of an Order prior to Seller acceptance within the acceptance window. Once an Order has been accepted by the Seller, cancellation by the Customer may not be possible except in accordance with these Terms or as required by Applicable Law. Any amounts paid in respect of a successfully cancelled Order will generally be refunded within five (5) business days.`
    ]
  },
  {
    id: "reviews-content",
    num: "15",
    title: "Reviews and User Content",
    content: [
      `15.1 Submission of Reviews. Customers may submit ratings, reviews, and feedback regarding Products and Sellers through the Platform. By submitting a review, you represent that it reflects your honest and genuine experience with the Product or Seller.`,
      `15.2 Licence to BEELYN LLP. By submitting content, including reviews, ratings, comments, or images, to the Platform, you grant BEELYN LLP a non-exclusive, royalty-free, worldwide, irrevocable licence to use, reproduce, display, distribute, and adapt such content for the purposes of operating and improving the Platform.`,
      `15.3 Ownership. You retain ownership of any content lawfully submitted by you to the Platform, subject to the licence granted in Clause 15.2.`,
      `15.4 Review Moderation. BEELYN LLP reserves the right to remove, edit, or decline to publish any review or user-submitted content that it reasonably determines to be:`,
      `(a) false, fabricated, or fraudulent;`,
      `(b) offensive, abusive, hateful, threatening, or defamatory;`,
      `(c) spam or submitted as part of a coordinated manipulation campaign;`,
      `(d) irrelevant to the Product or Seller;`,
      `(e) misleading or designed to deceive other Customers;`,
      `(f) in violation of any Applicable Law or the rights of third parties.`,
      `15.5 No Liability for User Content. BEELYN LLP does not verify or endorse reviews or user-submitted content and shall not be liable for any losses or damages arising from reliance on such content.`
    ]
  },
  {
    id: "intellectual-property",
    num: "16",
    title: "Intellectual Property",
    content: [
      `16.1 Platform Ownership. All intellectual property rights in and relating to the Platform, including but not limited to logos, branding, trademarks, service marks, trade dress, software, source code, design elements, graphics, user interface components, compiled data, and Platform content, are the exclusive property of BEELYN LLP or its licensors.`,
      `16.2 Restricted Use. Users may not reproduce, distribute, modify, reverse engineer, decompile, disassemble, publicly display, commercially exploit, create derivative works from, or otherwise use any part of the Platform or its intellectual property without the prior written authorisation of BEELYN LLP.`,
      `16.3 Limited Licence to Users. BEELYN LLP grants you a limited, non-exclusive, non-transferable, revocable licence to access and use the Platform solely for personal, non-commercial purposes in accordance with these Terms.`,
      `16.4 Seller Content. Sellers represent and warrant that they hold all necessary rights, licences, and permissions in respect of product images, descriptions, and other content submitted to the Platform, and that such content does not infringe the intellectual property rights of any third party.`,
      `16.5 Feedback. Any suggestions, ideas, or feedback voluntarily provided by Users regarding the Platform may be used by BEELYN LLP without restriction or compensation.`
    ]
  },
  {
    id: "prohibited-conduct",
    num: "17",
    title: "Prohibited Conduct",
    content: [
      `Users of the Platform, including Customers and Sellers, are prohibited from engaging in any of the following conduct:`,
      `(a) submitting fraudulent Orders, returns, or refund requests;`,
      `(b) submitting false, fabricated, or incentivised reviews;`,
      `(c) abusing payment processes, including initiating unjustified chargebacks;`,
      `(d) sharing, selling, or transferring account access to any third party;`,
      `(e) scraping, crawling, or harvesting data from the Platform using automated means;`,
      `(f) attempting to gain unauthorised access to any part of the Platform, its servers, or its databases;`,
      `(g) interfering with, disrupting, or compromising the security or integrity of the Platform;`,
      `(h) infringing the intellectual property rights of BEELYN LLP, Sellers, or any third party;`,
      `(i) uploading or transmitting malicious code, viruses, or harmful content;`,
      `(j) impersonating any person or entity or misrepresenting affiliation with any person or entity;`,
      `(k) engaging in any activity that is unlawful, deceptive, or contrary to public policy under Applicable Law.`,
      `BEELYN LLP reserves the right to investigate suspected violations and to take appropriate action, including account suspension, legal proceedings, or referral to competent authorities.`
    ]
  },
  {
    id: "suspension-termination",
    num: "18",
    title: "Suspension and Termination",
    content: [
      `18.1 By BEELYN LLP. BEELYN LLP may suspend, restrict, or permanently terminate a User's access to the Platform at any time and without prior notice where it determines, at its reasonable discretion, that:`,
      `(a) the User has violated these Terms or any incorporated policy;`,
      `(b) the User has engaged in fraudulent, abusive, or unlawful conduct;`,
      `(c) continued access poses a risk to the Platform, other Users, or third parties;`,
      `(d) a regulatory or legal obligation requires such action.`,
      `18.2 By the User. You may close or delete your account at any time through the available account settings on the Platform or by contacting BEELYN LLP at support@hivenow.in. Account closure does not affect any outstanding Orders, obligations, or liabilities that arose prior to closure.`,
      `18.3 Effect of Termination. Upon termination, your right to access the Platform ceases immediately. BEELYN LLP may retain certain account information and transaction records to the extent required by Applicable Law or for legitimate operational purposes.`,
      `18.4 Survival. Clauses relating to intellectual property, limitation of liability, indemnity, governing law, and any other provisions that by their nature should survive termination shall continue to apply following termination of your account or these Terms.`
    ]
  },
  {
    id: "grievance-redressal",
    num: "19",
    title: "Grievance Redressal",
    content: [
      `19.1 Grievance Mechanism. BEELYN LLP has established a grievance redressal mechanism for the Platform in accordance with applicable Indian law, including the Consumer Protection Act, 2019 and the Consumer Protection (E-Commerce) Rules, 2020.`,
      `19.2 Submitting a Grievance. Customers and Users may submit grievances relating to the Platform, Orders, or Seller conduct by writing to:`,
      `Grievance Officer — Hive by TailorBee`,
      `BEELYN LLP 55/4379, Door No. 3623, Valanjambalam Junction, Kochi M.G. Road, Ernakulam Town South Police Station, Ernakulam, Kerala – 682016, India. Email: support@hivenow.in`,
      `19.3 Acknowledgement. BEELYN LLP endeavours to acknowledge grievances within forty-eight (48) hours of receipt.`,
      `19.4 Resolution Timeline. BEELYN LLP endeavours to resolve valid grievances within one (1) month of receipt, subject to the nature and complexity of the grievance.`,
      `19.5 Escalation. Nothing in these Terms prevents a User from approaching any competent regulatory authority, consumer forum, or court of law as permitted under Applicable Law.`
    ]
  },
  {
    id: "disclaimer-warranties",
    num: "20",
    title: "Disclaimer of Warranties",
    content: [
      `20.1 The Platform and all Products, content, and services available through it are provided on an "as is" and "as available" basis without any warranties of any kind, express or implied.`,
      `20.2 To the fullest extent permitted by Applicable Law, BEELYN LLP disclaims all warranties including:`,
      `(a) implied warranties of merchantability, fitness for a particular purpose, and non-infringement;`,
      `(b) warranties regarding the accuracy, completeness, or reliability of any product listing, description, pricing, or availability information provided by Sellers;`,
      `(c) warranties regarding uninterrupted, timely, error-free, or secure access to or operation of the Platform;`,
      `(d) warranties regarding the performance of third-party services, including payment gateways, logistics partners, and cloud infrastructure providers.`,
      `20.3 As a marketplace facilitator, BEELYN LLP does not manufacture, own, or inspect Products. Product quality, authenticity, and fitness are the sole responsibility of Sellers.`,
      `20.4 Nothing in this Clause or in these Terms shall be construed as excluding, restricting, or limiting any rights that cannot be excluded under the Consumer Protection Act, 2019 or any other Applicable Law.`
    ]
  },
  {
    id: "limitation-liability",
    num: "21",
    title: "Limitation of Liability",
    content: [
      `21.1 To the maximum extent permitted by Applicable Law, BEELYN LLP, its affiliates, officers, employees, agents, and authorised representatives shall not be liable for any indirect, incidental, consequential, special, punitive, exemplary, or loss-of-profit damages arising out of or in connection with:`,
      `(a) your use of or inability to use the Platform;`,
      `(b) any Product purchased from a Seller through the Platform;`,
      `(c) delays, failures, or errors in delivery or fulfilment;`,
      `(d) unauthorised access to or alteration of your account data;`,
      `(e) the acts, omissions, representations, or failures of Sellers;`,
      `(f) the failure or unavailability of third-party services relied upon by the Platform.`,
      `21.2 Cap on Liability. Where BEELYN LLP's liability cannot be excluded by law, its aggregate liability to any Customer in respect of any claim arising out of a single Transaction shall generally be limited to the amount actually paid by the Customer for that Transaction.`,
      `21.3 Nothing in this Clause shall limit or exclude liability for personal injury or death caused by BEELYN LLP's negligence, for fraud, or for any liability that cannot be excluded or limited under Applicable Law, including rights available to Customers under the Consumer Protection Act, 2019.`
    ]
  },
  {
    id: "indemnity",
    num: "22",
    title: "Indemnity",
    content: [
      `22.1 You agree to indemnify, defend, and hold harmless BEELYN LLP and its affiliates, officers, employees, agents, and authorised representatives from and against all claims, actions, proceedings, losses, damages, liabilities, costs, and expenses (including reasonable legal costs) arising from or relating to:`,
      `(a) your breach of any provision of these Terms;`,
      `(b) your misuse of the Platform or any feature thereof;`,
      `(c) your violation of any Applicable Law or regulation;`,
      `(d) your infringement of any intellectual property, privacy, or other rights of any third party;`,
      `(e) any content, information, or material submitted by you to the Platform.`,
      `22.2 This indemnity obligation shall not be construed to limit, waive, override, or otherwise affect any statutory rights available to Customers under the Consumer Protection Act, 2019 or any other Applicable Law protecting consumer interests.`
    ]
  },
  {
    id: "force-majeure",
    num: "23",
    title: "Force Majeure",
    content: [
      `23.1 BEELYN LLP shall not be liable for any failure or delay in performing its obligations under these Terms to the extent that such failure or delay is caused by circumstances beyond its reasonable control, including but not limited to:`,
      `(a) acts of God, floods, earthquakes, storms, or other natural disasters;`,
      `(b) epidemics, pandemics, or public health emergencies;`,
      `(c) war, hostilities, terrorism, civil unrest, or riots;`,
      `(d) governmental orders, sanctions, lockdowns, or regulatory restrictions;`,
      `(e) strikes, industrial action, or labour disputes (other than those involving BEELYN LLP's own workforce);`,
      `(f) failures or disruptions to third-party infrastructure, including internet service providers, cloud platforms, or payment systems;`,
      `(g) power outages or telecommunications failures.`,
      `23.2 BEELYN LLP shall notify affected Users as soon as reasonably practicable in the event of a force majeure event materially affecting the Platform's operations.`,
      `23.3 Where a force majeure event persists for a substantial period, BEELYN LLP may take such steps as are reasonably necessary to mitigate the impact on Customers, including facilitating refunds where appropriate.`
    ]
  },
  {
    id: "third-party-services",
    num: "24",
    title: "Third-Party Services",
    content: [
      `24.1 The Platform relies upon and integrates with third-party service providers, including payment gateways, cloud hosting platforms, analytics providers, logistics partners, and communication tools ("Third-Party Services").`,
      `24.2 BEELYN LLP does not own, operate, or control Third-Party Services and makes no representations regarding their availability, performance, accuracy, or security.`,
      `24.3 Your use of Third-Party Services through the Platform may be subject to the terms and privacy policies of those third parties. BEELYN LLP encourages you to review those terms.`,
      `24.4 The Platform may contain links to third-party websites or services. Such links are provided for convenience only and do not constitute an endorsement by BEELYN LLP. BEELYN LLP is not responsible for the content, practices, or policies of third-party websites.`,
      `24.5 BEELYN LLP shall not be liable for any loss or damage arising from your reliance on or interaction with Third-Party Services, except to the extent required by Applicable Law.`
    ]
  },
  {
    id: "platform-availability",
    num: "25",
    title: "Platform Availability and Beta Features",
    content: [
      `25.1 Platform Availability. Hive makes no guarantee of uninterrupted or error-free availability of the Platform. The Platform may be subject to scheduled or unscheduled maintenance, technical outages, or temporary unavailability.`,
      `25.2 Feature Evolution. BEELYN LLP may introduce, modify, suspend, discontinue, pilot, or test Platform features and functionalities at any time without prior notice as part of the Platform's ongoing development.`,
      `25.3 Beta Features. Certain features may be made available to Users on a beta, pilot, or limited-release basis. Beta features may be experimental, subject to change, and may not perform as expected. Additional terms may apply to specific beta features.`,
      `25.4 Operational Changes. BEELYN LLP may revise policies, logistics arrangements, promotional programmes, Seller tools, and operational procedures from time to time. Such revisions are made in the ordinary course of business and may not require formal amendment of these Terms.`
    ]
  },
  {
    id: "governing-law",
    num: "26",
    title: "Governing Law and Jurisdiction",
    content: [
      `26.1 These Terms and any dispute or claim arising out of or in connection with them, including disputes relating to their existence, validity, formation, or termination, shall be governed by and construed in accordance with the laws of India.`,
      `26.2 Hive endeavours to operate in accordance with applicable e-commerce regulations, including the Consumer Protection Act, 2019 and the Consumer Protection (E-Commerce) Rules, 2020 applicable to marketplace platforms.`,
      `26.3 Subject to Clause 26.4, the courts at Ernakulam, Kerala shall have exclusive jurisdiction to settle any disputes arising out of or in connection with these Terms.`,
      `26.4 Nothing in these Terms shall limit or restrict the rights of Customers to approach any competent consumer forum, redressal commission, or authority available under the Consumer Protection Act, 2019 or any other Applicable Law.`
    ]
  },
  {
    id: "severability",
    num: "27",
    title: "Severability",
    content: [
      `If any provision of these Terms is found by a court or competent authority to be invalid, unlawful, void, or unenforceable, that provision shall be deemed severed from the remaining Terms, which shall continue in full force and effect. The severed provision shall be modified to the minimum extent necessary to make it enforceable, or, if modification is not possible, it shall be treated as deleted.`
    ]
  },
  {
    id: "no-waiver",
    num: "28",
    title: "No Waiver",
    content: [
      `BEELYN LLP's failure or delay in exercising any right, power, or remedy under these Terms shall not constitute a waiver of that right, power, or remedy. A single or partial exercise of any right or remedy shall not preclude any other or further exercise thereof.`
    ]
  },
  {
    id: "entire-agreement",
    num: "29",
    title: "Entire Agreement",
    content: [
      `29.1 These Terms, together with the Privacy Policy and any other policies expressly incorporated herein, constitute the entire agreement between you and BEELYN LLP with respect to your use of the Platform and supersede all prior agreements, representations, understandings, and negotiations, whether written or oral, relating to the same subject matter.`,
      `29.2 In the event of any conflict between these Terms and any other communication, advertisement, or representation made by BEELYN LLP, these Terms shall prevail to the extent of any inconsistency.`
    ]
  },
  {
    id: "changes-to-terms",
    num: "30",
    title: "Changes to Terms",
    content: [
      `30.1 BEELYN LLP reserves the right to revise, amend, or update these Terms at any time. Where changes are material, BEELYN LLP will endeavour to provide reasonable notice to registered Users through the Platform, by email, or by such other means as BEELYN LLP considers appropriate.`,
      `30.2 The revised Terms will be published on the Platform with an updated "Last Updated" date. Your continued use of the Platform following the publication of revised Terms constitutes your acceptance of those changes.`,
      `30.3 If you do not agree to any revised Terms, you must discontinue your use of the Platform and may close your account in accordance with Clause 18.2.`
    ]
  },
  {
    id: "contact-information",
    num: "31",
    title: "Contact Information",
    content: [
      `For all queries, complaints, grievances, and support requests relating to Hive by TailorBee, please contact:`,
      `Hive by TailorBee — Customer Support`,
      `BEELYN LLP 55/4379, Door No. 3623, Valanjambalam Junction, Kochi M.G. Road, Ernakulam Town South Police Station, Ernakulam, Kerala – 682016, India`,
      `Website: https://hive.tailorbee.in`,
      `Email: support@hivenow.in`
    ]
  },
  {
    id: "privacy-policy",
    num: "32",
    title: "Privacy Policy Linkage",
    content: [
      `Your use of the Platform is also governed by Hive's Privacy Policy, which is available at https://hive.tailorbee.in/privacy-policy. The Privacy Policy forms an integral part of the legal framework governing the Platform and should be read in conjunction with these Terms. By using the Platform, you also accept the terms of the Privacy Policy.`,
      `These Terms and Conditions are published by BEELYN LLP (LLPIN: ACS-4901) for and on behalf of Hive by TailorBee.`
    ]
  }
];

export default function TermsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState("acceptance");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const contentRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Search filter
  const filteredSections = SECTIONS.filter(section => {
    const query = searchQuery.toLowerCase();
    const titleMatch = section.title.toLowerCase().includes(query);
    const contentMatch = section.content.some(paragraph => 
      paragraph.toLowerCase().includes(query)
    );
    return titleMatch || contentMatch;
  });

  // Handle smooth scroll to section
  const scrollToSection = (id: string) => {
    setActiveSection(id);
    setIsMobileMenuOpen(false);
    const element = contentRefs.current[id];
    if (element) {
      const offset = 100; // Account for sticky navbar header
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  // Track scroll position to update active sidebar item
  useEffect(() => {
    if (searchQuery) return; // Disable scroll-spy during active filtering to prevent jitter

    const handleScroll = () => {
      const scrollPosition = window.scrollY + 150; // offset
      
      for (const section of SECTIONS) {
        const element = contentRefs.current[section.id];
        if (element) {
          const top = element.offsetTop;
          const height = element.offsetHeight;
          
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [searchQuery]);

  // Handle URL hash on load (e.g. /terms#section-14)
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash) {
        // e.g. #section-14
        const sectionNum = hash.replace("#section-", "");
        const matched = SECTIONS.find(s => s.num === sectionNum);
        if (matched) {
          setTimeout(() => scrollToSection(matched.id), 300);
        } else {
          const matchedId = hash.substring(1);
          const matchedById = SECTIONS.find(s => s.id === matchedId);
          if (matchedById) {
            setTimeout(() => scrollToSection(matchedById.id), 300);
          }
        }
      }
    };

    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  // Text highlight helper
  const highlightText = (text: string, search: string) => {
    if (!search.trim()) return text;
    const regex = new RegExp(`(${search.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")})`, "gi");
    const parts = text.split(regex);
    
    return (
      <>
        {parts.map((part, i) => 
          regex.test(part) ? (
            <mark key={i} className="bg-amber-100 text-hive-text dark:bg-amber-950/80 dark:text-amber-200 px-0.5 rounded transition-colors duration-150 font-medium">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  // Checks if string is a subclause or list item to indent nicely
  const getParagraphStyles = (text: string) => {
    const trimmed = text.trim();
    // starts with (a), (b), (c) etc
    if (trimmed.startsWith("(") && trimmed.charAt(2) === ")") {
      return "pl-6 sm:pl-8 text-slate-700 dark:text-slate-300 relative before:content-['•'] before:absolute before:left-2 before:text-hive-gold";
    }
    // starts with 3.1, 14.2 etc
    if (/^\d+\.\d+/.test(trimmed)) {
      return "font-sans font-medium text-slate-800 dark:text-slate-200 mt-4";
    }
    return "text-slate-600 dark:text-slate-400";
  };

  return (
    <div className="bg-slate-50 dark:bg-neutral-950 text-slate-900 dark:text-slate-100 min-h-screen py-8 sm:py-12 md:py-16 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Breadcrumb & Navigation Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 print:hidden">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-hive-gold transition-colors group font-sans"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            Back to Home
          </Link>
          
          <div className="flex flex-wrap gap-2.5">
            <button 
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-neutral-800/60 shadow-sm transition-all cursor-pointer active:scale-[0.98]"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Version
            </button>
            <a 
              href="/terms.pdf" 
              download="Hive_by_TailorBee_Terms_and_Conditions.pdf"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-hive-gold text-hive-dark hover:bg-hive-amber shadow-sm shadow-hive-gold/10 transition-all cursor-pointer active:scale-[0.98]"
            >
              <Download className="w-3.5 h-3.5" />
              Download PDF
            </a>
          </div>
        </div>

        {/* Page Main Header */}
        <div className="border-b border-slate-200 dark:border-neutral-800 pb-8 mb-10 text-center md:text-left">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider bg-amber-50 dark:bg-amber-950/30 text-hive-gold border border-hive-border/30 mb-3 uppercase">
                <Scale className="w-3 h-3" /> Legal Document
              </span>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight font-serif text-slate-900 dark:text-white">
                Terms and Conditions
              </h1>
              <p className="mt-2 text-sm sm:text-base text-slate-500 dark:text-slate-400">
                Hive by TailorBee — Owned and operated by <span className="font-semibold text-slate-700 dark:text-slate-300">BEELYN LLP</span> (LLPIN: ACS-4901)
              </p>
            </div>
            
            <div className="flex flex-wrap justify-center md:justify-end gap-3 font-sans text-xs">
              <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 px-4 py-2.5 rounded-2xl flex items-center gap-2 shadow-sm">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-500 dark:text-slate-400">Version 2.0</span>
              </div>
              <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 px-4 py-2.5 rounded-2xl flex items-center gap-2 shadow-sm">
                <FileCheck className="w-3.5 h-3.5 text-hive-gold" />
                <span className="text-slate-600 dark:text-slate-300 font-medium">Effective: June 12, 2026</span>
              </div>
            </div>
          </div>

          {/* Interactive Search */}
          <div className="mt-8 max-w-xl print:hidden">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search within terms (e.g., refunds, returns, Razorpay)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-hive-gold/40 focus:border-hive-gold text-sm transition-all placeholder:text-slate-400 shadow-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  Clear
                </button>
              )}
            </div>
            {searchQuery && (
              <p className="mt-2.5 text-xs text-slate-500 dark:text-slate-400 pl-1">
                Found {filteredSections.length} section{filteredSections.length === 1 ? "" : "s"} matching "{searchQuery}"
              </p>
            )}
          </div>
        </div>

        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 md:gap-12 items-start">
          
          {/* Left Sidebar Table of Contents (Desktop) */}
          <aside className="hidden lg:block lg:col-span-1 sticky top-28 max-h-[calc(100vh-160px)] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent print:hidden">
            <h2 className="text-xs font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5" /> Navigation
            </h2>
            <nav className="flex flex-col gap-1 border-l border-slate-200 dark:border-neutral-800">
              {SECTIONS.map((section) => {
                const isFilteredOut = searchQuery && !filteredSections.some(s => s.id === section.id);
                const isActive = activeSection === section.id && !searchQuery;

                return (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    disabled={!!isFilteredOut}
                    className={`text-left text-xs py-2 px-3 pl-4 border-l -ml-px transition-all cursor-pointer font-sans select-none block truncate ${
                      isFilteredOut 
                        ? "opacity-30 cursor-not-allowed hidden" 
                        : isActive
                          ? "border-hive-gold text-hive-gold font-bold bg-amber-500/5"
                          : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-neutral-700"
                    }`}
                  >
                    <span className="font-mono text-[10px] opacity-60 mr-1.5">{section.num}.</span>
                    {section.title}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Mobile TOC Dropdown Trigger */}
          <div className="lg:hidden print:hidden mb-4">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="w-full flex justify-between items-center px-5 py-3.5 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl shadow-sm text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-hive-gold" />
                Table of Contents:{" "}
                <span className="text-hive-gold font-bold">
                  {SECTIONS.find(s => s.id === activeSection)?.title || "Select Section"}
                </span>
              </span>
              <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${isMobileMenuOpen ? "rotate-90" : ""}`} />
            </button>

            {/* Mobile TOC Panel */}
            {isMobileMenuOpen && (
              <div className="mt-2 max-h-72 overflow-y-auto bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl shadow-lg p-2.5 z-20 absolute left-4 right-4 sm:left-auto sm:right-auto sm:w-80">
                <div className="flex flex-col gap-0.5">
                  {SECTIONS.map((section) => {
                    const isFilteredOut = searchQuery && !filteredSections.some(s => s.id === section.id);
                    const isActive = activeSection === section.id;
                    
                    if (isFilteredOut) return null;

                    return (
                      <button
                        key={section.id}
                        onClick={() => scrollToSection(section.id)}
                        className={`text-left text-xs py-2.5 px-4 rounded-xl transition-all ${
                          isActive
                            ? "bg-amber-50 dark:bg-amber-950/20 text-hive-gold font-bold"
                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-neutral-800/40"
                        }`}
                      >
                        <span className="font-mono text-[10px] mr-1.5 opacity-60">{section.num}.</span>
                        {section.title}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Main Legal Document Panels */}
          <div className="lg:col-span-3 space-y-12 pb-24 font-sans print:space-y-8 print:pb-0">
            {filteredSections.length > 0 ? (
              filteredSections.map((section) => (
                <div 
                  key={section.id}
                  ref={(el) => { contentRefs.current[section.id] = el; }}
                  className="bg-white dark:bg-neutral-900/50 border border-slate-200/80 dark:border-neutral-900 p-6 sm:p-8 rounded-3xl shadow-sm hover:shadow-md/5 transition-all duration-300 relative print:border-none print:shadow-none print:p-0 print:bg-transparent"
                >
                  {/* Anchor offset spacer */}
                  <span className="absolute -top-28 block" id={`section-${section.num}`} />
                  
                  {/* Section Title */}
                  <div className="border-b border-slate-100 dark:border-neutral-800/60 pb-4 mb-5 flex items-start gap-4">
                    <span className="flex-shrink-0 w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center font-mono text-sm font-bold text-hive-gold border border-hive-border/20">
                      {section.num}
                    </span>
                    <h2 className="text-xl sm:text-2xl font-bold font-serif text-slate-800 dark:text-white pt-0.5">
                      {highlightText(section.title, searchQuery)}
                    </h2>
                  </div>

                  {/* Section Paragraphs */}
                  <div className="space-y-4 leading-relaxed font-sans text-sm sm:text-[15px]">
                    {section.content.map((paragraph, index) => (
                      <p 
                        key={index} 
                        className={getParagraphStyles(paragraph)}
                      >
                        {highlightText(paragraph, searchQuery)}
                      </p>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              // Search Empty State
              <div className="text-center py-20 bg-white dark:bg-neutral-900/40 border border-dashed border-slate-200 dark:border-neutral-800 rounded-3xl p-8 max-w-lg mx-auto">
                <FileText className="w-12 h-12 text-slate-300 dark:text-neutral-700 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">No Matching Terms Found</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  We couldn't find any section matching your search query "{searchQuery}". Try searching for related keywords like "refunds", "eligibility", or "delivery".
                </p>
                <button
                  onClick={() => setSearchQuery("")}
                  className="mt-5 px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                >
                  Reset Search
                </button>
              </div>
            )}
          </div>
          
        </div>

        {/* Corporate Address Footer inside Document Panel */}
        <div className="border-t border-slate-200 dark:border-neutral-800 pt-8 mt-12 mb-6 text-center text-xs text-slate-400 dark:text-neutral-500 font-sans print:mt-6">
          <Building className="w-4 h-4 mx-auto mb-2 text-slate-300 dark:text-neutral-600" />
          <p className="font-semibold text-slate-600 dark:text-slate-400">BEELYN LLP (LLPIN: ACS-4901)</p>
          <p className="mt-1">55/4379, Door No. 3623, Valanjambalam Junction, Kochi M.G. Road, Ernakulam, Kerala – 682016, India</p>
          <p className="mt-1">Customer Care Support: support@hivenow.in</p>
        </div>

      </div>
    </div>
  );
}
