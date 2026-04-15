import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { GA4UTMEntry, GA4UTMEventEntry } from "@/hooks/useAdsData";

interface GA4UTMTableProps {
  data: GA4UTMEntry[];
  events?: GA4UTMEventEntry[];
}

function formatNumber(n: number): string {
  return n.toLocaleString("pt-BR");
}

const EVENT_LABELS: Record<string, string> = {
  purchase: "Compra",
  generate_lead: "Lead",
  sign_up: "Cadastro",
  begin_checkout: "Início Checkout",
  complete_registration: "Cadastro Completo",
  add_to_cart: "Add ao Carrinho",
  first_open: "Primeiro Acesso",
  submit_lead_form: "Formulário Lead",
};

export default function GA4UTMTable({ data, events }: GA4UTMTableProps) {
  const [eventsOpen, setEventsOpen] = useState(true);
  const hasUtm = data && data.length > 0;
  const hasEvents = events && events.length > 0;

  if (!hasUtm && !hasEvents) return null;

  return (
    <div className="animate-slide-up space-y-6">
      {/* UTM Breakdown Table */}
      {hasUtm && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-chart-amber bg-chart-amber/15">
              U
            </div>
            <h3 className="text-lg font-semibold text-foreground">UTMs — Google Analytics 4</h3>
          </div>

          <div className="card-executive overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/50">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Source</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Medium</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Campaign</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Sessões</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Usuários</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Conversões</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row, i) => (
                    <TableRow key={`${row.source}-${row.medium}-${row.campaign}-${i}`} className="border-b border-border/30">
                      <TableCell className="font-medium text-foreground">{row.source}</TableCell>
                      <TableCell className="text-muted-foreground">{row.medium}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate" title={row.campaign}>{row.campaign}</TableCell>
                      <TableCell className="text-right font-semibold text-foreground">{formatNumber(row.sessions)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{formatNumber(row.users)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{formatNumber(row.conversions)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {/* Conversion Events by UTM */}
      {hasEvents && (
        <div className="space-y-4">
          <button
            onClick={() => setEventsOpen(!eventsOpen)}
            className="flex items-center gap-3 w-full text-left group"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-chart-positive bg-chart-positive/15">
              E
            </div>
            <h3 className="text-lg font-semibold text-foreground group-hover:text-chart-amber transition-colors">
              Conversões por UTM — GA4
            </h3>
            {eventsOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {eventsOpen && (
            <div className="card-executive overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border/50">
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Source</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Medium</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Campaign</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Evento</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Quantidade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((row, i) => (
                      <TableRow key={`${row.source}-${row.medium}-${row.campaign}-${row.event_name}-${i}`} className="border-b border-border/30">
                        <TableCell className="font-medium text-foreground">{row.source}</TableCell>
                        <TableCell className="text-muted-foreground">{row.medium}</TableCell>
                        <TableCell className="text-muted-foreground max-w-[200px] truncate" title={row.campaign}>{row.campaign}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-chart-positive/10 text-chart-positive">
                            {EVENT_LABELS[row.event_name] || row.event_name}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-foreground">{formatNumber(row.count)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
