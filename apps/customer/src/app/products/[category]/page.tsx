import { ProductsClient } from "../ProductsClient";
import { getCategoryMetadata } from "@/lib/seo";
import { BreadcrumbSchema } from "@/components/seo/BreadcrumbSchema";

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }) {
  const resolvedParams = await params;
  return getCategoryMetadata(resolvedParams.category);
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const resolvedParams = await params;
  const formattedCategory = resolvedParams.category.charAt(0).toUpperCase() + resolvedParams.category.slice(1);
  
  return (
    <>
      <BreadcrumbSchema 
        items={[
          { name: "Home", url: "/" },
          { name: "Products", url: "/products" },
          { name: formattedCategory, url: `/products/${resolvedParams.category}` },
        ]} 
      />
      <ProductsClient initialCategorySlug={resolvedParams.category} />
    </>
  );
}
