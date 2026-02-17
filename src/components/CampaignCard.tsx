import { Badge } from "@/components/ui/badge";
import { Image, Link2 } from "lucide-react";
import type { Campaign } from "@/lib/execution-types";
import { PLATFORM_COLORS } from "@/lib/execution-types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CampaignCardProps {
    campaign: Campaign;
    onClick: () => void;
}

export function CampaignCard({ campaign, onClick }: CampaignCardProps) {
    const creativeCount = campaign.creatives.length;

    const checkedCount = campaign.checklist?.filter(c => c.checked).length ?? 0;
    const totalCount = campaign.checklist?.length ?? 0;

    return (
        <div
            onClick={onClick}
            className="rounded-lg bg-card border border-border/50 px-3 py-2.5 cursor-pointer hover:bg-muted/40 transition-colors group shadow-none"
        >
            <h4 className="text-[13px] font-normal text-foreground mb-1.5 line-clamp-2 group-hover:text-primary transition-colors">
                {campaign.campaign_name}
            </h4>

            <div className="flex items-center gap-1.5 flex-wrap mb-2">
                <span className="text-[10px] text-muted-foreground bg-muted/60 rounded px-1.5 py-0.5">
                    {campaign.client_name}
                </span>
                <span className={`text-[10px] rounded px-1.5 py-0.5 ${PLATFORM_COLORS[campaign.platform]}`}>
                    {campaign.platform}
                </span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-muted-foreground/70">
                <span>{format(new Date(campaign.start_date), "dd MMM", { locale: ptBR })}</span>
                <div className="flex items-center gap-2">
                    {creativeCount > 0 && (
                        <span className="flex items-center gap-0.5">
                            <Image className="h-3 w-3" />
                            {creativeCount}
                        </span>
                    )}
                    {totalCount > 0 && (
                        <span className="text-[10px]">{checkedCount}/{totalCount}</span>
                    )}
                </div>
            </div>
        </div>
    );
}
