import type { Metadata } from "next";
import { AyhubSiteDetailView } from "@/features/ayhub/components/ayhub-site-detail-view";

export const metadata: Metadata = { title: "Site AYhub" };

export default async function AyhubSitePage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  return <AyhubSiteDetailView siteId={siteId} />;
}
