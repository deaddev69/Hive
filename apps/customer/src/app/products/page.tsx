import { ProductsClient } from "./ProductsClient";
import { getProductsMetadata } from "@/lib/seo";
import { BreadcrumbSchema } from "@/components/seo/BreadcrumbSchema";
import { SITE_URL } from "@/lib/seo";

export const metadata = getProductsMetadata();

const FASHION_CATEGORIES = [
  { name: "Kurtis", slug: "kurtis" },
  { name: "Dresses", slug: "dresses" },
  { name: "Shirts", slug: "shirts" },
  { name: "Jeans", slug: "jeans" },
  { name: "Sarees", slug: "sarees" },
  { name: "Footwear", slug: "footwear" },
  { name: "Accessories", slug: "accessories" },
  { name: "Co-ord Sets", slug: "co-ord-sets" },
];

const itemListSchema = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Fashion Categories on Hive — Kochi & Ernakulam",
  description: "Browse fashion categories available for 90-minute delivery across Kochi and Ernakulam on Hive.",
  url: `${SITE_URL}/products`,
  itemListElement: FASHION_CATEGORIES.map((cat, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: cat.name,
    url: `${SITE_URL}/products/${cat.slug}`,
  })),
};

export default function ProductsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />
      <BreadcrumbSchema 
        items={[
          { name: "Home", url: "/" },
          { name: "Products", url: "/products" },
        ]} 
      />
      <ProductsClient />
    </>
  );
}
