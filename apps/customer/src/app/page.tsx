import { HomeClient } from "./HomeClient";
import { getHomeMetadata } from "@/lib/seo";
import { OrganizationSchema } from "@/components/seo/OrganizationSchema";
import { LocalBusinessSchema } from "@/components/seo/LocalBusinessSchema";
import { FaqSchema } from "@/components/seo/FaqSchema";

export const metadata = getHomeMetadata();

export default function HomePage() {
  return (
    <>
      <OrganizationSchema />
      <LocalBusinessSchema />
      <FaqSchema />
      <HomeClient />
    </>
  );
}
