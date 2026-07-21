import { AyhubSiteDetailView } from "@/features/ayhub/components/ayhub-site-detail-view";

export default async function AyhubSitePage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  return <AyhubSiteDetailView siteId={siteId} />;
}
