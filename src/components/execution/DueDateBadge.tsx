import { CalendarClock } from "lucide-react";
import { differenceInDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DueDateBadgeProps {
  dueDate: string; // ISO date string
  compact?: boolean;
}

export function DueDateBadge({ dueDate, compact }: DueDateBadgeProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = parseISO(dueDate);
  due.setHours(0, 0, 0, 0);
  const diff = differenceInDays(due, today);

  let color: string;
  let bg: string;
  let border: string;

  if (diff < 0) {
    // Overdue
    color = "hsl(var(--destructive))";
    bg = "hsl(var(--destructive) / 0.12)";
    border = "hsl(var(--destructive) / 0.25)";
  } else if (diff <= 1) {
    // Due today or tomorrow
    color = "#f59e0b";
    bg = "rgba(245,158,11,0.12)";
    border = "rgba(245,158,11,0.25)";
  } else {
    // On time
    color = "var(--pos)";
    bg = "rgba(74,222,128,0.1)";
    border = "rgba(74,222,128,0.2)";
  }

  const label = compact
    ? format(due, "dd MMM", { locale: ptBR })
    : diff < 0
      ? `Atrasado ${Math.abs(diff)}d`
      : diff === 0
        ? "Hoje"
        : diff === 1
          ? "Amanhã"
          : format(due, "dd MMM", { locale: ptBR });

  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-px whitespace-nowrap"
      style={{
        color,
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 4,
        fontFamily: "var(--font-mono)",
      }}
      title={`Prazo: ${format(due, "dd/MM/yyyy")}`}
    >
      <CalendarClock className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}
