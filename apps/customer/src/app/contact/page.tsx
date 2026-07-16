import { ContactClient } from "./ContactClient";
import { getContactMetadata } from "@/lib/seo";
import { LocalBusinessSchema } from "@/components/seo/LocalBusinessSchema";

export const metadata = getContactMetadata();

export default function ContactPage() {
  return (
    <>
      <LocalBusinessSchema />
      <ContactClient />
    </>
  );
}
