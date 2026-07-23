import type { Metadata } from "next";
import { OrganizationSettingsClient } from "./organization-settings-client";

export const metadata: Metadata = { title: "Organização" };

export default function OrganizationSettingsPage() {
  return <OrganizationSettingsClient />;
}
