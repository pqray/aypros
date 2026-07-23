import type { Metadata } from "next";
import { AyhubDashboardView } from "@/features/ayhub/components/ayhub-dashboard-view";

export const metadata: Metadata = { title: "Dashboard AYhub" };

export default function AyhubDashboardPage() {
  return <AyhubDashboardView />;
}
