import type { Metadata } from "next";
import { ProfileSettingsClient } from "./profile-settings-client";

export const metadata: Metadata = { title: "Perfil" };

export default function ProfileSettingsPage() {
  return <ProfileSettingsClient />;
}
