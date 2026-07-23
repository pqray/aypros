import type { Metadata } from "next";
import { AyhubDocsView } from "@/features/ayhub/components/ayhub-docs-view";

export const metadata: Metadata = { title: "Documentação AYhub" };

export default function AyhubDocsPage() {
  return <AyhubDocsView />;
}
