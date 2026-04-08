import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    const { client_id, month, date, save_to_storage } = await req.json();
    if (!client_id) return new Response(JSON.stringify({ error: "client_id required" }), { status: 400, headers: corsHeaders });

    // Determine period
    let startDate: string, endDate: string, periodLabel: string;
    if (date) {
      startDate = date;
      endDate = date;
      const d = new Date(date + "T00:00:00");
      periodLabel = d.toLocaleDateString("pt-BR");
    } else {
      const m = month || new Date().toISOString().slice(0, 7);
      const [y, mo] = m.split("-").map(Number);
      startDate = `${m}-01`;
      const lastDay = new Date(y, mo, 0).getDate();
      endDate = `${m}-${String(lastDay).padStart(2, "0")}`;
      const months = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
      periodLabel = `${months[mo - 1]} ${y}`;
    }

    // Get client name
    const { data: linkData } = await sb.from("client_manager_links").select("client_label").eq("client_user_id", client_id).limit(1).single();
    const clientName = linkData?.client_label || "Cliente";

    // Fetch active campaigns
    const { data: campaignRows, error: campErr } = await sb
      .from("daily_campaigns")
      .select("*")
      .eq("client_id", client_id)
      .gte("date", startDate)
      .lte("date", endDate);
    if (campErr) throw campErr;

    const activeRows = (campaignRows || []).filter((r: any) => {
      const s = (r.campaign_status || "").toLowerCase();
      return !s.includes("paus") && s !== "paused";
    });

    // Fetch daily_metrics for impressions
    const { data: metricRows } = await sb
      .from("daily_metrics")
      .select("platform, impressions, spend, clicks")
      .eq("client_id", client_id)
      .gte("date", startDate)
      .lte("date", endDate);

    // Aggregate campaigns by platform then by name
    type CampAgg = { name: string; spend: number; clicks: number };
    const platformMap = new Map<string, Map<string, CampAgg>>();

    for (const row of activeRows) {
      const platform = normalizePlatform(row.platform);
      if (!platformMap.has(platform)) platformMap.set(platform, new Map());
      const campMap = platformMap.get(platform)!;
      const existing = campMap.get(row.campaign_name);
      if (existing) {
        existing.spend += Number(row.spend) || 0;
        existing.clicks += Number(row.clicks) || 0;
      } else {
        campMap.set(row.campaign_name, {
          name: row.campaign_name,
          spend: Number(row.spend) || 0,
          clicks: Number(row.clicks) || 0,
        });
      }
    }

    // Aggregate impressions from daily_metrics by platform
    const platformImpressions = new Map<string, number>();
    for (const m of (metricRows || [])) {
      const p = normalizePlatform(m.platform);
      platformImpressions.set(p, (platformImpressions.get(p) || 0) + (Number(m.impressions) || 0));
    }

    // Build sheet data as array of arrays
    const rows: any[][] = [];

    // Title
    rows.push([`RELATÓRIO DE CUSTOS — ${clientName.toUpperCase()}`]);
    rows.push([`Período: ${formatBrDate(startDate)} a ${formatBrDate(endDate)}`]);
    rows.push([]);

    const summaryData: { platform: string; spend: number; impressions: number; clicks: number }[] = [];

    const platformOrder = ["META ADS", "GOOGLE ADS"];
    for (const p of platformMap.keys()) {
      if (!platformOrder.includes(p)) platformOrder.push(p);
    }

    for (const platform of platformOrder) {
      const campMap = platformMap.get(platform);
      if (!campMap || campMap.size === 0) continue;

      const platformImp = platformImpressions.get(platform) || 0;
      const totalPlatformSpend = Array.from(campMap.values()).reduce((s, c) => s + c.spend, 0);

      // Section header
      rows.push([`${platform} — ${periodLabel}`]);
      rows.push(["Campanha", "Custo (R$)", "Impressões", "Cliques", "CPC (R$)", "CTR (%)", "Alcance", "CPM (R$)"]);

      let totalSpend = 0, totalImp = 0, totalClicks = 0;

      for (const camp of campMap.values()) {
        const campImp = totalPlatformSpend > 0 ? Math.round((camp.spend / totalPlatformSpend) * platformImp) : 0;
        const cpc = camp.clicks > 0 ? round2(camp.spend / camp.clicks) : 0;
        const ctr = campImp > 0 ? round2((camp.clicks / campImp) * 100) : 0;
        const cpm = campImp > 0 ? round2((camp.spend / campImp) * 1000) : 0;

        rows.push([camp.name, round2(camp.spend), campImp, camp.clicks, cpc, ctr, campImp, cpm]);
        totalSpend += camp.spend;
        totalImp += campImp;
        totalClicks += camp.clicks;
      }

      // Total row
      const totCpc = totalClicks > 0 ? round2(totalSpend / totalClicks) : 0;
      const totCtr = totalImp > 0 ? round2((totalClicks / totalImp) * 100) : 0;
      const totCpm = totalImp > 0 ? round2((totalSpend / totalImp) * 1000) : 0;
      rows.push([`TOTAL ${platform}`, round2(totalSpend), totalImp, totalClicks, totCpc, totCtr, totalImp, totCpm]);
      rows.push([]);

      summaryData.push({ platform, spend: totalSpend, impressions: totalImp, clicks: totalClicks });
    }

    // RESUMO GERAL
    rows.push([`RESUMO GERAL — ${periodLabel}`]);
    rows.push(["Plataforma", "Custo Total", "Moeda", "Impressões", "Cliques"]);
    let grandTotal = 0;
    for (const sr of summaryData) {
      rows.push([sr.platform, round2(sr.spend), "BRL", sr.impressions, sr.clicks]);
      grandTotal += sr.spend;
    }
    rows.push([]);
    rows.push([`INVESTIMENTO TOTAL: R$ ${grandTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]);

    // Build workbook
    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Set column widths
    ws["!cols"] = [
      { wch: 40 }, { wch: 16 }, { wch: 16 }, { wch: 12 },
      { wch: 12 }, { wch: 10 }, { wch: 16 }, { wch: 12 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatório de Custos");

    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const uint8 = new Uint8Array(buffer);

    // Save to storage if requested
    if (save_to_storage) {
      const m = month || new Date().toISOString().slice(0, 7);
      const path = `${client_id}/${m}.xlsx`;
      await sb.storage.from("client-reports").upload(path, uint8, {
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        upsert: true,
      });
    }

    return new Response(uint8, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="relatorio_${clientName.replace(/\s+/g, "_")}_${startDate}_${endDate}.xlsx"`,
      },
    });
  } catch (err: any) {
    console.error("Error generating report:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

function normalizePlatform(p: string): string {
  const lower = (p || "").toLowerCase();
  if (lower.includes("meta") || lower.includes("facebook") || lower.includes("instagram")) return "META ADS";
  if (lower.includes("google")) return "GOOGLE ADS";
  return p.toUpperCase();
}

function formatBrDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
