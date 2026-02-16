import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Authenticate user
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

    // Parse body
    const { waba_id, phone_number_id } = await req.json();
    if (!waba_id || !phone_number_id) {
      return new Response(
        JSON.stringify({ error: "waba_id and phone_number_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch pending connection for this user
    const { data: pending, error: fetchError } = await supabase
      .from("whatsapp_pending_connections")
      .select("*")
      .eq("agency_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !pending) {
      return new Response(
        JSON.stringify({ error: "No pending connection found. Please reconnect WhatsApp." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if expired
    if (new Date(pending.expires_at) < new Date()) {
      await supabase.from("whatsapp_pending_connections").delete().eq("id", pending.id);
      return new Response(
        JSON.stringify({ error: "Pending connection expired. Please reconnect WhatsApp." }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate selection belongs to the pending accounts
    const accounts = (pending.accounts || []) as Array<{
      business_id: string;
      business_name: string;
      waba_id: string;
      waba_name: string;
      phone_number_id: string;
      display_phone_number: string;
    }>;

    const selected = accounts.find(
      (a) => a.waba_id === waba_id && a.phone_number_id === phone_number_id
    );

    if (!selected) {
      return new Response(
        JSON.stringify({ error: "Selected account does not belong to your authorized accounts." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Save definitive connection
    const { error: upsertError } = await supabase.from("whatsapp_connections").upsert(
      {
        agency_id: userId,
        business_id: selected.business_id,
        waba_id: selected.waba_id,
        phone_number_id: selected.phone_number_id,
        access_token: pending.access_token,
        status: "connected",
      },
      { onConflict: "agency_id" }
    );

    if (upsertError) throw new Error(`DB error: ${upsertError.message}`);

    // Clean up pending
    await supabase.from("whatsapp_pending_connections").delete().eq("agency_id", userId);

    console.log(`[confirm-whatsapp-selection] Connection saved for user: ${userId}, WABA: ${waba_id}, Phone: ${phone_number_id}`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[confirm-whatsapp-selection] Error:`, message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
