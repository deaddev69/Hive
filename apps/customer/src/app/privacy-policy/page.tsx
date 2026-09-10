import { redirect } from "next/navigation";

/**
 * Sends the conventional privacy URL to the document itself.
 *
 * This used to redirect to /terms#privacy-policy, which was wrong twice over: the Terms page has
 * no privacy section - its thirty-two headings cover acceptance, payments, shipping, returns and
 * so on, and the only privacy mention is section 32, "Privacy Policy Linkage", a reference to the
 * separate document - and no element on it carries id="privacy-policy", so the anchor did nothing
 * either. Anyone following the footer's "Privacy" link, or typing the address most people would
 * guess, landed at the top of Terms with no privacy content in view.
 *
 * The policy itself is served by /legal/[slug] out of the legal documents table. That is the one
 * copy, so this points at it rather than duplicating the text here.
 */
export default function PrivacyPolicyPage() {
  redirect("/legal/privacy-policy");
}
