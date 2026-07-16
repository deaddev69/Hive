import { ShipmentDetailsClient } from "./ShipmentDetailsClient";

export default async function ShipmentDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return <ShipmentDetailsClient shipmentId={resolvedParams.id} />;
}
