import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Loader2, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ReportPreviewData {
  clientName: string;
  periodLabel: string;
  startDate: string;
  endDate: string;
  rows: any[][];
  rowStyles: { row: number; style: string }[];
  grandTotal: number;
}

interface ReportPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ReportPreviewData | null;
  loading: boolean;
  onDownload: () => void;
  downloading: boolean;
}

const styleMap: Record<string, string> = {
  title: "bg-[#1B2A4A] text-white font-bold text-base",
  subtitle: "bg-[#1B2A4A] text-slate-300 text-xs",
  platformHeader: "bg-blue-600 text-white font-bold text-sm",
  columnHeader: "bg-gray-700 text-white font-semibold text-[11px]",
  data: "text-gray-800 text-[11px] border-b border-gray-200",
  total: "bg-amber-200 text-gray-900 font-bold text-[11px]",
  summaryHeader: "bg-orange-500 text-white font-bold text-sm",
  summaryColumnHeader: "bg-gray-700 text-white font-semibold text-[11px]",
  summaryData: "text-gray-800 text-[11px] border-b border-gray-200",
  grandTotal: "bg-amber-500 text-white font-bold text-sm",
};

const mergedStyles = new Set(["title", "subtitle", "platformHeader", "summaryHeader", "grandTotal"]);

export default function ReportPreviewDialog({
  open,
  onOpenChange,
  data,
  loading,
  onDownload,
  downloading,
}: ReportPreviewDialogProps) {
  const COLS = 8;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b flex-row items-center justify-between">
          <DialogTitle className="text-base font-semibold">
            Preview do Relatório
          </DialogTitle>
          <Button
            size="sm"
            onClick={onDownload}
            disabled={downloading || loading || !data}
            className="gap-2"
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {downloading ? "Baixando..." : "Baixar XLSX"}
          </Button>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[calc(85vh-80px)]">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-3 text-muted-foreground text-sm">Carregando dados...</span>
            </div>
          )}

          {!loading && !data && (
            <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
              Nenhum dado disponível.
            </div>
          )}

          {!loading && data && (
            <div className="p-4">
              <table className="w-full border-collapse text-sm">
                <tbody>
                  {data.rows.map((row, rowIdx) => {
                    const rs = data.rowStyles.find((r) => r.row === rowIdx);
                    const style = rs?.style || "";
                    const cls = styleMap[style] || "";
                    const isMerged = mergedStyles.has(style);
                    const isEmpty = row.every((c) => c === "" || c === null || c === undefined);

                    if (isEmpty && !style) {
                      return (
                        <tr key={rowIdx}>
                          <td colSpan={COLS} className="h-3" />
                        </tr>
                      );
                    }

                    if (isMerged) {
                      return (
                        <tr key={rowIdx}>
                          <td
                            colSpan={COLS}
                            className={`px-3 py-2 ${cls}`}
                          >
                            {row[0]}
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={rowIdx} className={cls}>
                        {row.slice(0, COLS).map((cell, colIdx) => (
                          <td
                            key={colIdx}
                            className={`px-2 py-1.5 ${
                              colIdx === 0 ? "text-left" : "text-right"
                            } ${style === "total" && colIdx === 0 ? "font-bold" : ""}`}
                          >
                            {typeof cell === "number"
                              ? colIdx === 1 || colIdx === 4 || colIdx === 7
                                ? `R$ ${cell.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                                : colIdx === 5
                                ? `${cell.toFixed(2)}%`
                                : cell.toLocaleString("pt-BR")
                              : cell}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
