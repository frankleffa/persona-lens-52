import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export const ALL_KPI_OPTIONS = [
  { key: "spend", label: "Investimento" },
  { key: "revenue", label: "Receita" },
  { key: "roas", label: "ROAS" },
  { key: "conversions", label: "Conversões" },
  { key: "clicks", label: "Cliques" },
  { key: "impressions", label: "Impressões" },
  { key: "cpa", label: "CPA" },
] as const;

export const ALL_COLUMN_OPTIONS = [
  { key: "spend", label: "Investimento" },
  { key: "revenue", label: "Receita" },
  { key: "conversions", label: "Conversões" },
  { key: "clicks", label: "Cliques" },
  { key: "impressions", label: "Impressões" },
  { key: "cpa", label: "CPA" },
] as const;

export const DEFAULT_KPIS = ALL_KPI_OPTIONS.map((o) => o.key);
export const DEFAULT_COLUMNS = ALL_COLUMN_OPTIONS.map((o) => o.key);

interface Props {
  selectedKpis: string[];
  selectedColumns: string[];
  onKpisChange: (kpis: string[]) => void;
  onColumnsChange: (columns: string[]) => void;
}

function toggle(arr: string[], key: string): string[] {
  return arr.includes(key) ? arr.filter((k) => k !== key) : [...arr, key];
}

export default function ReportMetricsSelector({ selectedKpis, selectedColumns, onKpisChange, onColumnsChange }: Props) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4 text-primary" />
          Métricas do Relatório
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* KPI Cards */}
        <div>
          <p className="text-sm font-medium mb-3">Cards de KPI (topo do relatório)</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {ALL_KPI_OPTIONS.map((opt) => (
              <label key={opt.key} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={selectedKpis.includes(opt.key)}
                  onCheckedChange={() => onKpisChange(toggle(selectedKpis, opt.key))}
                />
                <Label className="cursor-pointer font-normal">{opt.label}</Label>
              </label>
            ))}
          </div>
        </div>

        {/* Campaign Table Columns */}
        <div>
          <p className="text-sm font-medium mb-3">Colunas da Tabela de Campanhas</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {ALL_COLUMN_OPTIONS.map((opt) => (
              <label key={opt.key} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={selectedColumns.includes(opt.key)}
                  onCheckedChange={() => onColumnsChange(toggle(selectedColumns, opt.key))}
                />
                <Label className="cursor-pointer font-normal">{opt.label}</Label>
              </label>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
