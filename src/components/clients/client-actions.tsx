"use client";

import { FileBarChart, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ClientActions() {
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => toast("Relatório — em breve")}>
        <FileBarChart />
        Relatório
      </Button>
      <Button size="sm" onClick={() => toast("Otimização com IA — em breve")}>
        <Sparkles />
        Otimizar com IA
      </Button>
    </div>
  );
}
