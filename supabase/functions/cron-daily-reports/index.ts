import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Validate cron secret
  const cronSecret = Deno.env.get("CRON_SECRET");
  const reqSecret = req.headers.get("x-cron-secret");
  if (cronSecret && reqSecret !== cronSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    // Get current month
    const now = new Date();
    // BRT = UTC-3
    const brt = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const month = brt.toISOString().slice(0, 7);

    // Get all active clients
    const { data: clients, error } = await sb.from("client_manager_links").select("client_user_id, client_label").eq("is_demo", false);
    if (error) throw error;

    // Deduplicate by client_user_id
    const seen = new Set<string>();
    const uniqueClients = (clients || []).filter((c: any) => {
      if (seen.has(c.client_user_id)) return false;
      seen.add(c.client_user_id);
      return true;
    });

    let success = 0, errors = 0;

    for (const client of uniqueClients) {
      try {
        // Call generate function
        const resp = await fetch(`${supabaseUrl}/functions/v1/generate-client-report-xlsx`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            client_id: client.client_user_id,
            month,
            save_to_storage: true,
          }),
        });

        if (resp.ok) {
          success++;
        } else {
          const errText = await resp.text();
          console.error(`Failed for client ${client.client_user_id}: ${errText}`);
          errors++;
        }
      } catch (e: any) {
        console.error(`Error for client ${client.client_user_id}:`, e.message);
        errors++;
      }
    }

    return new Response(JSON.stringify({ success, errors, total: uniqueClients.length, month }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Cron daily reports error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
