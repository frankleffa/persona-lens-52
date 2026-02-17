import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Image } from "lucide-react";
import type { Campaign } from "@/lib/execution-types";
import { PLATFORM_COLORS } from "@/lib/execution-types";

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
        if (e.key === "Enter") {
            e.preventDefault();
            commitEdit();
        }
        if (e.key === "Escape") {
            setEditValue(campaign.campaign_name);
            setEditing(false);
        }
    };

    // Get a simple color dot for platform
    const platformDot: Record<string, string> = {
        "Meta Ads": "bg-blue-500",
        "Google Ads": "bg-red-500",
        "TikTok Ads": "bg-pink-500",
        "LinkedIn Ads": "bg-indigo-500",
    };

    return (
        <div
            className="rounded-lg bg-card/80 hover:bg-card px-2.5 py-2 cursor-pointer transition-colors group border-none shadow-none"
            onClick={(e) => {
                if (editing) return;
                onClick();
            }}
        >
            {/* Color labels row — Trello style small colored bars */}
            <div className="flex gap-1 mb-1.5">
                <div className={`h-1.5 w-8 rounded-full ${platformDot[campaign.platform] || "bg-muted"}`} />
            </div>

            {/* Editable title */}
            {editing ? (
                <textarea
                    ref={textareaRef}
                    value={editValue}
                    onChange={(e) => {
                        setEditValue(e.target.value);
                        autoResize(e.target);
                    }}
                    onBlur={commitEdit}
                    onKeyDown={handleKeyDown}
                    className="w-full text-sm text-foreground bg-transparent border-none outline-none resize-none leading-snug p-0 m-0 font-normal"
                    rows={1}
                    onClick={(e) => e.stopPropagation()}
                />
            ) : (
                <p
                    className="text-sm text-foreground leading-snug mb-1 select-none"
                    onDoubleClick={(e) => {
                        e.stopPropagation();
                        setEditing(true);
                    }}
                >
                    {campaign.campaign_name}
                </p>
            )}

            {/* Footer row */}
            <div className="flex items-center gap-1.5 mt-1.5 text-muted-foreground/60">
                {creativeCount > 0 && (
                    <span className="flex items-center gap-0.5 text-[11px]">
                        <Image className="h-3 w-3" />
                        {creativeCount}
                    </span>
                )}
                {totalCount > 0 && (
                    <span className="text-[11px]">✓ {checkedCount}/{totalCount}</span>
                )}
            </div>
        </div>
    );
}
