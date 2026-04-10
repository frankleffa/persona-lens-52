import { useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { ComparisonMode } from "@/lib/date-utils";

const OPTIONS: { value: ComparisonMode; label: string; shortLabel: string }[] = [
  { value: "auto", label: "Período anterior (automático)", shortLabel: "período anterior" },
  { value: "yesterday", label: "Ontem", shortLabel: "ontem" },
  { value: "7d", label: "Últimos 7 dias", shortLabel: "7d" },
  { value: "30d", label: "Últimos 30 dias", shortLabel: "30d" },
];

interface ComparisonPeriodPickerProps {
  value: ComparisonMode;
  onChange: (value: ComparisonMode) => void;
  autoLabel: string;
}

export default function ComparisonPeriodPicker({ value, onChange, autoLabel }: ComparisonPeriodPickerProps) {
  const [open, setOpen] = useState(false);

  const current = OPTIONS.find((o) => o.value === value) || OPTIONS[0];
  const displayLabel = `vs ${current.shortLabel}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-9 gap-1.5 text-[11px] font-mono font-medium rounded-lg border border-transparent",
            value !== "auto"
              ? "text-primary border-primary/30 bg-primary/5 hover:bg-primary/10"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <ArrowLeftRight className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{displayLabel}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-1" align="end" sideOffset={8}>
        <div className="flex flex-col">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1.5">
            Comparar com
          </p>
          {OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={cn(
                "text-left text-sm px-2 py-1.5 rounded-md transition-colors",
                value === opt.value
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-foreground hover:bg-muted"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
