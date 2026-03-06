import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { AlignLeft, Paperclip, CheckSquare } from "lucide-react";
import type { Campaign, CampaignStatus } from "@/lib/execution-types";

interface CampaignCardProps {
    campaign: Campaign;
    onClick: () => void;
    onUpdateName?: (id: string, name: string) => void;
    isDragging?: boolean;
}

const STATUS_BADGE: Record<CampaignStatus, { bg: string; color: string; border: string; label: string }> = {
    PLANEJAMENTO: {
        bg: "rgba(240,236,230,0.06)",
        color: "var(--muted)",
        border: "1px solid var(--border2)",
        label: "Planejamento",
    },
    PRONTO: {
        bg: "rgba(255,92,58,0.1)",
        color: "#FF5C3A",
        border: "1px solid rgba(255,92,58,0.25)",
        label: "Pronto",
    },
    VEICULACAO: {
        bg: "rgba(255,92,58,0.1)",
        color: "#FF5C3A",
        border: "1px solid rgba(255,92,58,0.25)",
        label: "Veiculação",
    },
    TESTE: {
        bg: "rgba(255,92,58,0.1)",
        color: "#FF5C3A",
        border: "1px solid rgba(255,92,58,0.25)",
        label: "Em Teste",
    },
    FINALIZADO: {
        bg: "rgba(22,163,74,0.1)",
        color: "#4ADE80",
        border: "1px solid rgba(22,163,74,0.2)",
        label: "Finalizado",
    },
};

export function CampaignCard({ campaign, onClick, onUpdateName, isDragging }: CampaignCardProps) {
    const creativeCount = campaign.creatives.length;
    const checkedCount = campaign.checklist?.filter(c => c.checked).length ?? 0;
    const totalCount = campaign.checklist?.length ?? 0;

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
    const formattedDate = campaign.start_date
        ? new Date(campaign.start_date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
        : "";

    return (
        <div
            className="cursor-pointer group"
            onClick={(e) => { if (!editing) onClick(); }}
            style={{
                background: isDragging ? 'var(--surface2)' : 'var(--surface)',
                border: isDragging ? '1px solid #FF5C3A' : '1px solid var(--border2)',
                borderRadius: 6,
                padding: '14px 16px',
                transition: 'border-color 0.15s ease, background 0.15s ease',
            }}
            onMouseEnter={(e) => {
                if (!isDragging) {
                    e.currentTarget.style.borderColor = 'rgba(255,92,58,0.4)';
                    e.currentTarget.style.background = 'var(--surface2)';
                }
            }}
            onMouseLeave={(e) => {
                if (!isDragging) {
                    e.currentTarget.style.borderColor = 'var(--border2)';
                    e.currentTarget.style.background = 'var(--surface)';
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
                    style={{
                        fontFamily: 'Syne, sans-serif',
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--text)',
                    }}
                    rows={1}
                    onClick={(e) => e.stopPropagation()}
                />
            ) : (
                <p
                    className="select-none"
                    style={{
                        fontFamily: 'Syne, sans-serif',
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--text)',
                        marginBottom: campaign.description ? 6 : 10,
                        lineHeight: 1.4,
                    }}
                    onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}
                >
                    {campaign.campaign_name}
                </p>
            )}

            {/* Description */}
            {campaign.description && (
                <p
                    className="line-clamp-2"
                    style={{
                        fontFamily: 'Syne, sans-serif',
                        fontSize: 11,
                        fontWeight: 400,
                        color: 'var(--muted)',
                        marginBottom: 10,
                        lineHeight: 1.5,
                    }}
                >
                    {campaign.description}
                </p>
            )}

            {/* Footer row */}
            <div className="flex items-center justify-between">
                <span
                    className="inline-flex items-center text-[10px] font-medium px-2 py-[2px]"
                    style={{
                        background: statusBadge.bg,
                        color: statusBadge.color,
                        border: statusBadge.border,
                        borderRadius: 4,
                        fontFamily: 'DM Mono, monospace',
                    }}
                >
                    {statusBadge.label}
                </span>

                <div className="flex items-center gap-2">
                    {/* Footer icons */}
                    {campaign.description && (
                        <AlignLeft className="h-3 w-3" style={{ color: 'var(--muted)' }} />
                    )}
                    {creativeCount > 0 && (
                        <span className="flex items-center gap-0.5 text-[10px]" style={{ color: 'var(--muted)', fontFamily: 'DM Mono, monospace' }}>
                            <Paperclip className="h-3 w-3" />
                            {creativeCount}
                        </span>
                    )}
                    {totalCount > 0 && (
                        <span
                            className="flex items-center gap-0.5 text-[10px]"
                            style={{
                                color: checkedCount === totalCount && totalCount > 0 ? '#4ADE80' : 'var(--muted)',
                                fontFamily: 'DM Mono, monospace',
                            }}
                        >
                            <CheckSquare className="h-3 w-3" />
                            {checkedCount}/{totalCount}
                        </span>
                    )}
                    {formattedDate && (
                        <span
                            className="text-[10px]"
                            style={{ color: 'var(--muted)', fontFamily: 'DM Mono, monospace' }}
                        >
                            {formattedDate}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
