import type { Metadata } from "next";
import { PricingPage } from "@/components/landing/pricing-page";

export const metadata: Metadata = {
  title: "Preços — AdScape",
  description: "Planos do AdScape para gestores de tráfego. 14 dias grátis, sem cartão.",
};

export default function Precos() {
  return <PricingPage />;
}
