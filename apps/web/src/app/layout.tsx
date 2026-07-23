import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: { default: "Aypros", template: "%s · Aypros" },
  description: "Prospecção comercial para quem vende sites",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-svh overflow-hidden" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} h-svh overflow-hidden font-sans antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
