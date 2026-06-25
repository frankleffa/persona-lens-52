import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useManagerClients } from "@/hooks/useManagerClients";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";
import { useCampaignManager } from "@/hooks/useCampaignManager";
import { CampaignCreator } from "@/components/campaigns/CampaignCreator";
import { CampaignActions } from "@/components/campaigns/CampaignActions";
import { CampaignActionsLog } from "@/components/campaigns/CampaignActionsLog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ChevronDown, ChevronRight, Plus, Search, Megaphone, Layers, FileImage,
  Loader2, AlertTriangle,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────

interface CampaignRow {
  id: string;
  campaign_name: string;
  campaign_status: string;
  external_campaign_id: string | null;
  platform: string;
  source: string;
  spend: number;
  clicks: number;
  conversions: number;
  leads: number;
  purchases: number;
  registrations: number;
  messages: number;
  revenue: number;
  cpa: number;
  adset_count: number;
  ad_count: number;
  date: string;
}

interface AggregatedCampaign {
  name: string;
  external_id: string | null;
  status: string;
  source: string;
  spend: number;
  clicks: number;
  conversions: number;
  leads: number;
  purchases: number;
  registrations: number;
  messages: number;
  revenue: number;
  cpa: number;
  adset_count: number;
  ad_count: number;
}

// ─── Hooks ──────────────────────────────────────────────────────

function useCampaignHierarchy(clientId: string | undefined) {
  return useQuery({
    queryKey: ["campaign-hierarchy", clientId],
    queryFn: async (): Promise<AggregatedCampaign[]> => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from("daily_campaigns")
        .select("*")
        .eq("client_id", clientId)
        .order("date", { ascending: false });
      if (error) throw error;

      const map = new Map<string, AggregatedCampaign>();
      for (const row of (data as CampaignRow[]) ?? []) {
        const key = row.external_campaign_id
          ? `${row.external_campaign_id}__${row.source}`
          : `${row.campaign_name}__${row.source}`;
        const existing = map.get(key);
        if (existing) {
          existing.spend += Number(row.spend) || 0;
          existing.clicks += Number(row.clicks) || 0;
          existing.conversions += Number(row.conversions) || 0;
          existing.leads += Number(row.leads) || 0;
          existing.purchases += Number(row.purchases) || 0;
          existing.registrations += Number(row.registrations) || 0;
          existing.messages += Number(row.messages) || 0;
          existing.revenue += Number(row.revenue) || 0;
          existing.adset_count = Math.max(existing.adset_count, Number(row.adset_count) || 0);
          existing.ad_count = Math.max(existing.ad_count, Number(row.ad_count) || 0);
        } else {
          map.set(key, {
            name: row.campaign_name,
            external_id: row.external_campaign_id || null,
            status: row.campaign_status || "Ativa",
            source: row.source || "",
            spend: Number(row.spend) || 0,
            clicks: Number(row.clicks) || 0,
            conversions: Number(row.conversions) || 0,
            leads: Number(row.leads) || 0,
            purchases: Number(row.purchases) || 0,
            registrations: Number(row.registrations) || 0,
            messages: Number(row.messages) || 0,
            revenue: Number(row.revenue) || 0,
            cpa: 0,
            adset_count: Number(row.adset_count) || 0,
            ad_count: Number(row.ad_count) || 0,
          });
        }
      }

      return Array.from(map.values()).map((c) => {
        const primary = c.messages > 0 ? c.messages : c.purchases > 0 ? c.purchases : c.registrations > 0 ? c.registrations : c.conversions;
        return { ...c, cpa: primary > 0 ? c.spend / primary : 0 };
      }).sort((a, b) => b.spend - a.spend);
    },
    enabled: !!clientId,
    staleTime: 2 * 60 * 1000,
  });
}

// ─── Status badge ───────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  if (normalized === "ACTIVE" || normalized === "ATIVA") {
    return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px]">Ativa</Badge>;
  }
  if (normalized === "PAUSED" || normalized === "PAUSADA") {
    return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[10px]">Pausada</Badge>;
  }
  if (normalized === "ARCHIVED") {
    return <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-[10px]">Arquivada</Badge>;
  }
  return <Badge variant="secondary" className="text-[10px]">{status}</Badge>;
}

function SourceBadge({ source }: { source: string }) {
  if (source === "Meta Ads") {
    return <Badge className="badge-meta text-[10px]">Meta</Badge>;
  }
  if (source === "Google Ads") {
    return <Badge className="bg-chart-blue/15 text-chart-blue border-chart-blue/30 text-[10px]">Google</Badge>;
  }
  return <Badge variant="outline" className="text-[10px]">{source || "—"}</Badge>;
}

// ─── Campaign row with expand ───────────────────────────────────

function CampaignExpandableRow({
  campaign,
  clientId,
}: {
  campaign: AggregatedCampaign;
  clientId: string;
}) {
  const [expanded, setExpanded] = useState(false);

  const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtInt = (v: number) => v.toLocaleString("pt-BR");

  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <TableCell className="font-medium">
          <div className="flex items-center gap-2">
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
            <Megaphone className="h-4 w-4 text-primary shrink-0" />
            <span className="truncate max-w-[280px]">{campaign.name}</span>
          </div>
        </TableCell>
        <TableCell><SourceBadge source={campaign.source} /></TableCell>
        <TableCell><StatusBadge status={campaign.status} /></TableCell>
        <TableCell className="text-right font-mono">{fmt(campaign.spend)}</TableCell>
        <TableCell className="text-right font-mono">{fmtInt(campaign.clicks)}</TableCell>
        <TableCell className="text-right font-mono">{fmtInt(campaign.conversions)}</TableCell>
        <TableCell className="text-right font-mono">{fmt(campaign.revenue)}</TableCell>
        <TableCell className="text-right font-mono">{fmt(campaign.cpa)}</TableCell>
        <TableCell className="text-center">
          <div className="flex items-center justify-center gap-1">
            <Badge variant="outline" className="text-[10px] gap-1">
              <Layers className="h-3 w-3" />
              {campaign.adset_count}
            </Badge>
            <Badge variant="outline" className="text-[10px] gap-1">
              <FileImage className="h-3 w-3" />
              {campaign.ad_count}
            </Badge>
          </div>
        </TableCell>
        <TableCell className="w-12" onClick={(e) => e.stopPropagation()}>
          {campaign.external_id && (
            <CampaignActions
              campaignId={campaign.external_id}
              campaignName={campaign.name}
              currentStatus={campaign.status}
              clientId={clientId}
            />
          )}
        </TableCell>
      </TableRow>

      {/* Expanded detail: adsets & ads placeholder */}
      {expanded && (
        <TableRow className="bg-muted/30">
          <TableCell colSpan={10} className="p-0">
            <CampaignDetail campaign={campaign} clientId={clientId} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

// ─── Campaign detail (adsets / ads) ─────────────────────────────

function CampaignDetail({
  campaign,
  clientId,
}: {
  campaign: AggregatedCampaign;
  clientId: string;
}) {
  const adsetCount = campaign.adset_count || 0;
  const adCount = campaign.ad_count || 0;

  return (
    <div className="px-8 py-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Ad Sets section */}
        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Conjuntos de Anúncios
              <Badge variant="secondary" className="text-[10px]">{adsetCount}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {adsetCount > 0 ? (
              <div className="space-y-2">
                {Array.from({ length: Math.min(adsetCount, 5) }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-md border border-border p-3 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-foreground font-medium">
                        {campaign.name} - Conjunto {i + 1}
                      </span>
                    </div>
                    <StatusBadge status={campaign.status} />
                  </div>
                ))}
                {adsetCount > 5 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{adsetCount - 5} conjuntos adicionais
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhum conjunto de anúncios encontrado.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Ads section */}
        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileImage className="h-4 w-4 text-primary" />
              Anúncios
              <Badge variant="secondary" className="text-[10px]">{adCount}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {adCount > 0 ? (
              <div className="space-y-2">
                {Array.from({ length: Math.min(adCount, 5) }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-md border border-border p-3 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <FileImage className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-foreground font-medium">
                        {campaign.name} - Anúncio {i + 1}
                      </span>
                    </div>
                    <StatusBadge status={campaign.status} />
                  </div>
                ))}
                {adCount > 5 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{adCount - 5} anúncios adicionais
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhum anúncio encontrado.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Metrics summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: "Investimento", value: `R$ ${campaign.spend.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` },
          { label: "Cliques", value: campaign.clicks.toLocaleString("pt-BR") },
          { label: "Leads", value: campaign.leads.toLocaleString("pt-BR") },
          { label: "Compras", value: campaign.purchases.toLocaleString("pt-BR") },
          { label: "Mensagens", value: campaign.messages.toLocaleString("pt-BR") },
          { label: "Receita", value: `R$ ${campaign.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` },
        ].map((m) => (
          <div key={m.label} className="rounded-lg border border-border p-3">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{m.label}</p>
            <p className="text-sm font-semibold text-foreground mt-1">{m.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main page ──────────────────────────────────────────────────

export default function CampaignManagement() {
  const { role } = useUserRole();
  const { user } = useAuth();
  const isManagerOrAdmin = role === "admin" || role === "manager";
  const { clients, loading: loadingClients } = useManagerClients(isManagerOrAdmin);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [search, setSearch] = useState("");
  const [creatorOpen, setCreatorOpen] = useState(false);

  useEffect(() => {
    if (isManagerOrAdmin && clients.length > 0 && !clients.some((c) => c.id === selectedClientId)) {
      setSelectedClientId(clients[0].id);
    }
  }, [clients, isManagerOrAdmin, selectedClientId]);

  const clientId = isManagerOrAdmin ? selectedClientId : user?.id ?? "";
  const { data: campaigns, isLoading, error } = useCampaignHierarchy(clientId || undefined);

  const filtered = useMemo(() => {
    if (!campaigns) return [];
    if (!search.trim()) return campaigns;
    const q = search.toLowerCase();
    return campaigns.filter((c) =>
      c.name.toLowerCase().includes(q) || c.source.toLowerCase().includes(q)
    );
  }, [campaigns, search]);

  const totalSpend = filtered.reduce((s, c) => s + c.spend, 0);
  const totalRevenue = filtered.reduce((s, c) => s + c.revenue, 0);
  const totalCampaigns = filtered.length;

  return (
    <div className="min-h-screen bg-background">
      <div className="pt-20 lg:pt-8 lg:ml-64 p-4 sm:p-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="topbar px-4 sm:px-6 lg:px-8 py-5 rounded-lg border">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="topbar-title">Gestão de Campanhas</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Visualize e gerencie campanhas, conjuntos e anúncios
                </p>
              </div>
              {isManagerOrAdmin && clientId && (
                <Button onClick={() => setCreatorOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nova Campanha
                </Button>
              )}
            </div>

            {isManagerOrAdmin && (
              <div className="mt-4 max-w-sm">
                <label className="mb-2 block text-sm font-medium text-foreground">Cliente</label>
                <select
                  className="w-full border border-input bg-surface2 px-3 py-2 text-[13px] font-medium rounded-md"
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  disabled={loadingClients || clients.length === 0}
                >
                  {clients.length === 0 ? (
                    <option value="">
                      {loadingClients ? "Carregando clientes..." : "Nenhum cliente vinculado"}
                    </option>
                  ) : (
                    clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.client_label}</option>
                    ))
                  )}
                </select>
              </div>
            )}
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Campanhas</p>
                <p className="text-2xl font-bold text-foreground mt-1">{totalCampaigns}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Investimento Total</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  R$ {totalSpend.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Receita Total</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  R$ {totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="campaigns" className="space-y-4">
            <TabsList>
              <TabsTrigger value="campaigns">Campanhas</TabsTrigger>
              <TabsTrigger value="log">Histórico de Ações</TabsTrigger>
            </TabsList>

            <TabsContent value="campaigns" className="space-y-4">
              {/* Search */}
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar campanha..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Table */}
              <Card>
                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span className="ml-2 text-sm text-muted-foreground">Carregando campanhas...</span>
                    </div>
                  ) : error ? (
                    <div className="flex items-center justify-center py-16 text-destructive gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      <span className="text-sm">Erro ao carregar campanhas</span>
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                      <Megaphone className="h-8 w-8 mb-2 opacity-50" />
                      <p className="text-sm">Nenhuma campanha encontrada</p>
                      {isManagerOrAdmin && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-4 gap-2"
                          onClick={() => setCreatorOpen(true)}
                        >
                          <Plus className="h-4 w-4" />
                          Criar primeira campanha
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Campanha</TableHead>
                            <TableHead>Origem</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Investimento</TableHead>
                            <TableHead className="text-right">Cliques</TableHead>
                            <TableHead className="text-right">Conversões</TableHead>
                            <TableHead className="text-right">Receita</TableHead>
                            <TableHead className="text-right">CPA</TableHead>
                            <TableHead className="text-center">Estrutura</TableHead>
                            <TableHead className="w-12" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filtered.map((c) => (
                            <CampaignExpandableRow
                              key={`${c.external_id || c.name}__${c.source}`}
                              campaign={c}
                              clientId={clientId}
                            />
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="log">
              {clientId && <CampaignActionsLog clientId={clientId} />}
            </TabsContent>
          </Tabs>

          {/* Creator dialog */}
          {clientId && (
            <CampaignCreator
              clientId={clientId}
              open={creatorOpen}
              onOpenChange={setCreatorOpen}
            />
          )}
        </div>
      </div>
    </div>
  );
}
