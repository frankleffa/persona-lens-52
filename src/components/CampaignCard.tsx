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

    return (
        <div
            onClick={onClick}
            className="rounded-xl bg-card border border-border p-3 cursor-pointer hover:bg-muted/50 transition-colors group"
        >
            {/* Campaign Name */}
            <h4 className="text-sm font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                {campaign.campaign_name}
            </h4>

            {/* Client Badge */}
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 mb-2 border-border">
                {campaign.client_name}
            </Badge>

            {/* Platform Badge */}
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 mb-3 ${PLATFORM_COLORS[campaign.platform]}`}>
                {campaign.platform}
            </Badge>

            {/* Footer: Date + Creatives */}
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
                <span className="flex items-center gap-1">
                    📅 {format(new Date(campaign.start_date), "dd/MM", { locale: ptBR })}
                </span>
                {creativeCount > 0 && (
                    <span className="flex items-center gap-1">
                        <Image className="h-3 w-3" />
                        {creativeCount}
                    </span>
                )}
            </div>
        </div>
    );
}
