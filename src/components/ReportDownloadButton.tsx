import { useState } from "react";
import { FileSpreadsheet, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ReportDownloadButtonProps {
  clientId: string;
  clientName?: string;
}

export default function ReportDownloadButton({ clientId, clientName }: ReportDownloadButtonProps) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const currentMonth = new Date().toISOString().slice(0, 7);
  const prevMonth = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 7);
  })();

  const monthLabel = (m: string) => {
    const [y, mo] = m.split("-").map(Number);
    const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
    return `${months[mo - 1]} ${y}`;
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  const handleDownload = async (params: { month?: string; date?: string }) => {
    setLoading(true);
    setOpen(false);
    try {
      const { data, error } = await supabase.functions.invoke("generate-client-report-xlsx", {
        body: { client_id: clientId, ...params },
      });

      if (error) throw error;

      // data comes as ArrayBuffer from edge function
      const blob = new Blob([data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const label = params.date || params.month || currentMonth;
      a.download = `relatorio_${(clientName || "cliente").replace(/\s+/g, "_")}_${label}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Relatório baixado com sucesso!");
    } catch (e: any) {
      console.error("Download error:", e);
      toast.error("Erro ao gerar relatório: " + (e.message || "Tente novamente"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={loading}
          className="gap-2 text-xs"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileSpreadsheet className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">{loading ? "Gerando..." : "Relatório XLSX"}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="end">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">Período</p>
        <div className="flex flex-col gap-1">
          <button
            onClick={() => handleDownload({ date: todayStr })}
            className="rounded-lg px-3 py-2 text-xs font-medium text-left text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <Download className="h-3 w-3 inline mr-2" />
            Hoje ({new Date().toLocaleDateString("pt-BR")})
          </button>
          <button
            onClick={() => handleDownload({ month: currentMonth })}
            className="rounded-lg px-3 py-2 text-xs font-medium text-left text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <Download className="h-3 w-3 inline mr-2" />
            {monthLabel(currentMonth)} (mês atual)
          </button>
          <button
            onClick={() => handleDownload({ month: prevMonth })}
            className="rounded-lg px-3 py-2 text-xs font-medium text-left text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <Download className="h-3 w-3 inline mr-2" />
            {monthLabel(prevMonth)} (mês anterior)
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
