import { LeadDetailView } from "@/features/pipeline/components/lead-detail-view";

export default async function LeadDetailPage({ params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await params;
  return <LeadDetailView leadId={leadId} />;
}
