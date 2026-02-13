import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { provider } = await req.json();
    console.log(`[oauth-init] Provider requested: ${provider}`);
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

    // Determine redirect URI (the oauth-callback edge function)
    const redirectUri = `${SUPABASE_URL}/functions/v1/oauth-callback`;
    console.log(`[oauth-init] Redirect URI: ${redirectUri}`);

    if (provider === "google_ads") {
      const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
      if (!clientId) throw new Error("GOOGLE_CLIENT_ID not configured");

      // Extract user token for state
      const authHeader = req.headers.get("Authorization") ?? "";
      const state = btoa(JSON.stringify({ provider: "google_ads", token: authHeader }));

      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "https://www.googleapis.com/auth/adwords",
        access_type: "offline",
        prompt: "consent",
        state,
      });

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
      console.log(`[oauth-init] Google Ads auth URL generated. Client ID: ${clientId.substring(0, 10)}...`);
      return new Response(
        JSON.stringify({ url: authUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (provider === "meta_ads") {
      const appId = Deno.env.get("META_APP_ID");
      if (!appId) throw new Error("META_APP_ID not configured");

      const authHeader = req.headers.get("Authorization") ?? "";
      const state = btoa(JSON.stringify({ provider: "meta_ads", token: authHeader }));

      const params = new URLSearchParams({
        client_id: appId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "ads_read,ads_management,business_management",
        state,
      });

      const metaAuthUrl = `https://www.facebook.com/v19.0/dialog/oauth?${params}`;
      console.log(`[oauth-init] Meta Ads auth URL generated. App ID: ${appId.substring(0, 10)}...`);
      return new Response(
        JSON.stringify({ url: metaAuthUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (provider === "ga4") {
      const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
      if (!clientId) throw new Error("GOOGLE_CLIENT_ID not configured");

      const authHeader = req.headers.get("Authorization") ?? "";
      const state = btoa(JSON.stringify({ provider: "ga4", token: authHeader }));

      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "https://www.googleapis.com/auth/analytics.readonly",
        access_type: "offline",
        prompt: "consent",
        state,
      });

      const ga4AuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
      console.log(`[oauth-init] GA4 auth URL generated. Client ID: ${clientId.substring(0, 10)}...`);
      return new Response(
        JSON.stringify({ url: ga4AuthUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[oauth-init] Invalid provider: ${provider}`);
    return new Response(JSON.stringify({ error: "Invalid provider" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
