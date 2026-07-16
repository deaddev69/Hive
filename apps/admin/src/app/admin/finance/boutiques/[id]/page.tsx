import { FinanceBoutiqueClient } from "./FinanceBoutiqueClient";

export default async function BoutiqueFinanceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return <FinanceBoutiqueClient boutiqueId={resolvedParams.id} />;
}
