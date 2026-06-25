"use client";

import { MessageCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { sends, sendStatusMeta } from "./data";

export function SendsHistory() {
  return (
    <Card className="p-0">
      <div className="overflow-x-auto scroll-slim">
        <table className="w-full min-w-[680px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              {["Cliente", "Canal", "Quando", "Status", ""].map((h, i) => (
                <th key={h + i} className="eyebrow px-4 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sends.map((s) => {
              const m = sendStatusMeta[s.status];
              return (
                <tr key={s.id} className="border-b border-border/60 transition-colors hover:bg-surface-2/40">
                  <td className="px-4 py-3 font-medium text-foreground">{s.client}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <MessageCircle className="size-4 text-success" />
                      {s.channel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{s.at}</td>
                  <td className="px-4 py-3"><Badge variant={m.variant} dot>{m.label}</Badge></td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => toast.success(`Reenviado para ${s.client}.`)}
                      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
                    >
                      <RefreshCw className="size-3.5" />
                      Reenviar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
