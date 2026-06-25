import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { portalDataFor, type AgencyClient } from "@/components/agency/data";
import { PortalView } from "@/components/portal/portal-view";
import { createClient } from "@/lib/supabase/server";

const COLS =
  "id,name,segment,manager,health:status,score,platforms,accounts,spend,roas,delta,pendingTasks:pending_tasks,portal,contactEmail:contact_email,lastSync:last_sync";

async function fetchAgencyClient(id: string): Promise<AgencyClient | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("clients").select(COLS).eq("id", id).maybeSingle();
  return (data as AgencyClient) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const client = await fetchAgencyClient(id);
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
  const client = await fetchAgencyClient(id);
  if (!client) notFound();
  return <PortalView client={client} data={portalDataFor(client)} />;
}
