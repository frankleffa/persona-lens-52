import type { Metadata } from "next";
import { AgencyControl } from "@/components/agency/agency-control";

export const metadata: Metadata = { title: "Central de controle" };

export default function CentralPage() {
  return <AgencyControl />;
}
