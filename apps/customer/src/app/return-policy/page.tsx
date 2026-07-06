import React from "react";
import { CatalogLayout } from "@/components/catalog/CatalogLayout";

export default function ReturnPolicyPage() {
  return (
    <CatalogLayout>
      <div className="max-w-3xl mx-auto px-4 py-12 md:py-16 text-left select-text">
        <div className="space-y-2 mb-10 pb-8 border-b border-stone-200">
          <span className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-amber-700">
            Hive by TailorBee
          </span>
          <h1 className="text-3xl font-serif font-semibold text-stone-900 tracking-tight">
            Return and Refund Policy
          </h1>
          <p className="text-xs text-stone-400 font-medium">
            Version 1.0 • Effective Date: July 1, 2026 • Last Updated: July 1, 2026
          </p>
        </div>

        <div className="prose prose-stone max-w-none text-stone-600 text-sm leading-relaxed space-y-6 font-medium">
          <div className="bg-[#FAF8F5]/80 border border-[#EAE1D4] rounded-2xl p-5 mb-8">
            <h3 className="text-xs font-bold text-stone-850 uppercase tracking-wider mb-2">
              Corporate & Support Information
            </h3>
            <p className="text-xs text-stone-600 space-y-1">
              <strong>BEELYN LLP</strong><br />
              LLPIN: ACS-4901<br />
              Registered Office: 55/4379, Door No. 3623, Valanjambalam Junction, Kochi M.G. Road, Ernakulam, Kerala – 682016, India<br />
              Email Support: <a href="mailto:support@hivenow.in" className="underline font-bold text-stone-800">support@hivenow.in</a><br />
              Platform Link: <a href="https://hive.tailorbee.in" className="underline font-bold text-stone-800">https://hive.tailorbee.in</a>
            </p>
          </div>

          <section className="space-y-2">
            <h2 className="text-base font-serif font-bold text-stone-900">1. Introduction</h2>
            <p>
              1.1 This Return and Refund Policy (the “Policy”) explains how returns, refunds, and order cancellations work on Hive by TailorBee, available at <a href="https://hive.tailorbee.in" className="underline text-stone-850">https://hive.tailorbee.in</a> (the “Platform”), operated by BEELYN LLP.
            </p>
            <p>
              1.2 This Policy forms an integral part of, and should be read together with, the Hive by TailorBee Customer Terms and Conditions, Version 2.0 (“Customer Terms”) and the Privacy Policy. In the event of any inconsistency between this Policy and the Customer Terms, the Customer Terms shall prevail.
            </p>
            <p>
              1.3 This Policy applies to purchases made on the Platform from independent boutiques, designer studios, and fashion sellers (“Sellers”). Hive operates as a marketplace facilitator and coordinates the return and refund process on behalf of Customers and Sellers, as described in this Policy.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-serif font-bold text-stone-900">2. Return Window</h2>
            <p>
              2.1 Customers wishing to initiate a return must generally do so within <strong>three (3) days</strong> from the date of delivery of the Product.
            </p>
            <p>
              2.2 Return requests raised after expiry of this window may not be accepted, except where required under applicable consumer protection law.
            </p>
            <p>
              2.3 To initiate a return, Customers should raise a request through the Platform's “My Orders” section or contact <a href="mailto:support@hivenow.in" className="underline text-stone-850">support@hivenow.in</a> within the return window stated above.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-serif font-bold text-stone-900">3. No Change-of-Mind Returns</h2>
            <p>
              3.1 Hive is committed to keeping returns fair for both Customers and the independent boutiques selling on the Platform. Returns are therefore not accepted for:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li>(a) change of mind after purchase;</li>
              <li>(b) change in personal preference;</li>
              <li>(c) no longer wanting or needing the Product.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-serif font-bold text-stone-900">4. Eligible Returns</h2>
            <p>
              4.1 Subject to this Policy, return requests may be accepted only where:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li>(a) the Product delivered is physically damaged;</li>
              <li>(b) a different Product from the one ordered has been delivered;</li>
              <li>(c) the Product is materially defective, and the defect is not attributable to Customer use or mishandling;</li>
              <li>(d) a size discrepancy exists, as described in Section 5 below.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-serif font-bold text-stone-900">5. Size-Related Returns</h2>
            <p>
              5.1 A return on the basis of size may be accepted where:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li>(a) the Seller delivers a size that is different from the size expressly ordered by the Customer; or</li>
              <li>(b) the actual garment measurements of the delivered Product substantially differ from the measurements represented in the product description or size chart.</li>
            </ul>
            <p>
              5.2 In assessing size-related return claims, Hive will act reasonably and in good faith, taking into account the nature and category of the Product, any manufacturing tolerances disclosed or customary for that product category, and the accuracy of the information presented in the listing at the time of purchase.
            </p>
            <p>
              5.3 Where a Customer has ordered an incorrect size despite the Seller having provided accurate size information in the listing, Hive may decline the return request.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-serif font-bold text-stone-900">6. Unboxing Video Requirement</h2>
            <p>
              6.1 For claims involving damaged products, defective products, missing items, or wrong products delivered, Hive may request supporting evidence, including a continuous, uninterrupted unboxing video recorded from the moment the outer packaging is opened.
            </p>
            <p>
              6.2 This requirement helps prevent fraudulent claims, protects genuine Customers, and enables faster resolution of legitimate issues. Failure to provide reasonable supporting evidence when requested may result in the return claim being declined.
            </p>
            <p>
              6.3 This requirement does not exclude or override any statutory rights available to Customers under applicable consumer protection law.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-serif font-bold text-stone-900">7. How to Raise a Return</h2>
            <p>
              7.1 To raise a return, Customers should:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li>(a) go to “My Orders” on the Platform and select the relevant Order within the three (3) day return window;</li>
              <li>(b) choose the applicable reason for return from the options provided;</li>
              <li>(c) upload supporting evidence where requested, including photographs or an unboxing video as described in Section 6;</li>
              <li>(d) submit the request for review.</li>
            </ul>
            <p>
              7.2 Hive will review the request and notify the Customer of the outcome, including next steps for return pickup where the claim is approved.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-serif font-bold text-stone-900">8. Return Shipping and Pickup</h2>
            <p>
              8.1 Where a return claim is approved, Hive will arrange for pickup of the Product and will generally bear the cost of return logistics.
            </p>
            <p>
              8.2 Customers are requested to keep the Product in its original condition, with original tags and packaging intact, until pickup is completed.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-serif font-bold text-stone-900">9. Refund Timeline</h2>
            <p>
              9.1 The return window for raising a claim is <strong>three (3) days</strong> from the date of delivery, as set out in Section 2.
            </p>
            <p>
              9.2 Once a return is approved and the returned Product has been picked up and verified, Hive will process the refund to the Customer’s original payment source. Refunds are generally processed and credited within <strong>five (5) to seven (7) business days</strong> of approval.
            </p>
            <p>
              9.3 The actual time for the refunded amount to reflect in the Customer’s account or card statement may vary depending on the Customer’s bank or payment provider and is not within Hive’s control.
            </p>
            <p>
              9.4 Where an Order is cancelled prior to dispatch — for example, where a Seller does not accept the Order within the applicable acceptance window, or a Customer cancels prior to Seller acceptance — any amount paid will generally be refunded within <strong>five (5) to seven (7) business days</strong>.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-serif font-bold text-stone-900">10. Order Cancellations</h2>
            <p>
              10.1 Customers may request cancellation of an Order prior to Seller acceptance. Once an Order has been accepted by the Seller, cancellation may not be possible except as set out in the Customer Terms or as required by applicable law.
            </p>
            <p>
              10.2 If a Seller does not accept or reject an Order within the applicable acceptance window, Hive may automatically cancel the Order and will notify the Customer of the cancellation and its reason. Any amount paid will be refunded in accordance with Section 9.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-serif font-bold text-stone-900">11. Refunds for Payment Failures</h2>
            <p>
              11.1 Where a payment is debited but an Order is not successfully confirmed due to a payment failure, reversal, or suspected fraud, Hive will endeavour to ensure the amount is returned to the Customer’s original payment source within <strong>five (5) to seven (7) business days</strong>.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-serif font-bold text-stone-900">12. Non-Returnable Situations</h2>
            <p>
              12.1 In addition to change-of-mind returns described in Section 3, Hive may decline a return where:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li>(a) the return request is raised after the three (3) day return window;</li>
              <li>(b) the Product shows signs of use, alteration, or damage not present at the time of delivery;</li>
              <li>(c) original tags, packaging, or accessories are missing, where applicable to the claim;</li>
              <li>(d) requested supporting evidence, including an unboxing video, is not provided as described in Section 6;</li>
              <li>(e) the claimed size discrepancy falls within reasonable manufacturing tolerances and the listing information was accurate, as described in Section 5.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-serif font-bold text-stone-900">13. Statutory Rights Unaffected</h2>
            <p>
              13.1 Nothing in this Policy excludes, restricts, or limits any rights available to Customers under the Consumer Protection Act, 2019, the Consumer Protection (E-Commerce) Rules, 2020, or any other applicable consumer protection law in India.
            </p>
            <p>
              13.2 Where any provision of this Policy is inconsistent with a Customer’s statutory rights, the statutory right shall prevail.
            </p>
          </section>

          <section className="space-y-2 mb-12">
            <h2 className="text-base font-serif font-bold text-stone-900">14. Need Help?</h2>
            <p>
              14.1 For questions about a specific return, refund, or cancellation, or for any other support relating to this Policy, please contact:
            </p>
            <p className="text-xs text-stone-600 pl-4 border-l border-stone-200">
              <strong>Hive by TailorBee — Customer Support</strong><br />
              BEELYN LLP<br />
              55/4379, Door No. 3623, Valanjambalam Junction,<br />
              Kochi M.G. Road, Ernakulam, Kerala – 682016, India<br />
              Email: <a href="mailto:support@hivenow.in" className="underline">support@hivenow.in</a>
            </p>
            <p>
              14.2 Hive endeavours to acknowledge support queries within forty-eight (48) hours and to resolve valid grievances within one (1) month, in accordance with the grievance redressal mechanism described in the Customer Terms.
            </p>
          </section>
        </div>
      </div>
    </CatalogLayout>
  );
}
