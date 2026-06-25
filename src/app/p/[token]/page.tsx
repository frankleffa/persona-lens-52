import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { portalDataFor, type AgencyClient } from "@/components/agency/data";
import { PortalView } from "@/components/portal/portal-view";
import { adminClient } from "@/lib/supabase/admin";

const COLS =
  "id,name,segment,manager,health:status,score,platforms,accounts,spend,roas,delta,pendingTasks:pending_tasks,portal,contactEmail:contact_email,lastSync:last_sync,portal_visible";

type Row = AgencyClient & { portal: string; portal_visible: Record<string, boolean> };

async function fetchByToken(token: string): Promise<Row | null> {
  // Acesso público por token: valida o token no servidor (service-role),
  // sem expor a chave ao browser. Só retorna se o portal estiver liberado.
  const supabase = adminClient();
  const { data } = await supabase.from("clients").select(COLS).eq("portal_token", token).maybeSingle();
  if (!data) return null;
  const row = data as Row;
  if (row.portal === "sem-acesso") return null;
  return row;
}

export const metadata: Metadata = {
  title: "Portal do cliente",
  robots: { index: false, follow: false },
};

export default async function PublicPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const client = await fetchByToken(token);
  if (!client) notFound();

  // Filtra no SERVIDOR: dado de plataforma oculta não chega ao browser do cliente.
  const vis = client.portal_visible ?? {};
  const data = portalDataFor(client);
  const filtered = { ...data, campaigns: data.campaigns.filter((c) => vis[c.platform] !== false) };
  const safeClient = { ...client, platforms: client.platforms.filter((p) => vis[p] !== false) };

  return <PortalView client={safeClient} data={filtered} visible={vis} />;
}
