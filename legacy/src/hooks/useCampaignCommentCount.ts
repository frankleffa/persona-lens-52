import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCampaignCommentCounts(campaignIds: string[]) {
  return useQuery({
    queryKey: ["campaign-comment-counts", campaignIds.sort().join(",")],
    queryFn: async () => {
      if (campaignIds.length === 0) return {} as Record<string, number>;
      const { data, error } = await supabase
        .from("campaign_comments")
        .select("campaign_id")
        .in("campaign_id", campaignIds);
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach((row: any) => {
        counts[row.campaign_id] = (counts[row.campaign_id] || 0) + 1;
      });
      return counts;
    },
    enabled: campaignIds.length > 0,
  });
}
