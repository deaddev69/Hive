import { HomeClient } from "./HomeClient";
import { getHomeMetadata } from "@/lib/seo";
import { OrganizationSchema } from "@/components/seo/OrganizationSchema";
import { LocalBusinessSchema } from "@/components/seo/LocalBusinessSchema";
import { FaqSchema } from "@/components/seo/FaqSchema";
import { WebSiteSchema } from "@/components/seo/WebSiteSchema";

export const metadata = getHomeMetadata();

export default function HomePage() {
  return (
    <>
      <OrganizationSchema />
      <LocalBusinessSchema />
      <WebSiteSchema />
      <FaqSchema />
      <HomeClient />
    </>
  );
}
