import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { AlignLeft, Image as ImageIcon, CheckSquare, Paperclip } from "lucide-react";
import type { Campaign } from "@/lib/execution-types";

interface CampaignCardProps {
    campaign: Campaign;
    onClick: () => void;
    onUpdateName?: (id: string, name: string) => void;
}

export function CampaignCard({ campaign, onClick, onUpdateName }: CampaignCardProps) {
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

    const isVideo = campaign.cover_url && /\.(mp4|webm|ogg)/i.test(campaign.cover_url);
    const hasFooterInfo = creativeCount > 0 || totalCount > 0 || campaign.description;

    return (
        <div
            className="rounded-lg bg-card hover:bg-card/90 cursor-pointer transition-colors group shadow-sm border border-border/30 overflow-hidden"
            onClick={(e) => { if (!editing) onClick(); }}
        >
            {/* Cover image/video */}
            {campaign.cover_url && (
                <div className="w-full">
                    {isVideo ? (
                        <video
                            src={campaign.cover_url}
                            className="w-full h-[140px] object-cover"
                            muted
                        />
                    ) : (
                        <img
                            src={campaign.cover_url}
                            alt=""
                            className="w-full h-[140px] object-cover"
                        />
                    )}
                </div>
            )}

            <div className="px-2 py-1.5">
                {/* Labels row */}
                {campaign.labels.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-1.5">
                        {campaign.labels.map((label) => (
                            <span
                                key={label.id}
                                className="inline-block h-2 min-w-[40px] rounded-sm"
                                style={{ backgroundColor: label.color }}
                                title={label.text}
                            />
                        ))}
                    </div>
                )}

                {/* Editable title */}
                {editing ? (
                    <textarea
                        ref={textareaRef}
                        value={editValue}
                        onChange={(e) => { setEditValue(e.target.value); autoResize(e.target); }}
                        onBlur={commitEdit}
                        onKeyDown={handleKeyDown}
                        className="w-full text-sm text-foreground bg-transparent border-none outline-none resize-none leading-snug p-0 m-0 font-normal"
                        rows={1}
                        onClick={(e) => e.stopPropagation()}
                    />
                ) : (
                    <p
                        className="text-sm text-foreground leading-snug select-none"
                        onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}
                    >
                        {campaign.campaign_name}
                    </p>
                )}

                {/* Footer icons */}
                {hasFooterInfo && (
                    <div className="flex items-center gap-2 mt-1.5 text-muted-foreground/60">
                        {campaign.description && (
                            <AlignLeft className="h-3.5 w-3.5" />
                        )}
                        {creativeCount > 0 && (
                            <span className="flex items-center gap-0.5 text-[11px]">
                                <Paperclip className="h-3 w-3" />
                                {creativeCount}
                            </span>
                        )}
                        {totalCount > 0 && (
                            <span className={`flex items-center gap-0.5 text-[11px] ${checkedCount === totalCount && totalCount > 0 ? "text-green-500" : ""}`}>
                                <CheckSquare className="h-3 w-3" />
                                {checkedCount}/{totalCount}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
