import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
  const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
  const META_APP_ID = Deno.env.get("META_APP_ID")!;
  const META_APP_SECRET = Deno.env.get("META_APP_SECRET")!;

  const redirectUri = `${SUPABASE_URL}/functions/v1/oauth-callback`;
  // The app preview URL to redirect back to
  const APP_URL = Deno.env.get("APP_URL") || "https://id-preview--11c33897-8c98-4723-9aae-0320f299c69c.lovable.app";

  if (!code || !stateRaw) {
    return new Response("Missing code or state", { status: 400 });
  }

  let state: { provider: string; token: string };
  try {
    state = JSON.parse(atob(stateRaw));
  } catch {
    return new Response("Invalid state", { status: 400 });
  }

  const { provider, token } = state;

  // Extract user ID from the JWT token
  const supabaseAuth = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  let userId: string;

  try {
    const jwt = token.replace("Bearer ", "");
    const { data, error } = await supabaseAuth.auth.getUser(jwt);
    if (error || !data.user) throw new Error("Invalid token");
    userId = data.user.id;
  } catch {
    return new Response("Unauthorized – please log in again", { status: 401 });
  }

  try {
    let accessToken: string;
    let refreshToken: string | null = null;
    let expiresIn: number | null = null;
    let accountData: unknown[] = [];

    if (provider === "google_ads" || provider === "ga4") {
      // Exchange code for tokens
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok) throw new Error(`Google token error: ${JSON.stringify(tokenData)}`);

      accessToken = tokenData.access_token;
      refreshToken = tokenData.refresh_token || null;
      expiresIn = tokenData.expires_in || 3600;

      if (provider === "google_ads") {
        // Fetch accessible accounts
        const devToken = Deno.env.get("GOOGLE_DEVELOPER_TOKEN") || "";
        const accRes = await fetch(
          "https://googleads.googleapis.com/v16/customers:listAccessibleCustomers",
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "developer-token": devToken,
            },
          }
        );
        const accData = await accRes.json();
        if (accData.resourceNames) {
          accountData = accData.resourceNames.map((rn: string) => ({
            id: rn.replace("customers/", ""),
            name: `Conta ${rn.replace("customers/", "")}`,
            selected: false,
          }));
        }
      }

      if (provider === "ga4") {
        // Fetch GA4 properties
        const propRes = await fetch(
          "https://analyticsadmin.googleapis.com/v1beta/accountSummaries",
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const propData = await propRes.json();
        if (propData.accountSummaries) {
          accountData = propData.accountSummaries.flatMap(
            (summary: { propertySummaries?: Array<{ property: string; displayName: string }> }) =>
              (summary.propertySummaries || []).map((p) => ({
                id: p.property,
                name: p.displayName,
                selected: false,
              }))
          );
        }
      }
    } else if (provider === "meta_ads") {
      const metaTokenUrl = new URL("https://graph.facebook.com/v19.0/oauth/access_token");
      metaTokenUrl.searchParams.set("client_id", META_APP_ID);
      metaTokenUrl.searchParams.set("client_secret", META_APP_SECRET);
      metaTokenUrl.searchParams.set("redirect_uri", redirectUri);
      metaTokenUrl.searchParams.set("code", code);

      const metaRes = await fetch(metaTokenUrl.toString());
      const metaTokenData = await metaRes.json();

      if (!metaRes.ok) throw new Error(`Meta token error: ${JSON.stringify(metaTokenData)}`);

      accessToken = metaTokenData.access_token;
      expiresIn = metaTokenData.expires_in || 5184000;

      // Fetch ad accounts
      const adAccRes = await fetch(
        `https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name,account_status&access_token=${accessToken}`
      );
      const adAccData = await adAccRes.json();
      if (adAccData.data) {
        accountData = adAccData.data.map((acc: { id: string; name: string }) => ({
          id: acc.id,
          name: acc.name,
          selected: false,
        }));
      }
    } else {
      return new Response("Invalid provider", { status: 400 });
    }

    // Upsert connection
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { error: dbError } = await supabase.from("oauth_connections").upsert(
      {
        manager_id: userId,
        provider,
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expires_at: expiresIn
          ? new Date(Date.now() + expiresIn * 1000).toISOString()
          : null,
        account_data: accountData,
        connected: true,
      },
      { onConflict: "manager_id,provider" }
    );

    if (dbError) throw new Error(`DB error: ${dbError.message}`);

    // Redirect back to app
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${APP_URL}/conexoes?connected=${provider}`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("OAuth callback error:", message);
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${APP_URL}/conexoes?error=${encodeURIComponent(message)}`,
      },
    });
  }
});
