import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Users, DollarSign } from "lucide-react";

export default function LtvMetaAds() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeads() {
      // 1. A Consulta de Dados (Fetch/Query)
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .in("utm_source", ["facebook", "instagram", "fb", "ig", "meta"])
        .order("data_cadastro", { ascending: false });

      if (!error && data) {
        setLeads(data);
      } else if (error) {
        console.error("Erro ao buscar leads:", error);
      }
      setLoading(false);
    }
    
    fetchLeads();
  }, []);

  // 2. Matemática para os Cards de Resumo
  const totalLeads = leads.length;
  const rawLtv = leads.reduce((acc, lead) => acc + (parseFloat(lead.ltv_total) || 0), 0);
  const ltvMedio = totalLeads > 0 ? rawLtv / totalLeads : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">LTV Meta Ads</h1>
        <p className="text-muted-foreground w-full max-w-2xl">
          Acompanhe o retorno sobre investimento médio dos leads originários exclusivamente de campanhas da Meta.
        </p>
      </div>

      {/* 2. Cards de Resumo */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Leads (Meta Ads)</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{loading ? "..." : totalLeads}</div>
            <p className="text-xs text-muted-foreground mt-1">Leads retornados no filtro atual</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm bg-primary/5 border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">LTV Médio (Meta Ads)</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{loading ? "..." : formatCurrency(ltvMedio)}</div>
            <p className="text-xs text-primary/70 mt-1">Receita média por contato na base</p>
          </CardContent>
        </Card>
      </div>

      {/* 3. Tabela de Detalhamento */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Detalhamento de Leads</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">E-mail</TableHead>
                  <TableHead className="font-semibold">Campanha</TableHead>
                  <TableHead className="font-semibold text-center">Data de Cadastro</TableHead>
                  <TableHead className="font-semibold text-right">LTV Atual</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center h-32 text-muted-foreground">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary"></div>
                        <p>Carregando dados em tempo real...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : leads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center h-32 text-muted-foreground">
                      Nenhum lead encontrado com origem no Meta Ads no momento.
                    </TableCell>
                  </TableRow>
                ) : (
                  leads.map((lead) => (
                    <TableRow key={lead.id} className="transition-colors hover:bg-muted/50 w-full group">
                      <TableCell className="font-medium">{lead.email}</TableCell>
                      <TableCell>
                        {lead.utm_campaign ? (
                          <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-accent text-accent-foreground">
                            {lead.utm_campaign}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {lead.data_cadastro ? format(new Date(lead.data_cadastro), "dd/MM/yyyy", { locale: ptBR }) : "-"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">
                        {formatCurrency(parseFloat(lead.ltv_total) || 0)}
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
