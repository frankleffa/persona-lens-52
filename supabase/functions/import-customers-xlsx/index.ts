// ─────────────────────────────────────────────────────────────
// import-customers-xlsx — Parses an uploaded XLSX file and
// bulk-imports customer purchase events into meta_customers
// and meta_orders. Columns must match the template generated
// by customer-template-xlsx.
//
// Expected columns (case-insensitive):
//   email, name, phone, event_name, value,
//   utm_source, utm_medium, utm_campaign, utm_content,
//   utm_term, fbclid
// ─────────────────────────────────────────────────────────────

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const PURCHASE_EVENTS = ["purchase", "ftd", "first_time_deposit", "sale", "order"];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // ─── Auth: verify user JWT ─────────────────────
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return json({ error: "Authorization required" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Verify the user's JWT
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) return json({ error: "Invalid session" }, 401);

  // ─── Parse FormData ────────────────────────────
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return json({ error: "Request must be multipart/form-data" }, 400);
  }

  const file = formData.get("file") as File | null;
  const client_id = formData.get("client_id") as string | null;

  if (!file) return json({ error: "file is required" }, 400);
  if (!client_id) return json({ error: "client_id is required" }, 400);

  // ─── Verify manager has access to this client ──
  const { data: link } = await supabase
    .from("client_manager_links")
    .select("id")
    .eq("manager_user_id", user.id)
    .eq("client_user_id", client_id)
    .maybeSingle();

  if (!link) return json({ error: "Acesso negado a este cliente" }, 403);

  // ─── Parse XLSX ────────────────────────────────
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return json({ error: "Planilha vazia" }, 400);

  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });

  if (rawRows.length === 0) return json({ error: "Nenhum dado encontrado na planilha" }, 400);

  // Normalize column header keys to lowercase
  const rows = rawRows.map((row) => {
    const normalized: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) {
      normalized[k.toLowerCase().trim()] = String(v ?? "").trim();
    }
    return normalized;
  });

  // ─── Process rows ──────────────────────────────
  const results = { processed: 0, skipped: 0, errors: [] as string[] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // 1-indexed + header row

    const email = row["email"]?.toLowerCase();
    const event_name = row["event_name"] || "Purchase";
    const valueStr = row["value"] || "0";
    const amount = parseFloat(valueStr.replace(",", ".")) || 0;

    if (!email) {
      results.errors.push(`Linha ${rowNum}: email é obrigatório`);
      results.skipped++;
      continue;
    }

    if (!PURCHASE_EVENTS.includes(event_name.toLowerCase())) {
      // Non-purchase event: skip silently
      results.skipped++;
      continue;
    }

    try {
      await processRow(supabase, {
        client_id,
        email,
        name: row["name"] || undefined,
        phone: row["phone"] || undefined,
        event_name,
        amount,
        utm_source: row["utm_source"] || undefined,
        utm_medium: row["utm_medium"] || undefined,
        utm_campaign: row["utm_campaign"] || undefined,
        utm_content: row["utm_content"] || undefined,
        utm_term: row["utm_term"] || undefined,
        fbclid: row["fbclid"] || undefined,
      });
      results.processed++;
    } catch (e) {
      const msg = (e as Error).message;
      results.errors.push(`Linha ${rowNum}: ${msg}`);
      results.skipped++;
    }
  }

  return json({ success: true, total: rows.length, ...results });
});

// ─── Process a single row ───────────────────────────────────
async function processRow(
  supabase: SupabaseClient,
  row: {
    client_id: string;
    email: string;
    name?: string;
    phone?: string;
    event_name: string;
    amount: number;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    utm_term?: string;
    fbclid?: string;
  },
) {
  const { client_id, email, name, phone, amount } = row;

  // ─── 1. Upsert customer ─────────────────────────
  const { data: existing } = await supabase
    .from("meta_customers")
    .select("id")
    .eq("client_id", client_id)
    .eq("email", email)
    .maybeSingle();

  let customerId: string;

  if (existing) {
    customerId = existing.id;
    if (name || phone) {
      await supabase
        .from("meta_customers")
        .update({
          ...(name ? { name } : {}),
          ...(phone ? { phone } : {}),
        })
        .eq("id", customerId);
    }
  } else {
    const { data: newCustomer, error: insertErr } = await supabase
      .from("meta_customers")
      .insert({ client_id, email, name: name || null, phone: phone || null })
      .select("id")
      .single();

    if (insertErr) {
      if (insertErr.code === "23505") {
        const { data: retry } = await supabase
          .from("meta_customers")
          .select("id")
          .eq("client_id", client_id)
          .eq("email", email)
          .single();
        customerId = retry!.id;
      } else {
        throw new Error(`Falha ao criar cliente: ${insertErr.message}`);
      }
    } else {
      customerId = newCustomer.id;
    }
  }

  // ─── 2. Insert order ───────────────────────────
  const { error: orderErr } = await supabase.from("meta_orders").insert({
    customer_id: customerId,
    client_id,
    amount,
    utm_source: row.utm_source || null,
    utm_medium: row.utm_medium || null,
    utm_campaign: row.utm_campaign || null,
    utm_content: row.utm_content || null,
    utm_term: row.utm_term || null,
    fbclid: row.fbclid || null,
  });

  if (orderErr) {
    throw new Error(`Falha ao registrar pedido: ${orderErr.message}`);
  }
}
