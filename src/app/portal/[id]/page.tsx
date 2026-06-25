import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { agencyClients, getAgencyClient, portalDataFor } from "@/components/agency/data";
import { PortalView } from "@/components/portal/portal-view";

export function generateStaticParams() {
  return agencyClients.map((c) => ({ id: c.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const client = getAgencyClient(id);
  return {
    title: client ? `${client.name} · Portal` : "Portal do cliente",
    robots: { index: false, follow: false },
  };
}

export default async function PortalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = getAgencyClient(id);
  if (!client) notFound();
  return <PortalView client={client} data={portalDataFor(client)} />;
}
