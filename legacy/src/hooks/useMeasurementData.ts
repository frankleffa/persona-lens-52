import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const MONTH_NUMBERS = [1,2,3,4,5,6,7,8,9,10,11,12];

export interface MonthlyAggregated {
  month: string; // "Jan", "Fev", etc.
  totalSpend: number;
  totalRevenue: number;
  totalClicks: number;
  totalConversions: number;
  metaSpend: number;
  metaClicks: number;
  googleSpend: number;
  googleClicks: number;
  mediaClicks: number; // meta + google
}

async function fetchMeasurementData(clientId: string, year: number): Promise<MonthlyAggregated[]> {
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const { data, error } = await supabase
    .from("daily_metrics")
    .select("date, platform, spend, clicks, conversions, revenue")
    .eq("client_id", clientId)
    .gte("date", startDate)
    .lte("date", endDate);

  if (error) throw error;

  // Aggregate by month
  const monthMap: Record<string, MonthlyAggregated> = {};
  MONTHS.forEach(m => {
    monthMap[m] = {
      month: m,
      totalSpend: 0, totalRevenue: 0, totalClicks: 0, totalConversions: 0,
      metaSpend: 0, metaClicks: 0, googleSpend: 0, googleClicks: 0, mediaClicks: 0,
    };
  });

  for (const row of data ?? []) {
    const d = new Date(row.date + "T00:00:00");
    const monthIdx = d.getMonth(); // 0-11
    const m = MONTHS[monthIdx];
    const agg = monthMap[m];

    const spend = Number(row.spend) || 0;
    const clicks = Number(row.clicks) || 0;
    const conversions = Number(row.conversions) || 0;
    const revenue = Number(row.revenue) || 0;
    const platform = (row.platform || "").toLowerCase();

    agg.totalSpend += spend;
    agg.totalRevenue += revenue;
    agg.totalClicks += clicks;
    agg.totalConversions += conversions;

    if (platform === "meta_ads" || platform === "meta" || platform === "facebook") {
      agg.metaSpend += spend;
      agg.metaClicks += clicks;
      agg.mediaClicks += clicks;
    } else if (platform === "google_ads" || platform === "google") {
      agg.googleSpend += spend;
      agg.googleClicks += clicks;
      agg.mediaClicks += clicks;
    }
  }

  return MONTHS.map(m => monthMap[m]);
}

export function useMeasurementData(clientId: string | null, year: number) {
  return useQuery({
    queryKey: ["measurement-data", clientId, year],
    queryFn: () => fetchMeasurementData(clientId!, year),
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000,
  });
}
