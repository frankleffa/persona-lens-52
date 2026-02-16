import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Building2,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  AlertTriangle,
  Target,
  Eye,
} from "lucide-react";
import { useAgencyControl, type ClientStatus, type Trend } from "@/hooks/useAgencyControl";
import type { PresetRange } from "@/lib/periodUtils";

const STATUS_CONFIG: Record<ClientStatus, { label: string; className: string }> = {
  CRITICAL: { label: "Critical", className: "bg-destructive/15 text-destructive border-destructive/30" },
  ATTENTION: { label: "Attention", className: "bg-[hsl(var(--chart-amber))]/15 text-[hsl(var(--chart-amber))] border-[hsl(var(--chart-amber))]/30" },
  STABLE: { label: "Stable", className: "bg-[hsl(var(--chart-blue))]/15 text-[hsl(var(--chart-blue))] border-[hsl(var(--chart-blue))]/30" },
  GROWING: { label: "Growing", className: "bg-accent/15 text-accent border-accent/30" },
};

function TrendIcon({ trend }: { trend: Trend }) {
  if (trend === "up") return <TrendingUp className="h-4 w-4 text-accent" />;
  if (trend === "down") return <TrendingDown className="h-4 w-4 text-destructive" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 80 ? "bg-accent" :
    score >= 60 ? "bg-[hsl(var(--chart-blue))]" :
    score >= 40 ? "bg-[hsl(var(--chart-amber))]" :
    "bg-destructive";

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-16 rounded-full bg-muted">
        <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-sm font-semibold text-foreground">{score}</span>
    </div>
  );
}

export default function AgencyControlCenter() {
  const navigate = useNavigate();
  const [selectedRange, setSelectedRange] = useState<PresetRange>("LAST_30_DAYS");
  const { data, loading, error } = useAgencyControl(selectedRange);

  return (
    <div className="min-h-screen bg-background">
      <div className="pt-20 lg:pt-8 lg:ml-64 p-4 sm:p-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 lg:mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">Agency Control Center</h1>
              <p className="text-sm text-muted-foreground">Visão executiva da performance dos clientes</p>
            </div>
          </div>

          <Select value={selectedRange} onValueChange={(v) => setSelectedRange(v as PresetRange)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LAST_7_DAYS">Últimos 7 dias</SelectItem>
              <SelectItem value="LAST_14_DAYS">Últimos 14 dias</SelectItem>
              <SelectItem value="LAST_30_DAYS">Últimos 30 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* KPI Cards */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="card-executive p-8 text-center">
            <AlertTriangle className="h-8 w-8 mx-auto text-destructive mb-3" />
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        ) : data ? (
          <>
            <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up">
              {/* Total Clients */}
              <div className="card-executive p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <Users className="h-4 w-4" />
                  </div>
                  <span className="kpi-label">Total Clientes</span>
                </div>
                <p className="text-3xl font-extrabold tracking-tight text-foreground">{data.totalClients}</p>
              </div>

              {/* By Status */}
              <div className="card-executive p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accent">
                    <Target className="h-4 w-4" />
                  </div>
                  <span className="kpi-label">Por Status</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.entries(data.statusCounts) as [ClientStatus, number][])
                    .filter(([, count]) => count > 0)
                    .map(([status, count]) => (
                      <Badge key={status} variant="outline" className={`text-[10px] ${STATUS_CONFIG[status].className}`}>
                        {count} {STATUS_CONFIG[status].label}
                      </Badge>
                    ))}
                  {data.totalClients === 0 && (
                    <span className="text-xs text-muted-foreground">Nenhum</span>
                  )}
                </div>
              </div>

              {/* Average Score */}
              <div className="card-executive p-5 sm:col-span-2 lg:col-span-2">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(var(--chart-purple))]/15 text-[hsl(var(--chart-purple))]">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <span className="kpi-label">Score Médio</span>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-3xl font-extrabold tracking-tight text-foreground">{data.averageScore}</p>
                  <div className="h-3 flex-1 rounded-full bg-muted">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        data.averageScore >= 80 ? "bg-accent" :
                        data.averageScore >= 60 ? "bg-[hsl(var(--chart-blue))]" :
                        data.averageScore >= 40 ? "bg-[hsl(var(--chart-amber))]" :
                        "bg-destructive"
                      }`}
                      style={{ width: `${data.averageScore}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Client Table */}
            <div className="card-executive overflow-hidden animate-slide-up" style={{ animationDelay: "100ms" }}>
              {data.clients.length === 0 ? (
                <div className="p-12 text-center">
                  <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">Nenhum cliente encontrado</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cliente</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Strategy Type</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Score</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Prioridade</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tendência</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recomendação</TableHead>
                        <TableHead className="w-[80px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.clients.map((client) => (
                        <TableRow key={client.id} className="border-border">
                          <TableCell className="font-medium text-foreground">{client.name}</TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">{client.strategyType}</span>
                          </TableCell>
                          <TableCell>
                            <ScoreBar score={client.score} />
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[11px] ${STATUS_CONFIG[client.status].className}`}>
                              {STATUS_CONFIG[client.status].label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className={`text-sm font-medium ${
                              client.priority === "Alta" ? "text-destructive" :
                              client.priority === "Média" ? "text-[hsl(var(--chart-amber))]" :
                              "text-muted-foreground"
                            }`}>
                              {client.priority}
                            </span>
                          </TableCell>
                          <TableCell>
                            <TrendIcon trend={client.trend} />
                          </TableCell>
                          <TableCell>
                            <p className="text-xs text-muted-foreground max-w-[200px] truncate" title={client.recommendation}>
                              {client.recommendation}
                            </p>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="gap-1.5 text-xs"
                              onClick={() => navigate(`/preview?client=${client.client_user_id}`)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Ver
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
