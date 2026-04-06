import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { METRIC_DEFINITIONS } from "@/lib/types";

interface MetricInfoTooltipProps {
  metricKey: string;
}

export default function MetricInfoTooltip({ metricKey }: MetricInfoTooltipProps) {
  const definition = METRIC_DEFINITIONS.find((d) => d.key === metricKey);
  if (!definition) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex cursor-help">
            <Info className="h-3.5 w-3.5 text-muted-foreground/60 hover:text-muted-foreground transition-colors" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px] text-xs leading-relaxed">
          <p className="font-semibold text-foreground">Fonte: {definition.module}</p>
          <p className="text-muted-foreground mt-0.5">{definition.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
