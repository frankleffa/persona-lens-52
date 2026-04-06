// ─────────────────────────────────────────────────────────────
// ltv-webhook — Receives CAPI-like purchase events and stores
// them in meta_customers + meta_orders for LTV tracking.
//
// The client's server already sends events to Meta CAPI.
// This webhook receives the same payload in parallel so we
// can build per-customer LTV analytics.
// ─────────────────────────────────────────────────────────────

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ─── Types ──────────────────────────────────────────────────
interface EventPayload {
  // Client identification
  client_id: string;

  // Customer data (at least email OR external_id required)
  email?: string;
  external_id?: string;
  phone?: string;
  name?: string;

  // Event / purchase data
  event_name: string;        // "Purchase", "FTD", "Lead", etc.
  value?: number;            // monetary value
  currency?: string;         // default BRL

  // Attribution (UTM / Meta)
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  fbclid?: string;
  fbc?: string;              // Meta click cookie (_fbc)
  fbp?: string;              // Meta browser cookie (_fbp)
}

interface BulkPayload {
  client_id: string;
  events: Omit<EventPayload, "client_id">[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  // ─── Auth: webhook secret ──────────────────────
  const WEBHOOK_SECRET = Deno.env.get("LTV_WEBHOOK_SECRET");
  const headerSecret = req.headers.get("x-webhook-secret");

  if (!WEBHOOK_SECRET) {
    console.error("LTV_WEBHOOK_SECRET not configured");
    return json({ error: "Webhook not configured" }, 500);
  }

  if (headerSecret !== WEBHOOK_SECRET) {
    return json({ error: "Invalid webhook secret" }, 401);
  }

  // ─── Supabase admin client ─────────────────────
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const body = await req.json();

    // Support single event or bulk
    let events: EventPayload[];

    if (Array.isArray(body.events)) {
      // Bulk: { client_id, events: [...] }
      const bulk = body as BulkPayload;
      if (!bulk.client_id) {
        return json({ error: "client_id is required" }, 400);
      }
      events = bulk.events.map((e) => ({ ...e, client_id: bulk.client_id }));
    } else {
      // Single event
      events = [body as EventPayload];
    }

    if (events.length === 0) {
      return json({ error: "No events provided" }, 400);
    }

    const results = { processed: 0, skipped: 0, errors: [] as string[] };

    for (const event of events) {
      try {
        await processEvent(supabase, event);
        results.processed++;
      } catch (e) {
        const msg = (e as Error).message;
        console.error(`Event error: ${msg}`, event);
        results.errors.push(msg);
        results.skipped++;
      }
    }

    return json({
      success: true,
      ...results,
    });
  } catch (e) {
    console.error("Webhook error:", e);
    return json({ error: (e as Error).message }, 500);
  }
});

// ─── Process a single event ─────────────────────────────────
async function processEvent(
  supabase: SupabaseClient,
  event: EventPayload,
) {
  const { client_id, email, external_id, phone, name, event_name, value } = event;

  if (!client_id) {
    throw new Error("client_id is required");
  }

  // Need at least email or external_id to identify the customer
  const customerEmail = email?.toLowerCase().trim();
  const customerId = external_id?.trim();

  if (!customerEmail && !customerId) {
    throw new Error("email or external_id is required");
  }

  // Only process purchase-like events for LTV
  const purchaseEvents = ["purchase", "ftd", "first_time_deposit", "sale", "order"];
  if (!purchaseEvents.includes(event_name.toLowerCase())) {
    // Non-purchase events: skip silently (could be leads, registrations, etc.)
    // We only track monetary events for LTV
    return;
  }

  const amount = value ?? 0;

  // ─── 1. Upsert customer ────────────────────────
  // Use email as unique key; fall back to external_id
  const lookupKey = customerEmail || customerId!;

  const { data: existingCustomer } = await supabase
    .from("meta_customers")
    .select("id")
    .eq("client_id", client_id)
    .eq("email", lookupKey)
    .maybeSingle();

  let metaCustomerId: string;

  if (existingCustomer) {
    metaCustomerId = existingCustomer.id;

    // Update name/phone if provided and missing
    if (name || phone) {
      await supabase
        .from("meta_customers")
        .update({
          ...(name ? { name } : {}),
          ...(phone ? { phone } : {}),
        })
        .eq("id", metaCustomerId);
    }
  } else {
    const { data: newCustomer, error: insertErr } = await supabase
      .from("meta_customers")
      .insert({
        client_id,
        email: lookupKey,
        name: name || null,
        phone: phone || null,
      })
      .select("id")
      .single();

    if (insertErr) {
      // Race condition: another request inserted first
      if (insertErr.code === "23505") {
        const { data: retry } = await supabase
          .from("meta_customers")
          .select("id")
          .eq("client_id", client_id)
          .eq("email", lookupKey)
          .single();
        metaCustomerId = retry!.id;
      } else {
        throw new Error(`Insert customer failed: ${insertErr.message}`);
      }
    } else {
      metaCustomerId = newCustomer.id;
    }
  }

  // ─── 2. Insert order ──────────────────────────
  const fbclid = event.fbclid || extractFbclid(event.fbc);

  const { error: orderErr } = await supabase.from("meta_orders").insert({
    customer_id: metaCustomerId,
    client_id,
    amount,
    utm_source: event.utm_source || null,
    utm_medium: event.utm_medium || null,
    utm_campaign: event.utm_campaign || null,
    utm_content: event.utm_content || null,
    utm_term: event.utm_term || null,
    fbclid: fbclid || null,
  });

  if (orderErr) {
    throw new Error(`Insert order failed: ${orderErr.message}`);
  }
}

// ─── Extract fbclid from Meta _fbc cookie ───────────────────
// _fbc format: fb.1.{timestamp}.{fbclid}
function extractFbclid(fbc?: string): string | null {
  if (!fbc) return null;
  const parts = fbc.split(".");
  return parts.length >= 4 ? parts.slice(3).join(".") : fbc;
}
