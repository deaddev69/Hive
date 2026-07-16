import { EditBoutiqueClient } from "./EditBoutiqueClient";

export default async function EditBoutiquePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return <EditBoutiqueClient boutiqueId={resolvedParams.id} />;
}
