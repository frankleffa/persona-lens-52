import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";

export const metadata: Metadata = {
  title: "AdScape — O superapp do gestor de tráfego",
  description:
    "Google Ads, Meta Ads e GA4 em um só lugar. Gerencie campanhas como no Meta, controle clientes e CRM, e envie relatórios automáticos no WhatsApp.",
  openGraph: {
    title: "AdScape — O superapp do gestor de tráfego",
    description:
      "Campanhas, clientes, CRM e relatórios no WhatsApp em uma só plataforma para gestores de tráfego.",
    type: "website",
  },
};

export default function Home() {
  return <LandingPage />;
}
