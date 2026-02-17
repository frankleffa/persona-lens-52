import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL")!;
  const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY")!;
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

  try {
    const { action } = await req.json();

    // ── CREATE INSTANCE ──
    if (action === "create-instance") {
      const instanceName = `adscape_${userId.replace(/-/g, "").substring(0, 16)}`;

      // Check if instance already exists on Evolution API
      try {
        const checkRes = await fetch(
          `${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`,
          { headers: { apikey: EVOLUTION_API_KEY } }
        );
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          if (checkData?.instance?.state === "open") {
            // Already connected, save to DB
            await supabase.from("whatsapp_connections").upsert(
              {
                agency_id: userId,
                provider: "evolution",
                instance_name: instanceName,
                status: "connected",
              },
              { onConflict: "agency_id" }
            );
            return new Response(
              JSON.stringify({ success: true, instance_name: instanceName, already_connected: true }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      } catch {
        // Instance doesn't exist yet, proceed to create
      }

      // Delete existing instance if any (to get fresh QR)
      try {
        await fetch(`${EVOLUTION_API_URL}/instance/delete/${instanceName}`, {
          method: "DELETE",
          headers: { apikey: EVOLUTION_API_KEY },
        });
      } catch {
        // Ignore if doesn't exist
      }

      // Create new instance
      const createRes = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
        method: "POST",
        headers: {
          apikey: EVOLUTION_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          instanceName,
          integration: "WHATSAPP-BAILEYS",
          qrcode: true,
        }),
      });

      if (!createRes.ok) {
        const errBody = await createRes.text();
        throw new Error(`Evolution API create error: ${createRes.status} - ${errBody}`);
      }

      const createData = await createRes.json();

      // Save pending connection to DB
      await supabase.from("whatsapp_connections").upsert(
        {
          agency_id: userId,
          provider: "evolution",
          instance_name: instanceName,
          instance_id: createData?.instance?.instanceId || null,
          status: "pending",
        },
        { onConflict: "agency_id" }
      );

      return new Response(
        JSON.stringify({
          success: true,
          instance_name: instanceName,
          qrcode: createData?.qrcode?.base64 || null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── GET QRCODE ──
    if (action === "get-qrcode") {
      const { data: conn } = await supabase
        .from("whatsapp_connections")
        .select("instance_name")
        .eq("agency_id", userId)
        .maybeSingle();

      if (!conn?.instance_name) {
        return new Response(
          JSON.stringify({ error: "No instance found. Create one first." }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const qrRes = await fetch(
        `${EVOLUTION_API_URL}/instance/connect/${conn.instance_name}`,
        { headers: { apikey: EVOLUTION_API_KEY } }
      );

      if (!qrRes.ok) {
        const errBody = await qrRes.text();
        throw new Error(`QR Code fetch error: ${qrRes.status} - ${errBody}`);
      }

      const qrData = await qrRes.json();
      return new Response(
        JSON.stringify({ qrcode: qrData?.base64 || null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── CHECK STATUS ──
    if (action === "check-status") {
      const { data: conn } = await supabase
        .from("whatsapp_connections")
        .select("instance_name, status")
        .eq("agency_id", userId)
        .maybeSingle();

      if (!conn?.instance_name) {
        return new Response(
          JSON.stringify({ connected: false, status: "no_instance" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const stateRes = await fetch(
        `${EVOLUTION_API_URL}/instance/connectionState/${conn.instance_name}`,
        { headers: { apikey: EVOLUTION_API_KEY } }
      );

      if (!stateRes.ok) {
        return new Response(
          JSON.stringify({ connected: false, status: "error" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const stateData = await stateRes.json();
      const isConnected = stateData?.instance?.state === "open";

      if (isConnected && conn.status !== "connected") {
        await supabase
          .from("whatsapp_connections")
          .update({ status: "connected" })
          .eq("agency_id", userId);
      }

      return new Response(
        JSON.stringify({ connected: isConnected, status: stateData?.instance?.state || "unknown" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── SEND MESSAGE ──
    if (action === "send-message") {
      const { phone, message } = await req.json();

      if (!phone || !message) {
        return new Response(
          JSON.stringify({ error: "Missing phone or message" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: conn } = await supabase
        .from("whatsapp_connections")
        .select("instance_name")
        .eq("agency_id", userId)
        .eq("status", "connected")
        .maybeSingle();

      if (!conn?.instance_name) {
        return new Response(
          JSON.stringify({ error: "No connected WhatsApp instance found." }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Format phone number (remove non-digits, ensure country code if possible, or trust input)
      // Evolution API expects numbers in international format e.g. 5511999999999
      const formattedPhone = phone.replace(/\D/g, "");

      const sendRes = await fetch(
        `${EVOLUTION_API_URL}/message/sendText/${conn.instance_name}`,
        {
          method: "POST",
          headers: {
            apikey: EVOLUTION_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            number: formattedPhone,
            text: message,
            options: {
              delay: 1200,
              presence: "composing",
              linkPreview: true,
            },
          }),
        }
      );

      if (!sendRes.ok) {
        const errBody = await sendRes.text();
        throw new Error(`Evolution API send error: ${sendRes.status} - ${errBody}`);
      }

      const sendData = await sendRes.json();
      return new Response(
        JSON.stringify({ success: true, data: sendData }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[evolution-whatsapp] Error:", err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
