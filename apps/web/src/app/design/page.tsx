import { notFound } from "next/navigation";
import { DesignShowcase } from "./showcase";

export const metadata = { title: "Design System — Aypros" };

/** Internal component showcase. Dev only — hidden in production builds. */
export default function DesignPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  return <DesignShowcase />;
}
