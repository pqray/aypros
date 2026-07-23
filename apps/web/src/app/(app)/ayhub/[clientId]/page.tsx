import type { Metadata } from "next";
import { AyhubClientDetailView } from "@/features/ayhub/components/ayhub-client-detail-view";

export const metadata: Metadata = { title: "Cliente AYhub" };

export default async function AyhubClientPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  return <AyhubClientDetailView clientId={clientId} />;
}
