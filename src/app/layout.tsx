import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Providers } from "./providers";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://adscape.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "AdScape — O superapp do gestor de tráfego",
    template: "%s · AdScape",
  },
  description:
    "O superapp do gestor de tráfego: campanhas, clientes, CRM e dados de Google Ads, Meta Ads e GA4 em um só lugar.",
  applicationName: "AdScape",
  authors: [{ name: "AdScape" }],
  openGraph: {
    type: "website",
    siteName: "AdScape",
    locale: "pt_BR",
    title: "AdScape — O superapp do gestor de tráfego",
    description:
      "Campanhas, clientes, CRM e relatórios no WhatsApp em uma só plataforma para gestores de tráfego.",
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0b" },
    { media: "(prefers-color-scheme: light)", color: "#f4f8fe" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
