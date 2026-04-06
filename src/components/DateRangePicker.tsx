import { useState, useEffect } from "react";
import { format, subDays, startOfDay, isAfter, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";
import type { DateRangeOption } from "@/lib/date-utils";

interface DateRangePickerProps {
  value: DateRangeOption;
  onChange: (value: DateRangeOption) => void;
}

const yesterday = () => subDays(startOfDay(new Date()), 1);

const PRESETS: { label: string; value: DateRangeOption }[] = [
  { label: "Hoje", value: "TODAY" },
  { label: "Ontem", value: { startDate: format(yesterday(), "yyyy-MM-dd"), endDate: format(yesterday(), "yyyy-MM-dd") } },
  { label: "Ontem e Hoje", value: "LAST_2_DAYS" },
  { label: "7 dias", value: "LAST_7_DAYS" },
  { label: "14 dias", value: "LAST_14_DAYS" },
  { label: "30 dias", value: "LAST_30_DAYS" },
];

function dateRangeOptionToDates(value: DateRangeOption): DateRange {
  const today = startOfDay(new Date());
  if (typeof value === "object") {
    return { from: new Date(value.startDate + "T00:00:00"), to: new Date(value.endDate + "T00:00:00") };
  }
  switch (value) {
    case "TODAY":
      return { from: today, to: today };
    case "LAST_2_DAYS":
      return { from: subDays(today, 1), to: today };
    case "LAST_7_DAYS":
      return { from: subDays(today, 7), to: today };
    case "LAST_14_DAYS":
      return { from: subDays(today, 14), to: today };
    case "LAST_30_DAYS":
      return { from: subDays(today, 30), to: today };
  }
}

function formatLabel(range: DateRange | undefined): string {
  if (!range?.from) return "Selecione o período";
  if (!range.to || isSameDay(range.from, range.to)) {
    if (isSameDay(range.from, new Date())) return "Hoje";
    return format(range.from, "dd MMM", { locale: ptBR });
  }
  return `${format(range.from, "dd MMM", { locale: ptBR })} - ${format(range.to, "dd MMM", { locale: ptBR })}`;
}

function formatRangePreview(range: DateRange | undefined): string | null {
  if (!range?.from) return null;
  const from = format(range.from, "dd 'de' MMMM", { locale: ptBR });
  if (!range.to) return `${from} (dia único — ou clique outra data para intervalo)`;
  if (isSameDay(range.from, range.to)) return from;
  const to = format(range.to, "dd 'de' MMMM", { locale: ptBR });
  return `${from} → ${to}`;
}

export default function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<DateRange | undefined>(() => dateRangeOptionToDates(value));
  const isMobile = useIsMobile();

  useEffect(() => {
    setSelected(dateRangeOptionToDates(value));
  }, [value]);

  const handlePreset = (preset: DateRangeOption) => {
    const dates = dateRangeOptionToDates(preset);
    setSelected(dates);
    onChange(preset);
    setOpen(false);
  };

  const handleApply = () => {
    if (!selected?.from) return;
    const from = selected.from;
    const to = selected.to || from;

    const today = startOfDay(new Date());
    if (isSameDay(from, today) && isSameDay(to, today)) {
      onChange("TODAY");
    } else if (isSameDay(from, subDays(today, 1)) && isSameDay(to, today)) {
      onChange("LAST_2_DAYS");
    } else if (isSameDay(from, subDays(today, 7)) && isSameDay(to, today)) {
      onChange("LAST_7_DAYS");
    } else if (isSameDay(from, subDays(today, 14)) && isSameDay(to, today)) {
      onChange("LAST_14_DAYS");
    } else if (isSameDay(from, subDays(today, 30)) && isSameDay(to, today)) {
      onChange("LAST_30_DAYS");
    } else {
      onChange({
        startDate: format(from, "yyyy-MM-dd"),
        endDate: format(to, "yyyy-MM-dd"),
      });
    }
    setOpen(false);
  };

  const today = startOfDay(new Date());
  const rangePreview = formatRangePreview(selected);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-mono font-medium text-[11px] h-9 gap-2 border-[var(--border2)] rounded-lg",
            !selected && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0" />
          <span className="truncate">{formatLabel(selected)}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end" sideOffset={8}>
        <div className="flex flex-col sm:flex-row">
          {/* Presets sidebar */}
          <div className="flex sm:flex-col gap-1 p-3 sm:p-4 border-b sm:border-b-0 sm:border-r border-border sm:min-w-[130px]">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 hidden sm:block">Atalhos</p>
            {PRESETS.map((p) => (
              <button
                key={typeof p.value === "string" ? p.value : "custom"}
                onClick={() => handlePreset(p.value)}
                className={cn(
                  "rounded-lg px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap text-left",
                  JSON.stringify(value) === JSON.stringify(p.value)
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          {/* Calendar */}
          <div className="p-3 sm:p-4">
            <Calendar
              mode="range"
              selected={selected}
              onSelect={setSelected}
              numberOfMonths={isMobile ? 1 : 2}
              disabled={(date) => isAfter(startOfDay(date), today)}
              className="pointer-events-auto"
              locale={ptBR}
            />
            <div className="flex items-center justify-between pt-3 border-t border-border mt-3 gap-3">
              {rangePreview ? (
                <span className="text-xs text-muted-foreground truncate">{rangePreview}</span>
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
