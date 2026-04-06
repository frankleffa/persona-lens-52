import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Users, TrendingUp, Link as LinkIcon, AlertCircle } from "lucide-react";
import { useManagerClients } from "@/hooks/useManagerClients";

interface Lead {
  id: string;
  email: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  ltv_total: number | null;
  data_cadastro: string | null;
  client_id: string | null;
}

export default function LtvMetaAds() {
  const { clients } = useManagerClients();
  const [selectedClientId, setSelectedClientId] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (clients && clients.length > 0 && !selectedClientId) {
      setSelectedClientId(clients[0].id);
    }
  }, [clients, selectedClientId]);

  useEffect(() => {
    async function fetchLeads() {
      if (!selectedClientId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("client_id", selectedClientId)
        .in("utm_source", ["facebook", "instagram", "fb", "ig", "meta"])
        .order("data_cadastro", { ascending: false });

      if (!error && data) setLeads(data as Lead[]);
      else setLeads([]);
      setLoading(false);
    }
    fetchLeads();
  }, [selectedClientId]);

  const totalLeads = leads.length;
  const rawLtv = leads.reduce((acc, lead) => acc + (parseFloat(String(lead.ltv_total)) || 0), 0);
  const ltvMedio = totalLeads > 0 ? rawLtv / totalLeads : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const projectUrl = "https://uwvougccbsrnrtnsgert.supabase.co/functions/v1";

  if (!clients) return <p className="p-8 text-muted-foreground">Carregando permissões...</p>;

  return (
    <div className="pt-20 lg:pt-8 lg:ml-64 min-h-screen bg-background">
      <div className="p-4 sm:p-6 lg:px-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              LTV Meta Ads
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Lifetime Value dos leads. Visão isolada por cliente.
            </p>
          </div>

          {/* Client Selector */}
          <div className="w-full sm:w-64">
            {clients.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum cliente cadastrado.</p>
            ) : (
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.client_label || c.id.substring(0, 8)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Webhook URLs Box */}
        {selectedClientId && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-primary" />
                Webhooks de Integração do Cliente Selecionado
              </CardTitle>
              <CardDescription>
                Cole estas URLs nas automações exclusivas deste cliente no seu ActiveCampaign ou Hotmart.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">URL de Cadastro</p>
                <code className="block text-xs bg-background rounded border border-border px-3 py-2 break-all select-all text-foreground">
                  {projectUrl}/webhook-cadastro?client_id={selectedClientId}
                </code>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">URL de Compras/LTV</p>
                <code className="block text-xs bg-background rounded border border-border px-3 py-2 break-all select-all text-foreground">
                  {projectUrl}/webhook-pagamento?client_id={selectedClientId}
                </code>
              </div>
            </CardContent>
          </Card>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Leads</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl sm:text-3xl font-bold">{loading ? "..." : totalLeads}</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm bg-primary/5 border-primary/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-primary">LTV Médio</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl sm:text-3xl font-bold text-primary">
                {loading ? "..." : formatCurrency(ltvMedio)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Leads Table */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Detalhamento de Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">E-mail</TableHead>
                    <TableHead className="font-semibold">Campanha</TableHead>
                    <TableHead className="font-semibold">Data</TableHead>
                    <TableHead className="font-semibold text-right">LTV Atual</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center h-32 text-muted-foreground">
                        Carregando dados...
                      </TableCell>
                    </TableRow>
                  ) : leads.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center h-32 text-muted-foreground">
                        Nenhum lead com origem Meta Ads para este cliente.
                      </TableCell>
                    </TableRow>
                  ) : (
                    leads.map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell className="font-medium">{lead.email}</TableCell>
                        <TableCell className="text-muted-foreground">{lead.utm_campaign || "-"}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {lead.data_cadastro
                            ? format(new Date(lead.data_cadastro), "dd/MM/yyyy", { locale: ptBR })
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">
                          {formatCurrency(parseFloat(String(lead.ltv_total)) || 0)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
