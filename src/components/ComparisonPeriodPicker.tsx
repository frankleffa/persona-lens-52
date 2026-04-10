import { useState, useEffect } from "react";
import { format, startOfDay, isAfter, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeftRight, CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { useIsMobile } from "@/hooks/use-mobile";
import type { ComparisonMode } from "@/lib/date-utils";

interface ComparisonPeriodPickerProps {
  value: ComparisonMode;
  onChange: (value: ComparisonMode) => void;
  autoLabel: string; // e.g. "01/03 – 07/03"
}

export default function ComparisonPeriodPicker({ value, onChange, autoLabel }: ComparisonPeriodPickerProps) {
  const isManual = value !== "auto";
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const [selected, setSelected] = useState<DateRange | undefined>(() => {
    if (isManual) {
      return {
        from: new Date(value.startDate + "T00:00:00"),
        to: new Date(value.endDate + "T00:00:00"),
      };
    }
    return undefined;
  });

  useEffect(() => {
    if (isManual) {
      setSelected({
        from: new Date(value.startDate + "T00:00:00"),
        to: new Date(value.endDate + "T00:00:00"),
      });
    }
  }, [value, isManual]);

  const handleToggle = (checked: boolean) => {
    if (!checked) {
      onChange("auto");
      setOpen(false);
    }
  };

  const handleApply = () => {
    if (!selected?.from) return;
    const from = selected.from;
    const to = selected.to || from;
    onChange({
      startDate: format(from, "yyyy-MM-dd"),
      endDate: format(to, "yyyy-MM-dd"),
    });
    setOpen(false);
  };

  const today = startOfDay(new Date());

  const displayLabel = isManual
    ? `vs ${format(new Date(value.startDate + "T00:00:00"), "dd/MM", { locale: ptBR })} – ${format(new Date(value.endDate + "T00:00:00"), "dd/MM", { locale: ptBR })}`
    : `vs ${autoLabel}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-9 gap-1.5 text-[11px] font-mono font-medium rounded-lg border border-transparent",
            isManual
              ? "text-primary border-primary/30 bg-primary/5 hover:bg-primary/10"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <ArrowLeftRight className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate max-w-[160px]">{displayLabel}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end" sideOffset={8}>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Período de comparação</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {isManual ? "Comparação manual ativa" : `Automático: ${autoLabel}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">Manual</span>
              <Switch
                checked={isManual}
                onCheckedChange={(checked) => {
                  if (!checked) handleToggle(false);
                }}
              />
            </div>
          </div>

          <div className="border-t border-border pt-3">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Selecione o período de comparação
            </p>
            <Calendar
              mode="range"
              selected={selected}
              onSelect={setSelected}
              numberOfMonths={isMobile ? 1 : 2}
              disabled={(date) => isAfter(startOfDay(date), today)}
              className="pointer-events-auto"
              locale={ptBR}
            />
            <div className="flex items-center justify-between pt-3 border-t border-border mt-3">
              {selected?.from ? (
                <span className="text-xs text-muted-foreground">
                  {format(selected.from, "dd/MM", { locale: ptBR })}
                  {selected.to && !isSameDay(selected.from, selected.to)
                    ? ` – ${format(selected.to, "dd/MM", { locale: ptBR })}`
                    : ""}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground italic">Selecione as datas</span>
              )}
              <Button size="sm" onClick={handleApply} disabled={!selected?.from} className="rounded-lg">
                Aplicar
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
