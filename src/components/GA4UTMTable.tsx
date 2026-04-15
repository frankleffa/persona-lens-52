import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { GA4UTMEntry } from "@/hooks/useAdsData";

interface GA4UTMTableProps {
  data: GA4UTMEntry[];
}

function formatNumber(n: number): string {
  return n.toLocaleString("pt-BR");
}

export default function GA4UTMTable({ data }: GA4UTMTableProps) {
  if (!data || data.length === 0) return null;

  return (
    <div className="animate-slide-up space-y-4">
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
  );
}
