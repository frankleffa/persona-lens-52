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

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");
  const errorDesc = url.searchParams.get("error_description");

  const APP_URL =
    Deno.env.get("APP_URL") ||
    "https://id-preview--11c33897-8c98-4723-9aae-0320f299c69c.lovable.app";

  if (errorParam) {
    console.error(`[meta-whatsapp-callback] Error: ${errorParam} - ${errorDesc}`);
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${APP_URL}/conexoes?error=${encodeURIComponent(errorDesc || errorParam)}`,
      },
    });
  }

  if (!code || !stateRaw) {
    console.error(`[meta-whatsapp-callback] Missing code or state`);
    return new Response("Missing code or state", { status: 400 });
  }

  let state: { token: string };
  try {
    state = JSON.parse(atob(stateRaw));
  } catch {
    console.error(`[meta-whatsapp-callback] Invalid state`);
    return new Response("Invalid state", { status: 400 });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const META_APP_ID = Deno.env.get("META_APP_ID")!;
  const META_APP_SECRET = Deno.env.get("META_APP_SECRET")!;
  const REDIRECT_URI = Deno.env.get("META_REDIRECT_URI")!;

  // Authenticate user
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  let userId: string;
  try {
    const jwt = state.token.replace("Bearer ", "");
    const { data, error } = await supabase.auth.getUser(jwt);
    if (error || !data.user) throw new Error("Invalid token");
    userId = data.user.id;
    console.log(`[meta-whatsapp-callback] User authenticated: ${userId}`);
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    // Exchange code for access token
    const tokenUrl = new URL("https://graph.facebook.com/v19.0/oauth/access_token");
    tokenUrl.searchParams.set("client_id", META_APP_ID);
    tokenUrl.searchParams.set("client_secret", META_APP_SECRET);
    tokenUrl.searchParams.set("redirect_uri", REDIRECT_URI);
    tokenUrl.searchParams.set("code", code);

    const tokenRes = await fetch(tokenUrl.toString());
    const tokenData = await tokenRes.json();
    console.log(`[meta-whatsapp-callback] Token response status: ${tokenRes.status}`);

    if (!tokenRes.ok) {
      throw new Error(`Token error: ${JSON.stringify(tokenData)}`);
    }

    const accessToken = tokenData.access_token;

    // Fetch WhatsApp Business Accounts
    const wabaRes = await fetch(
      `https://graph.facebook.com/v19.0/me/businesses?fields=id,name,owned_whatsapp_business_accounts{id,name,phone_numbers{id,display_phone_number,verified_name}}&access_token=${accessToken}`
    );
    const wabaData = await wabaRes.json();
    console.log(`[meta-whatsapp-callback] WABA response:`, JSON.stringify(wabaData));

    let businessId = "";
    let wabaId = "";
    let phoneNumberId = "";

    if (wabaData.data && wabaData.data.length > 0) {
      const business = wabaData.data[0];
      businessId = business.id;

      const wabaAccounts = business.owned_whatsapp_business_accounts?.data || [];
      if (wabaAccounts.length > 0) {
        const waba = wabaAccounts[0];
        wabaId = waba.id;

        const phones = waba.phone_numbers?.data || [];
        if (phones.length > 0) {
          phoneNumberId = phones[0].id;
        }
      }
    }

    if (!wabaId) {
      // Try alternative endpoint
      const altRes = await fetch(
        `https://graph.facebook.com/v19.0/me?fields=id&access_token=${accessToken}`
      );
      const altData = await altRes.json();
      console.log(`[meta-whatsapp-callback] Alt user data:`, JSON.stringify(altData));

      // Try fetching shared WABAs
      const sharedRes = await fetch(
        `https://graph.facebook.com/v19.0/${altData.id}/businesses?fields=id,name&access_token=${accessToken}`
      );
      const sharedData = await sharedRes.json();
      console.log(`[meta-whatsapp-callback] Shared businesses:`, JSON.stringify(sharedData));
    }

    // Save connection
    const { error: dbError } = await supabase.from("whatsapp_connections").upsert(
      {
        agency_id: userId,
        business_id: businessId || "pending",
        waba_id: wabaId || "pending",
        phone_number_id: phoneNumberId || "pending",
        access_token: accessToken,
        status: wabaId ? "connected" : "pending_setup",
      },
      { onConflict: "agency_id" }
    );

    if (dbError) throw new Error(`DB error: ${dbError.message}`);
    console.log(`[meta-whatsapp-callback] Connection saved for user: ${userId}`);

    return new Response(null, {
      status: 302,
      headers: {
        Location: `${APP_URL}/conexoes?connected=whatsapp`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[meta-whatsapp-callback] Error:`, message);
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${APP_URL}/conexoes?error=${encodeURIComponent(message)}`,
      },
    });
  }
});
