import { useState, useRef, useEffect, KeyboardEvent, forwardRef } from "react";
import { AlignLeft, Paperclip, MessageSquare, Sparkles } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DueDateBadge } from "@/components/execution/DueDateBadge";
import type { Campaign, CampaignStatus } from "@/lib/execution-types";

interface CampaignCardProps {
  campaign: Campaign;
  onClick: () => void;
  onUpdateName?: (id: string, name: string) => void;
  isDragging?: boolean;
  assigneeName?: string | null;
  commentCount?: number;
}

const STATUS_BADGE: Record<CampaignStatus, { bg: string; color: string; border: string; label: string }> = {
  PLANEJAMENTO: { bg: "rgba(240,236,230,0.06)", color: "var(--muted)", border: "1px solid var(--border2)", label: "Planejamento" },
  PRONTO: { bg: "rgba(59,130,246,0.1)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.25)", label: "Pronto" },
  VEICULACAO: { bg: "rgba(168,85,247,0.1)", color: "#a855f7", border: "1px solid rgba(168,85,247,0.25)", label: "Veiculação" },
  TESTE: { bg: "rgba(245,158,11,0.1)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.25)", label: "Em Teste" },
  FINALIZADO: { bg: "rgba(22,163,74,0.1)", color: "#4ADE80", border: "1px solid rgba(22,163,74,0.2)", label: "Finalizado" },
};

export const CampaignCard = forwardRef<HTMLDivElement, CampaignCardProps>(function CampaignCard({ campaign, onClick, onUpdateName, isDragging, assigneeName, commentCount = 0 }, ref) {
  const creativeCount = campaign.creatives.length;
  const checkedCount = campaign.checklist?.filter((c) => c.checked).length ?? 0;
  const totalCount = campaign.checklist?.length ?? 0;
  const checklistProgress = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(campaign.campaign_name);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
      autoResize(textareaRef.current);
    }
  }, [editing]);

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  };

  const commitEdit = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== campaign.campaign_name) {
      onUpdateName?.(campaign.id, trimmed);
    } else {
      setEditValue(campaign.campaign_name);
    }
    setEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") { e.preventDefault(); commitEdit(); }
    if (e.key === "Escape") { setEditValue(campaign.campaign_name); setEditing(false); }
  };

  const statusBadge = STATUS_BADGE[campaign.status];
  const initials = assigneeName
    ? assigneeName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : null;

  return (
    <div
      ref={ref}
      className="cursor-pointer group"
      onClick={() => { if (!editing) onClick(); }}
      style={{
        background: isDragging ? "var(--surface2)" : "var(--surface)",
        border: isDragging ? "1px solid var(--accent)" : "1px solid var(--border2)",
        borderRadius: 8,
        padding: "12px 14px",
        transition: "border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease",
      }}
      onMouseEnter={(e) => {
        if (!isDragging) {
          e.currentTarget.style.borderColor = "rgba(28,156,240,0.35)";
          e.currentTarget.style.background = "var(--surface2)";
          e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isDragging) {
          e.currentTarget.style.borderColor = "var(--border2)";
          e.currentTarget.style.background = "var(--surface)";
          e.currentTarget.style.boxShadow = "none";
        }
      }}
    >
      {/* Labels row */}
      {campaign.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {campaign.labels.map((label) => (
            <span
              key={label.id}
              className="inline-block h-2 min-w-[40px]"
              style={{ backgroundColor: label.color, borderRadius: 2 }}
              title={label.text}
            />
          ))}
        </div>
      )}

      {/* Title */}
      {editing ? (
        <textarea
          ref={textareaRef}
          value={editValue}
          onChange={(e) => { setEditValue(e.target.value); autoResize(e.target); }}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
          className="w-full bg-transparent border-none outline-none resize-none leading-snug p-0 m-0"
          style={{ fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600, color: "var(--text)" }}
          rows={1}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <div className="flex items-start gap-1.5" title={campaign.auto_generated ? "Gerado por IA" : undefined}>
          {campaign.auto_generated && (
            <Sparkles className="mt-0.5 h-3.5 w-3.5 text-blue-500 shrink-0" />
          )}
          <p
            className="select-none flex-1"
            style={{
              fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600, color: "var(--text)",
              marginBottom: campaign.description ? 4 : 8, lineHeight: 1.4,
            }}
            onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}
          >
            {campaign.campaign_name}
          </p>
        </div>
      )}

      {/* Description */}
      {campaign.description && (
        <p
          className="line-clamp-2"
          style={{
            fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 400,
            color: "var(--muted)", marginBottom: 8, lineHeight: 1.5,
          }}
        >
          {campaign.description}
        </p>
      )}

      {/* Checklist progress bar */}
      {totalCount > 0 && (
        <div className="mb-2">
          <div
            className="h-[3px] w-full rounded-full overflow-hidden"
            style={{ background: "var(--surface2)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${checklistProgress}%`,
                background: checkedCount === totalCount ? "var(--pos)" : "var(--accent)",
              }}
            />
          </div>
        </div>
      )}

      {/* Footer row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span
            className="inline-flex items-center text-[10px] font-medium px-2 py-[2px] shrink-0"
            style={{
              background: statusBadge.bg, color: statusBadge.color,
              border: statusBadge.border, borderRadius: 4, fontFamily: "var(--font-mono)",
            }}
          >
            {statusBadge.label}
          </span>

          {/* Due date badge */}
          {campaign.due_date && <DueDateBadge dueDate={campaign.due_date} compact />}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Description icon */}
          {campaign.description && <AlignLeft className="h-3 w-3" style={{ color: "var(--muted)" }} />}

          {/* Creatives count */}
          {creativeCount > 0 && (
            <span className="flex items-center gap-0.5 text-[10px]" style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
              <Paperclip className="h-3 w-3" />
              {creativeCount}
            </span>
          )}

          {/* Comments count */}
          {commentCount > 0 && (
            <span className="flex items-center gap-0.5 text-[10px]" style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
              <MessageSquare className="h-3 w-3" />
              {commentCount}
            </span>
          )}

          {/* Checklist count */}
          {totalCount > 0 && (
            <span
              className="text-[10px]"
              style={{
                color: checkedCount === totalCount ? "var(--pos)" : "var(--muted)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {checkedCount}/{totalCount}
            </span>
          )}

          {/* Assignee avatar */}
          {initials && (
            <Avatar className="h-5 w-5" title={assigneeName || ""}>
              <AvatarFallback
                className="text-[9px] font-semibold"
                style={{ background: "var(--accent)", color: "var(--primary-foreground)" }}
              >
                {initials}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>
    </div>
  );
}
