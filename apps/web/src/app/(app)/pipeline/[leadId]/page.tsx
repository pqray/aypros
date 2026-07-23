import type { Metadata } from "next";
import { LeadDetailView } from "@/features/pipeline/components/lead-detail-view";

export const metadata: Metadata = { title: "Lead" };

export default async function LeadDetailPage({ params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await params;
  return <LeadDetailView leadId={leadId} />;
}
