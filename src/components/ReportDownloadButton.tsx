import { useState } from "react";
import { FileSpreadsheet, Download, Loader2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReportPreviewDialog from "./ReportPreviewDialog";

interface ReportDownloadButtonProps {
  clientId: string;
  clientName?: string;
}

export default function ReportDownloadButton({ clientId, clientName }: ReportDownloadButtonProps) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [pendingParams, setPendingParams] = useState<{ month?: string; date?: string } | null>(null);
  const [downloading, setDownloading] = useState(false);

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

  const getHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    return {
      supabaseUrl,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token || anonKey}`,
        "apikey": anonKey,
      },
    };
  };

  const handlePreview = async (params: { month?: string; date?: string }) => {
    setOpen(false);
    setPendingParams(params);
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewData(null);

    try {
      const { supabaseUrl, headers } = await getHeaders();
      const response = await fetch(`${supabaseUrl}/functions/v1/generate-client-report-xlsx`, {
        method: "POST",
        headers,
        body: JSON.stringify({ client_id: clientId, ...params, preview: true }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || response.statusText);
      }

      const json = await response.json();
      setPreviewData(json);
    } catch (e: any) {
      console.error("Preview error:", e);
      toast.error("Erro ao carregar preview: " + (e.message || "Tente novamente"));
      setPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!pendingParams) return;
    setDownloading(true);
    try {
      const { supabaseUrl, headers } = await getHeaders();
      const response = await fetch(`${supabaseUrl}/functions/v1/generate-client-report-xlsx`, {
        method: "POST",
        headers,
        body: JSON.stringify({ client_id: clientId, ...pendingParams }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || response.statusText);
      }

      const arrayBuffer = await response.arrayBuffer();
      const blob = new Blob([arrayBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const label = pendingParams.date || pendingParams.month || currentMonth;
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
      setDownloading(false);
    }
  };

  return (
    <>
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
              onClick={() => handlePreview({ date: todayStr })}
              className="rounded-lg px-3 py-2 text-xs font-medium text-left text-muted-foreground hover:bg-accent hover:text-foreground transition-colors flex items-center gap-2"
            >
              <Eye className="h-3 w-3" />
              Hoje ({new Date().toLocaleDateString("pt-BR")})
            </button>
            <button
              onClick={() => handlePreview({ month: currentMonth })}
              className="rounded-lg px-3 py-2 text-xs font-medium text-left text-muted-foreground hover:bg-accent hover:text-foreground transition-colors flex items-center gap-2"
            >
              <Eye className="h-3 w-3" />
              {monthLabel(currentMonth)} (mês atual)
            </button>
            <button
              onClick={() => handlePreview({ month: prevMonth })}
              className="rounded-lg px-3 py-2 text-xs font-medium text-left text-muted-foreground hover:bg-accent hover:text-foreground transition-colors flex items-center gap-2"
            >
              <Eye className="h-3 w-3" />
              {monthLabel(prevMonth)} (mês anterior)
            </button>
          </div>
        </PopoverContent>
      </Popover>

      <ReportPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        data={previewData}
        loading={previewLoading}
        onDownload={handleDownload}
        downloading={downloading}
      />
    </>
  );
}
