import type { Metadata } from "next";
import { BusinessDetailView } from "@/features/businesses/components/business-detail-view";

export const metadata: Metadata = { title: "Empresa" };

export default async function BusinessDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BusinessDetailView businessId={id} />;
}
