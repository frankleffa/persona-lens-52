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
  const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL")!.replace(/\/+$/, "");;
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
    const body = await req.json();
    const { action, client_id } = body;

    // Helper: build instance name based on whether it's a client or agency connection
    function buildInstanceName(clientId?: string): string {
      if (clientId) {
        return `adscape_c_${clientId.replace(/-/g, "").substring(0, 16)}`;
      }
      return `adscape_${userId.replace(/-/g, "").substring(0, 16)}`;
    }

    // Helper: build query filter for whatsapp_connections
    function connectionFilter(query: any, clientId?: string) {
      query = query.eq("agency_id", userId);
      if (clientId) {
        query = query.eq("client_id", clientId);
      } else {
        query = query.is("client_id", null);
      }
      return query;
    }

    // ── CREATE INSTANCE ──
    if (action === "create-instance") {
      const instanceName = buildInstanceName(client_id);

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
            const upsertData: Record<string, unknown> = {
              agency_id: userId,
              provider: "evolution",
              instance_name: instanceName,
              status: "connected",
              client_id: client_id || null,
            };
            await supabase.from("whatsapp_connections").upsert(upsertData, {
              onConflict: "whatsapp_connections_agency_client",
            });
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

      // Save pending connection to DB - delete old first, then insert
      let delQuery = supabase.from("whatsapp_connections").delete().eq("agency_id", userId);
      if (client_id) {
        delQuery = delQuery.eq("client_id", client_id);
      } else {
        delQuery = delQuery.is("client_id", null);
      }
      await delQuery;

      await supabase.from("whatsapp_connections").insert({
        agency_id: userId,
        provider: "evolution",
        instance_name: instanceName,
        instance_id: createData?.instance?.instanceId || null,
        status: "pending",
        client_id: client_id || null,
      });

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
      let query = supabase.from("whatsapp_connections").select("instance_name").eq("agency_id", userId);
      query = client_id ? query.eq("client_id", client_id) : query.is("client_id", null);
      const { data: conn } = await query.maybeSingle();

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
      let query = supabase.from("whatsapp_connections").select("instance_name, status").eq("agency_id", userId);
      query = client_id ? query.eq("client_id", client_id) : query.is("client_id", null);
      const { data: conn } = await query.maybeSingle();

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
        let upQuery = supabase.from("whatsapp_connections").update({ status: "connected" }).eq("agency_id", userId);
        upQuery = client_id ? upQuery.eq("client_id", client_id) : upQuery.is("client_id", null);
        await upQuery;
      }

      return new Response(
        JSON.stringify({ connected: isConnected, status: stateData?.instance?.state || "unknown" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── SEND MESSAGE ──
    if (action === "send-message") {
      const { phone, message } = body;

      if (!phone || !message) {
        return new Response(
          JSON.stringify({ error: "Missing phone or message" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let query = supabase.from("whatsapp_connections").select("instance_name").eq("agency_id", userId).eq("status", "connected");
      query = client_id ? query.eq("client_id", client_id) : query.is("client_id", null);
      const { data: conn } = await query.maybeSingle();

      if (!conn?.instance_name) {
        return new Response(
          JSON.stringify({ error: "No connected WhatsApp instance found." }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

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

    // ── DISCONNECT ──
    if (action === "disconnect") {
      let query = supabase.from("whatsapp_connections").select("instance_name").eq("agency_id", userId);
      query = client_id ? query.eq("client_id", client_id) : query.is("client_id", null);
      const { data: conn } = await query.maybeSingle();

      if (conn?.instance_name) {
        try {
          await fetch(`${EVOLUTION_API_URL}/instance/delete/${conn.instance_name}`, {
            method: "DELETE",
            headers: { apikey: EVOLUTION_API_KEY },
          });
        } catch { /* ignore */ }
      }

      let delQuery = supabase.from("whatsapp_connections").delete().eq("agency_id", userId);
      delQuery = client_id ? delQuery.eq("client_id", client_id) : delQuery.is("client_id", null);
      await delQuery;

      return new Response(
        JSON.stringify({ success: true }),
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
