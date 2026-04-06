import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, TrendingUp } from "lucide-react";

function formatBRL(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return "R$ 0,00";
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  return `${local.slice(0, 3)}***@${domain}`;
}

interface Lead {
  id: string;
  email: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  ltv_total: number;
  data_cadastro: string;
}

export default function LtvMetaAds() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeads() {
      setLoading(true);
      const { data, error } = await supabase
        .from("leads" as any)
        .select("*")
        .in("utm_source", ["facebook", "instagram", "fb", "ig", "meta"]);

      if (!error && data) {
        setLeads(data as unknown as Lead[]);
      }
      setLoading(false);
    }
    fetchLeads();
  }, []);

  const totalLeads = leads.length;
  const ltvMedio = useMemo(() => {
    if (totalLeads === 0) return 0;
    const soma = leads.reduce((acc, l) => acc + (Number(l.ltv_total) || 0), 0);
    return soma / totalLeads;
  }, [leads, totalLeads]);

  return (
    <div className="px-4 py-6 sm:px-6 md:px-8 space-y-6 md:space-y-8 animate-in fade-in duration-500 w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          LTV — Leads Meta Ads
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Lifetime Value dos leads adquiridos via Facebook / Instagram Ads
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl sm:text-3xl font-bold">{totalLeads}</div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm bg-primary/5 border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">LTV Médio</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <div className="text-2xl sm:text-3xl font-bold text-primary">
                {formatBRL(ltvMedio)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Leads Table */}
      <Card className="shadow-sm">
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="text-base sm:text-lg">Detalhamento de Leads</CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold whitespace-nowrap">E-mail</TableHead>
                  <TableHead className="font-semibold whitespace-nowrap">Campanha</TableHead>
                  <TableHead className="font-semibold whitespace-nowrap hidden sm:table-cell">Data</TableHead>
                  <TableHead className="font-semibold text-right whitespace-nowrap">LTV Atual</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center h-32 text-muted-foreground">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary" />
                        <p>Carregando dados...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : leads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center h-32 text-muted-foreground">
                      Nenhum lead encontrado com origem Meta Ads.
                    </TableCell>
                  </TableRow>
                ) : (
                  leads.map((lead) => (
                    <TableRow key={lead.id} className="transition-colors hover:bg-muted/50">
                      <TableCell className="font-medium text-sm">{maskEmail(lead.email)}</TableCell>
                      <TableCell>
                        {lead.utm_campaign ? (
                          <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold bg-accent text-accent-foreground max-w-[140px] truncate">
                            {lead.utm_campaign}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden sm:table-cell">
                        {lead.data_cadastro
                          ? new Date(lead.data_cadastro).toLocaleDateString("pt-BR")
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold whitespace-nowrap text-chart-positive">
                        {formatBRL(Number(lead.ltv_total))}
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
  );
}
