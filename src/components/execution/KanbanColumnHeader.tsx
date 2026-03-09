import { ChevronDown, ChevronRight } from "lucide-react";
import type { CampaignStatus } from "@/lib/execution-types";
import { COLUMN_CONFIG } from "@/lib/execution-types";

interface KanbanColumnHeaderProps {
  status: CampaignStatus;
  count: number;
  doneCount: number;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function KanbanColumnHeader({ status, count, doneCount, collapsed, onToggleCollapse }: KanbanColumnHeaderProps) {
  const config = COLUMN_CONFIG[status];
  const progress = count > 0 ? Math.round((doneCount / count) * 100) : 0;

  return (
    <div
      className="flex-shrink-0 px-4 pt-3 pb-2 flex items-center gap-2 relative group/header cursor-pointer select-none"
      style={{ borderBottom: "1px solid var(--border)" }}
      onClick={onToggleCollapse}
    >
      {/* Hover accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover/header:opacity-100"
        style={{ background: "var(--accent)", transition: "opacity 0.15s ease" }}
      />

      {collapsed ? (
        <ChevronRight className="h-3 w-3" style={{ color: "var(--muted)" }} />
      ) : (
        <ChevronDown className="h-3 w-3" style={{ color: "var(--muted)" }} />
      )}

      <span
        className="text-[11px] font-bold uppercase tracking-[0.08em]"
        style={{ fontFamily: "var(--font-sans)", color: "var(--muted)" }}
      >
        {config.label}
      </span>

      <span
        className="text-[10px] px-1.5 py-[1px]"
        style={{
          fontFamily: "var(--font-mono)",
          background: "var(--surface2)",
          border: "1px solid var(--border2)",
          color: "var(--muted)",
          borderRadius: 4,
        }}
      >
        {count}
      </span>

      {/* Progress indicator */}
      {count > 0 && status !== "FINALIZADO" && (
        <div className="flex-1 flex items-center gap-1.5 ml-auto">
          <div
            className="flex-1 h-[3px] rounded-full overflow-hidden"
            style={{ background: "var(--surface2)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${progress}%`,
                background: progress === 100 ? "var(--pos)" : "var(--accent)",
              }}
            />
          </div>
          <span
            className="text-[9px] tabular-nums"
            style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}
          >
            {doneCount}/{count}
          </span>
        </div>
      )}
    </div>
  );
}
