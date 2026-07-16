import { ProductsClient } from "./ProductsClient";
import { getProductsMetadata } from "@/lib/seo";
import { BreadcrumbSchema } from "@/components/seo/BreadcrumbSchema";

export const metadata = getProductsMetadata();

export default function ProductsPage() {
  return (
    <>
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
