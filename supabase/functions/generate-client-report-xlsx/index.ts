import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import ExcelJS from "https://esm.sh/exceljs@4.4.0";

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

    // Fetch campaigns (active only)
    const { data: campaignRows, error: campErr } = await sb
      .from("daily_campaigns")
      .select("*")
      .eq("client_id", client_id)
      .gte("date", startDate)
      .lte("date", endDate);

    if (campErr) throw campErr;

    // Filter out paused campaigns
    const activeRows = (campaignRows || []).filter((r: any) => {
      const s = (r.campaign_status || "").toLowerCase();
      return !s.includes("paus") && s !== "paused";
    });

    // Fetch daily_metrics for impressions data
    const { data: metricRows } = await sb
      .from("daily_metrics")
      .select("platform, impressions, spend, clicks")
      .eq("client_id", client_id)
      .gte("date", startDate)
      .lte("date", endDate);

    // Aggregate campaigns by platform then by name
    type CampAgg = { name: string; spend: number; impressions: number; clicks: number; cpc: number; ctr: number; cpm: number };
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
          impressions: 0,
          clicks: Number(row.clicks) || 0,
          cpc: 0, ctr: 0, cpm: 0,
        });
      }
    }

    // Aggregate impressions from daily_metrics by platform
    const platformImpressions = new Map<string, number>();
    const platformMetricSpend = new Map<string, number>();
    const platformMetricClicks = new Map<string, number>();
    for (const m of (metricRows || [])) {
      const p = normalizePlatform(m.platform);
      platformImpressions.set(p, (platformImpressions.get(p) || 0) + (Number(m.impressions) || 0));
      platformMetricSpend.set(p, (platformMetricSpend.get(p) || 0) + (Number(m.spend) || 0));
      platformMetricClicks.set(p, (platformMetricClicks.get(p) || 0) + (Number(m.clicks) || 0));
    }

    // Build workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "AdScape";
    const sheet = workbook.addWorksheet("Relatório de Custos");
    sheet.properties.defaultColWidth = 16;

    // Styles
    const headerFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A1A2E" } };
    const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 };
    const metaSectionFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1877F2" } };
    const googleSectionFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4285F4" } };
    const totalFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF9C4" } };
    const totalFont: Partial<ExcelJS.Font> = { bold: true, size: 11 };
    const resumoFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF6F00" } };
    const resumoFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };

    // Title
    let row = 1;
    sheet.mergeCells(`A${row}:H${row}`);
    const titleCell = sheet.getCell(`A${row}`);
    titleCell.value = `RELATÓRIO DE CUSTOS — ${clientName.toUpperCase()}`;
    titleCell.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
    titleCell.fill = headerFill;
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    sheet.getRow(row).height = 30;

    row++;
    sheet.mergeCells(`A${row}:H${row}`);
    const periodCell = sheet.getCell(`A${row}`);
    periodCell.value = `Período: ${formatBrDate(startDate)} a ${formatBrDate(endDate)}`;
    periodCell.font = { size: 11, color: { argb: "FF666666" } };
    periodCell.alignment = { horizontal: "center" };
    row += 2;

    // Track totals for summary
    const summaryRows: { platform: string; spend: number; impressions: number; clicks: number }[] = [];

    // Platform sections
    const platformOrder = ["META ADS", "GOOGLE ADS"];
    for (const otherPlatform of platformMap.keys()) {
      if (!platformOrder.includes(otherPlatform)) platformOrder.push(otherPlatform);
    }

    for (const platform of platformOrder) {
      const campMap = platformMap.get(platform);
      if (!campMap || campMap.size === 0) continue;

      const sectionFill = platform.includes("META") ? metaSectionFill : googleSectionFill;
      const platformImp = platformImpressions.get(platform) || 0;

      // Section header
      sheet.mergeCells(`A${row}:H${row}`);
      const sectionCell = sheet.getCell(`A${row}`);
      sectionCell.value = `${platform} — ${periodLabel}`;
      sectionCell.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
      sectionCell.fill = sectionFill;
      sectionCell.alignment = { horizontal: "left", vertical: "middle" };
      sheet.getRow(row).height = 28;
      row++;

      // Column headers
      const colHeaders = ["Campanha", "Custo (R$)", "Impressões", "Cliques", "CPC (R$)", "CTR (%)", "Alcance", "CPM (R$)"];
      const headerRow = sheet.getRow(row);
      colHeaders.forEach((h, i) => {
        const cell = headerRow.getCell(i + 1);
        cell.value = h;
        cell.font = { bold: true, size: 10, color: { argb: "FF333333" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8E8E8" } };
        cell.alignment = { horizontal: "center" };
        cell.border = { bottom: { style: "thin", color: { argb: "FFCCCCCC" } } };
      });
      row++;

      // Distribute impressions proportionally by spend
      const totalPlatformSpend = Array.from(campMap.values()).reduce((s, c) => s + c.spend, 0);

      let totalSpend = 0, totalImp = 0, totalClicks = 0;

      for (const camp of campMap.values()) {
        // Proportional impressions
        const campImp = totalPlatformSpend > 0 ? Math.round((camp.spend / totalPlatformSpend) * platformImp) : 0;
        camp.impressions = campImp;
        camp.cpc = camp.clicks > 0 ? camp.spend / camp.clicks : 0;
        camp.ctr = campImp > 0 ? (camp.clicks / campImp) * 100 : 0;
        camp.cpm = campImp > 0 ? (camp.spend / campImp) * 1000 : 0;

        const dataRow = sheet.getRow(row);
        dataRow.getCell(1).value = camp.name;
        dataRow.getCell(1).alignment = { wrapText: true };
        dataRow.getCell(2).value = camp.spend;
        dataRow.getCell(2).numFmt = '#,##0.00';
        dataRow.getCell(3).value = campImp;
        dataRow.getCell(3).numFmt = '#,##0';
        dataRow.getCell(4).value = camp.clicks;
        dataRow.getCell(4).numFmt = '#,##0';
        dataRow.getCell(5).value = camp.cpc;
        dataRow.getCell(5).numFmt = '#,##0.00';
        dataRow.getCell(6).value = camp.ctr;
        dataRow.getCell(6).numFmt = '0.00';
        dataRow.getCell(7).value = campImp; // Alcance ≈ impressions
        dataRow.getCell(7).numFmt = '#,##0';
        dataRow.getCell(8).value = camp.cpm;
        dataRow.getCell(8).numFmt = '#,##0.00';

        totalSpend += camp.spend;
        totalImp += campImp;
        totalClicks += camp.clicks;
        row++;
      }

      // Total row
      const totRow = sheet.getRow(row);
      totRow.getCell(1).value = `TOTAL ${platform}`;
      totRow.getCell(2).value = totalSpend;
      totRow.getCell(2).numFmt = '#,##0.00';
      totRow.getCell(3).value = totalImp;
      totRow.getCell(3).numFmt = '#,##0';
      totRow.getCell(4).value = totalClicks;
      totRow.getCell(4).numFmt = '#,##0';
      totRow.getCell(5).value = totalClicks > 0 ? totalSpend / totalClicks : 0;
      totRow.getCell(5).numFmt = '#,##0.00';
      totRow.getCell(6).value = totalImp > 0 ? (totalClicks / totalImp) * 100 : 0;
      totRow.getCell(6).numFmt = '0.00';
      totRow.getCell(7).value = totalImp;
      totRow.getCell(7).numFmt = '#,##0';
      totRow.getCell(8).value = totalImp > 0 ? (totalSpend / totalImp) * 1000 : 0;
      totRow.getCell(8).numFmt = '#,##0.00';

      for (let c = 1; c <= 8; c++) {
        totRow.getCell(c).font = totalFont;
        totRow.getCell(c).fill = totalFill;
        totRow.getCell(c).border = { top: { style: "thin", color: { argb: "FF999999" } } };
      }

      summaryRows.push({ platform, spend: totalSpend, impressions: totalImp, clicks: totalClicks });
      row += 2;
    }

    // RESUMO GERAL
    sheet.mergeCells(`A${row}:E${row}`);
    const resumoHeaderCell = sheet.getCell(`A${row}`);
    resumoHeaderCell.value = `RESUMO GERAL — ${periodLabel}`;
    resumoHeaderCell.font = resumoFont;
    resumoHeaderCell.fill = resumoFill;
    resumoHeaderCell.alignment = { horizontal: "center" };
    sheet.getRow(row).height = 28;
    row++;

    // Summary column headers
    const sumHeaders = ["Plataforma", "Custo Total", "Moeda", "Impressões", "Cliques"];
    const sumHeaderRow = sheet.getRow(row);
    sumHeaders.forEach((h, i) => {
      const cell = sumHeaderRow.getCell(i + 1);
      cell.value = h;
      cell.font = { bold: true, size: 10 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFE0B2" } };
      cell.alignment = { horizontal: "center" };
    });
    row++;

    let grandTotal = 0;
    for (const sr of summaryRows) {
      const dataRow = sheet.getRow(row);
      dataRow.getCell(1).value = sr.platform;
      dataRow.getCell(2).value = sr.spend;
      dataRow.getCell(2).numFmt = '#,##0.00';
      dataRow.getCell(3).value = "BRL";
      dataRow.getCell(4).value = sr.impressions;
      dataRow.getCell(4).numFmt = '#,##0';
      dataRow.getCell(5).value = sr.clicks;
      dataRow.getCell(5).numFmt = '#,##0';
      grandTotal += sr.spend;
      row++;
    }

    // Grand total row
    row++;
    sheet.mergeCells(`A${row}:E${row}`);
    const grandTotalCell = sheet.getCell(`A${row}`);
    grandTotalCell.value = `INVESTIMENTO TOTAL: R$ ${grandTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    grandTotalCell.font = { bold: true, size: 13, color: { argb: "FFFFFFFF" } };
    grandTotalCell.fill = resumoFill;
    grandTotalCell.alignment = { horizontal: "center" };
    sheet.getRow(row).height = 30;

    // Set column widths
    sheet.getColumn(1).width = 40;
    for (let c = 2; c <= 8; c++) sheet.getColumn(c).width = 16;

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
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
