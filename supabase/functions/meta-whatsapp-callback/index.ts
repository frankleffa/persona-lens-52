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
    // 1. Exchange code for short-lived token
    const tokenUrl = new URL("https://graph.facebook.com/v19.0/oauth/access_token");
    tokenUrl.searchParams.set("client_id", META_APP_ID);
    tokenUrl.searchParams.set("client_secret", META_APP_SECRET);
    tokenUrl.searchParams.set("redirect_uri", REDIRECT_URI);
    tokenUrl.searchParams.set("code", code);

    const tokenRes = await fetch(tokenUrl.toString());
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) throw new Error(`Token error: ${JSON.stringify(tokenData)}`);

    const shortLivedToken = tokenData.access_token;

    // 2. Exchange for long-lived token
    const longLivedUrl = new URL("https://graph.facebook.com/v19.0/oauth/access_token");
    longLivedUrl.searchParams.set("grant_type", "fb_exchange_token");
    longLivedUrl.searchParams.set("client_id", META_APP_ID);
    longLivedUrl.searchParams.set("client_secret", META_APP_SECRET);
    longLivedUrl.searchParams.set("fb_exchange_token", shortLivedToken);

    const longLivedRes = await fetch(longLivedUrl.toString());
    const longLivedData = await longLivedRes.json();
    const accessToken = longLivedData.access_token || shortLivedToken;
    console.log(`[meta-whatsapp-callback] Got long-lived token: ${!!longLivedData.access_token}`);

    // 3. Fetch all businesses
    const businessesRes = await fetch(
      `https://graph.facebook.com/v19.0/me/businesses?fields=id,name&access_token=${accessToken}`
    );
    const businessesData = await businessesRes.json();
    console.log(`[meta-whatsapp-callback] Businesses:`, JSON.stringify(businessesData));

    const accounts: Array<{
      business_id: string;
      business_name: string;
      waba_id: string;
      waba_name: string;
      phone_number_id: string;
      display_phone_number: string;
    }> = [];

    const businesses = businessesData.data || [];

    for (const biz of businesses) {
      // 4. For each business, fetch owned WABAs
      const wabaRes = await fetch(
        `https://graph.facebook.com/v19.0/${biz.id}/owned_whatsapp_business_accounts?fields=id,name&access_token=${accessToken}`
      );
      const wabaData = await wabaRes.json();
      const wabas = wabaData.data || [];

      for (const waba of wabas) {
        // 5. For each WABA, fetch phone numbers
        const phonesRes = await fetch(
          `https://graph.facebook.com/v19.0/${waba.id}/phone_numbers?fields=id,display_phone_number,verified_name&access_token=${accessToken}`
        );
        const phonesData = await phonesRes.json();
        const phones = phonesData.data || [];

        for (const phone of phones) {
          accounts.push({
            business_id: biz.id,
            business_name: biz.name || "",
            waba_id: waba.id,
            waba_name: waba.name || "",
            phone_number_id: phone.id,
            display_phone_number: phone.display_phone_number || phone.verified_name || "",
          });
        }

        // If WABA has no phones, still list it
        if (phones.length === 0) {
          accounts.push({
            business_id: biz.id,
            business_name: biz.name || "",
            waba_id: waba.id,
            waba_name: waba.name || "",
            phone_number_id: "",
            display_phone_number: "",
          });
        }
      }
    }

    console.log(`[meta-whatsapp-callback] Found ${accounts.length} account(s)`);

    // 6. Clean up old pending connections for this user
    await supabase
      .from("whatsapp_pending_connections")
      .delete()
      .eq("agency_id", userId);

    // 7. Save to pending table (using service role, bypasses RLS)
    const { error: dbError } = await supabase.from("whatsapp_pending_connections").insert({
      agency_id: userId,
      access_token: accessToken,
      accounts: accounts,
    });

    if (dbError) throw new Error(`DB error: ${dbError.message}`);
    console.log(`[meta-whatsapp-callback] Pending connection saved for user: ${userId}`);

    // 8. Redirect to selection page
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${APP_URL}/conexoes?whatsapp_select=1`,
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
