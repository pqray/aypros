import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aypros",
  description: "Prospecção comercial para quem vende sites",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
