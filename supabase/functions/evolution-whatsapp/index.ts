import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Shared formatting helpers ──
function formatCurrency(v: number): string { return v.toFixed(2).replace(".", ","); }
function formatNumber(v: number): string { return v.toLocaleString("pt-BR"); }
function formatPct(v: number): string { const sign = v > 0 ? "+" : ""; return `${sign}${v.toFixed(0)}%`; }
function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? null : 0;
  return ((current - previous) / previous) * 100;
}
function getActionLabel(action: string): string {
  if (action === "paused_campaign") return "🛑 Pausou";
  if (action === "increased_budget") return "🚀 Escalou";
  if (action === "alert_sent") return "⚠️ Alerta";
  return "⚙️ Autom.";
}
function getScoreEmoji(score: number): string {
  if (score >= 8) return "🟢";
  if (score >= 5) return "🟡";
  return "🔴";
}
function getTrendStr(trend: string): string {
  if (trend === "melhorando") return "🟢 Melhorando";
  if (trend === "piorando") return "🔴 Piorando";
  return "⚪ Estável";
}
function formatDate(date: Date): string {
  const dt = new Date(date);
  return dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// ── Build Deep Report Function ──
function buildDeepReport(
  dataToday: any, dataPrev: any, clientName: string, config: any, analysis: any, logs: any[], now: Date
): string {
  const primaryKey = config.primary_metric || "purchases";
  const primaryLabel = config.primary_metric_label || "Compras";
  const spend = dataToday.spend;
  const pmTotal = dataToday[primaryKey] || 0;
  const prevPmTotal = dataPrev[primaryKey] || 0;
  const cpaToday = pmTotal > 0 ? spend / pmTotal : 0;
  const cpaPrev = prevPmTotal > 0 ? dataPrev.spend / prevPmTotal : 0;
  const cpaChange = pctChange(cpaToday, cpaPrev);
  const roas = dataToday.roas || 0;
  const todayStr = formatDate(now);
  const lines: string[] = [];

  lines.push(`*📊 Relatório Diário - ${clientName}*`);
  lines.push(`📅 ${todayStr}`);

  if (analysis) {
    const score = analysis.score || 0;
    lines.push(`Score da Conta: *${score}/10* ${getScoreEmoji(score)}`);
    lines.push("");
    lines.push(`*📈 Resumo:*`);
    lines.push(analysis.resumo || "Resumo indisponível.");
  } else {
    lines.push("");
    lines.push(`*(Sem análise profunda ativa nas últimas 24h)*`);
  }

  lines.push("");
  lines.push(`*💰 Números de Ontem:*`);
  lines.push("");
  lines.push(`Investido: R$ ${formatCurrency(spend)}`);
  lines.push(`${primaryLabel}: ${formatNumber(pmTotal)}`);

  const cpaShow = `Custo/${primaryLabel}: R$ ${formatCurrency(cpaToday)}`;
  const cpaVarShow = cpaChange !== null ? ` ${cpaChange > 0 ? '🔴' : '🟢'} ${formatPct(cpaChange)}` : "";
  lines.push(`${cpaShow}${cpaVarShow}`);
  lines.push(`ROAS: ${roas.toFixed(2)}x`);

  if (config.cpa_target) {
    const target = config.cpa_target;
    if (cpaToday > target) {
      lines.push(`• Status CPA: ⚠️ *Acima* do alvo (R$ ${formatCurrency(target)})`);
    } else if (cpaToday > 0) {
      lines.push(`• Status CPA: ✅ *Dentro* do alvo (R$ ${formatCurrency(target)})`);
    }
  }

  if (analysis?.alertas_criticos && analysis.alertas_criticos.length > 0) {
    lines.push("");
    lines.push(`*🚨 Alertas (${analysis.alertas_criticos.length}):*`);
    (analysis.alertas_criticos.slice(0, 3)).forEach((a: any) => { lines.push(`• ${a.titulo}`); });
    if (analysis.alertas_criticos.length > 3) lines.push(`• _+${analysis.alertas_criticos.length - 3} alertas no painel_`);
  } else if (analysis) {
    lines.push("");
    lines.push(`*🚨 Alertas (0):*`);
    lines.push(`• Nenhum alerta crítico`);
  }

  lines.push("");
  lines.push(`*🤖 Ações Automáticas (24h):*`);
  if (logs.length > 0) {
    logs.forEach(l => {
      const label = getActionLabel(l.action);
      const camp = l.campaign_name ? (l.campaign_name.length > 20 ? l.campaign_name.substring(0, 20) + "..." : l.campaign_name) : "Conta";
      lines.push(`• ${label}: ${camp}`);
    });
  } else {
    lines.push(`• Nenhuma ação executada`);
  }

  if (analysis) {
    lines.push("");
    lines.push(`📊 Tendência: ${getTrendStr(analysis.tendencia_7d)}`);
    if (analysis.previsao) lines.push(`${analysis.previsao}`);
  }

  lines.push("");
  lines.push(`_Relatório enviado manualmente (Modo Teste)_`);
  return lines.join("\n");
}

// ── Helper: safely delete Evolution instance ──
async function safeDeleteInstance(apiUrl: string, apiKey: string, instanceName: string): Promise<void> {
  try {
    // First try to logout (disconnect WhatsApp session)
    await fetch(`${apiUrl}/instance/logout/${instanceName}`, {
      method: "DELETE",
      headers: { apikey: apiKey },
    }).then(r => r.text()).catch(() => {});

    // Then delete the instance
    const delRes = await fetch(`${apiUrl}/instance/delete/${instanceName}`, {
      method: "DELETE",
      headers: { apikey: apiKey },
    });
    const delBody = await delRes.text();
    console.log(`[evolution] Delete instance ${instanceName}: ${delRes.status} - ${delBody}`);
  } catch (e) {
    console.warn(`[evolution] Failed to delete instance ${instanceName}:`, e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL")!.replace(/\/+$/, "");
  const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing authorization" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const jwt = authHeader.replace("Bearer ", "");
  const { data: userData, error: authError } = await supabase.auth.getUser(jwt);
  if (authError || !userData.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userId = userData.user.id;

  try {
    const body = await req.json();
    const { action, trigger, client_id, phone } = body;

    function buildInstanceName(clientId?: string): string {
      if (clientId) return `adscape_c_${clientId.replace(/-/g, "").substring(0, 16)}`;
      return `adscape_${userId.replace(/-/g, "").substring(0, 16)}`;
    }

    // Helper: build DB query scoped to client_id
    function scopedQuery(baseQuery: any, cid: string | null) {
      return cid ? baseQuery.eq("client_id", cid) : baseQuery.is("client_id", null);
    }

    // ── MANUAL TEST ──
    if (trigger === "manual_test") {
      const { data: linkData } = await supabase
        .from("client_manager_links")
        .select("client_label")
        .eq("client_user_id", client_id)
        .limit(1)
        .maybeSingle();
      const clientName = linkData?.client_label || "Cliente Exemplo";

      const { data: config } = await supabase
        .from("client_analysis_config")
        .select("*")
        .eq("client_id", client_id)
        .maybeSingle();
      const activeConfig = config || { vertical: "ecommerce", primary_metric: "purchases", primary_metric_label: "Compras" };

      const now = new Date();
      const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
      const prevDay = new Date(now); prevDay.setDate(prevDay.getDate() - 2);
      const yesterdayStr = yesterday.toISOString().split("T")[0];
      const prevStr = prevDay.toISOString().split("T")[0];
      const twentyFourHoursAgoStr = yesterday.toISOString();

      const { data: analysis } = await supabase
        .from("analysis_reports")
        .select("*")
        .eq("client_id", client_id)
        .gte("created_at", twentyFourHoursAgoStr)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: logs } = await supabase
        .from("automation_log")
        .select("*")
        .eq("client_id", client_id)
        .gte("created_at", twentyFourHoursAgoStr)
        .order("created_at", { ascending: false })
        .limit(10);

      const getMetrics = async (dateStr: string) => {
        const { data: dm } = await supabase.from("daily_metrics").select("*").eq("client_id", client_id).eq("date", dateStr);
        const agg: any = { spend: 0, revenue: 0, roas: 0, [activeConfig.primary_metric]: 0 };
        if (dm) dm.forEach((r: any) => {
          agg.spend += Number(r.spend) || 0;
          agg.revenue += Number(r.revenue) || 0;
          agg[activeConfig.primary_metric] += Number(r[activeConfig.primary_metric]) || 0;
        });
        if (agg.spend > 0 && agg.revenue > 0) agg.roas = agg.revenue / agg.spend;
        return agg;
      };

      const dataToday = await getMetrics(yesterdayStr);
      const dataPrev = await getMetrics(prevStr);
      const message = buildDeepReport(dataToday, dataPrev, clientName, activeConfig, analysis, logs || [], now);

      let query = supabase.from("whatsapp_connections").select("instance_name").eq("agency_id", userId).eq("status", "connected");
      query = scopedQuery(query, client_id);
      const { data: conn } = await query.maybeSingle();

      if (!conn?.instance_name) throw new Error("Conexão WhatsApp não encontrada no banco.");

      const formattedPhone = phone.replace(/\D/g, "");
      const sendRes = await fetch(`${EVOLUTION_API_URL}/message/sendText/${conn.instance_name}`, {
        method: "POST",
        headers: { apikey: EVOLUTION_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ number: formattedPhone, text: message, options: { delay: 1200, presence: "composing", linkPreview: true } }),
      });

      if (!sendRes.ok) {
        const errBody = await sendRes.text();
        throw new Error(`Evolution API send error: ${sendRes.status} - ${errBody}`);
      }

      return new Response(JSON.stringify({ success: true, message: "Teste enviado com sucesso!" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── CREATE INSTANCE ──
    if (action === "create-instance") {
      const instanceName = buildInstanceName(client_id);
      console.log(`[evolution] create-instance for user=${userId}, client=${client_id || "agency"}, name=${instanceName}`);

      // Check if already connected
      try {
        const checkRes = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`, { headers: { apikey: EVOLUTION_API_KEY } });
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          if (checkData?.instance?.state === "open") {
            // Already connected — upsert DB record
            let delQ = supabase.from("whatsapp_connections").delete().eq("agency_id", userId);
            delQ = scopedQuery(delQ, client_id || null);
            await delQ;

            await supabase.from("whatsapp_connections").insert({
              agency_id: userId, provider: "evolution", instance_name: instanceName, status: "connected", client_id: client_id || null,
            });

            console.log(`[evolution] Instance ${instanceName} already connected, DB updated`);
            return new Response(JSON.stringify({ success: true, instance_name: instanceName, already_connected: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
        }
      } catch (e) {
        console.log(`[evolution] Check state failed (will proceed to create):`, e);
      }

      // Force-delete old instance from Evolution API before creating new one
      await safeDeleteInstance(EVOLUTION_API_URL, EVOLUTION_API_KEY, instanceName);

      // Small delay to let Evolution API clean up
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create new instance
      const createRes = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
        method: "POST",
        headers: { apikey: EVOLUTION_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ instanceName, integration: "WHATSAPP-BAILEYS", qrcode: true }),
      });

      if (!createRes.ok) {
        const errBody = await createRes.text();
        console.error(`[evolution] Create instance failed: ${createRes.status} - ${errBody}`);
        throw new Error(`Erro ao criar instância WhatsApp: ${createRes.status} - ${errBody}`);
      }
      const createData = await createRes.json();
      console.log(`[evolution] Instance ${instanceName} created successfully`);

      // Clean DB and insert new record
      let delQuery = supabase.from("whatsapp_connections").delete().eq("agency_id", userId);
      delQuery = scopedQuery(delQuery, client_id || null);
      const { error: delError } = await delQuery;
      if (delError) console.warn(`[evolution] DB delete warning:`, delError.message);

      const { error: insertError } = await supabase.from("whatsapp_connections").insert({
        agency_id: userId, provider: "evolution", instance_name: instanceName,
        instance_id: createData?.instance?.instanceId || null, status: "pending", client_id: client_id || null,
      });

      if (insertError) {
        console.error(`[evolution] DB insert error:`, insertError.message);
        throw new Error(`Erro ao salvar conexão no banco: ${insertError.message}`);
      }

      return new Response(JSON.stringify({ success: true, instance_name: instanceName, qrcode: createData?.qrcode?.base64 || null }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── GET QRCODE ──
    if (action === "get-qrcode") {
      let query = supabase.from("whatsapp_connections").select("instance_name").eq("agency_id", userId);
      query = scopedQuery(query, client_id || null);
      const { data: conn } = await query.maybeSingle();

      if (!conn?.instance_name) {
        return new Response(JSON.stringify({ error: "Nenhuma instância encontrada. Crie uma primeiro." }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const qrRes = await fetch(`${EVOLUTION_API_URL}/instance/connect/${conn.instance_name}`, { headers: { apikey: EVOLUTION_API_KEY } });
      if (!qrRes.ok) {
        const errBody = await qrRes.text();
        throw new Error(`Erro ao buscar QR Code: ${qrRes.status} - ${errBody}`);
      }

      const qrData = await qrRes.json();
      return new Response(JSON.stringify({ qrcode: qrData?.base64 || null }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── CHECK STATUS ──
    if (action === "check-status") {
      let query = supabase.from("whatsapp_connections").select("instance_name, status").eq("agency_id", userId);
      query = scopedQuery(query, client_id || null);
      const { data: conn } = await query.maybeSingle();

      if (!conn?.instance_name) {
        return new Response(JSON.stringify({ connected: false, status: "no_instance" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const stateRes = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${conn.instance_name}`, { headers: { apikey: EVOLUTION_API_KEY } });
      if (!stateRes.ok) {
        return new Response(JSON.stringify({ connected: false, status: "error" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const stateData = await stateRes.json();
      const isConnected = stateData?.instance?.state === "open";

      if (isConnected && conn.status !== "connected") {
        let upQuery = supabase.from("whatsapp_connections").update({ status: "connected" }).eq("agency_id", userId);
        upQuery = scopedQuery(upQuery, client_id || null);
        await upQuery;
      }

      return new Response(JSON.stringify({ connected: isConnected, status: stateData?.instance?.state || "unknown" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── SEND MESSAGE ──
    if (action === "send-message") {
      const { phone, message } = body;
      if (!phone || !message) return new Response(JSON.stringify({ error: "Faltando telefone ou mensagem" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      let query = supabase.from("whatsapp_connections").select("instance_name").eq("agency_id", userId).eq("status", "connected");
      query = scopedQuery(query, client_id || null);
      const { data: conn } = await query.maybeSingle();

      if (!conn?.instance_name) return new Response(JSON.stringify({ error: "Nenhuma instância WhatsApp conectada." }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const formattedPhone = phone.replace(/\D/g, "");
      const sendRes = await fetch(`${EVOLUTION_API_URL}/message/sendText/${conn.instance_name}`, {
        method: "POST",
        headers: { apikey: EVOLUTION_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ number: formattedPhone, text: message, options: { delay: 1200, presence: "composing", linkPreview: true } }),
      });

      if (!sendRes.ok) {
        const errBody = await sendRes.text();
        throw new Error(`Evolution API send error: ${sendRes.status} - ${errBody}`);
      }

      const sendData = await sendRes.json();
      return new Response(JSON.stringify({ success: true, data: sendData }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── DISCONNECT ──
    if (action === "disconnect") {
      console.log(`[evolution] disconnect for user=${userId}, client=${client_id || "agency"}`);

      let query = supabase.from("whatsapp_connections").select("instance_name").eq("agency_id", userId);
      query = scopedQuery(query, client_id || null);
      const { data: conn } = await query.maybeSingle();

      if (conn?.instance_name) {
        await safeDeleteInstance(EVOLUTION_API_URL, EVOLUTION_API_KEY, conn.instance_name);
      }

      let delQuery = supabase.from("whatsapp_connections").delete().eq("agency_id", userId);
      delQuery = scopedQuery(delQuery, client_id || null);
      const { error: delError } = await delQuery;
      if (delError) console.warn(`[evolution] DB delete on disconnect:`, delError.message);

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("[evolution-whatsapp] Error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
