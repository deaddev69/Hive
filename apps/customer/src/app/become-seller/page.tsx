import { BecomeSellerClient } from "./BecomeSellerClient";
import { getSellerMetadata } from "@/lib/seo";
import { OrganizationSchema } from "@/components/seo/OrganizationSchema";

export const metadata = getSellerMetadata();

export default function BecomeSellerPage() {
  return (
    <>
      <OrganizationSchema />
      <BecomeSellerClient />
    </>
  );
}
