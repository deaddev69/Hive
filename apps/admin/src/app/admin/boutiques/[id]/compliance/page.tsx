import { ComplianceClient } from "./ComplianceClient";

export default async function BoutiqueCompliancePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return <ComplianceClient boutiqueId={resolvedParams.id} />;
}
