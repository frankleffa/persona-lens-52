import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function refreshGoogleToken(serviceClient: any, userId: string, provider: string): Promise<string | null> {
  const { data: conn } = await serviceClient
    .from("oauth_connections")
    .select("access_token, refresh_token, token_expires_at")
    .eq("manager_id", userId)
    .eq("provider", provider)
    .eq("connected", true)
    .maybeSingle();

  if (!conn?.refresh_token) return conn?.access_token || null;

  // Check if token is expired (with 5min buffer)
  const expiresAt = conn.token_expires_at ? new Date(conn.token_expires_at).getTime() : 0;
  if (expiresAt > Date.now() + 5 * 60 * 1000) {
    return conn.access_token;
  }

  console.log(`[manage-connections] Refreshing Google token for provider ${provider}`);
  const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
  const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: conn.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) {
    console.error(`[manage-connections] Google token refresh failed:`, tokenData);
    return null;
  }

  const newAccessToken = tokenData.access_token;
  const expiresIn = tokenData.expires_in || 3600;

  await serviceClient.from("oauth_connections").update({
    access_token: newAccessToken,
    token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
  }).eq("manager_id", userId).eq("provider", provider);

  return newAccessToken;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
  if (claimsError || !claimsData.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userId = claimsData.user.id;
  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const body = await req.json().catch(() => ({}));
    const { action, provider, accounts } = body;

    // ── Save selected accounts ──
    if (action === "save_google_accounts" && accounts) {
      await supabase.from("manager_ad_accounts").update({ is_active: false }).eq("manager_id", userId);
      for (const accId of accounts) {
        await supabase.from("manager_ad_accounts").update({ is_active: true }).eq("manager_id", userId).eq("customer_id", accId);
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "save_meta_accounts" && accounts) {
      await supabase.from("manager_meta_ad_accounts").update({ is_active: false }).eq("manager_id", userId);
      for (const accId of accounts) {
        await supabase.from("manager_meta_ad_accounts").update({ is_active: true }).eq("manager_id", userId).eq("ad_account_id", accId);
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "save_ga4_properties" && accounts) {
      await supabase.from("manager_ga4_properties").update({ is_active: false }).eq("manager_id", userId);
      for (const propId of accounts) {
        await supabase.from("manager_ga4_properties").update({ is_active: true }).eq("manager_id", userId).eq("property_id", propId);
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Sync Meta accounts ──
    if (action === "sync_meta_accounts") {
      const { data: metaConn } = await serviceClient
        .from("oauth_connections")
        .select("access_token")
        .eq("manager_id", userId)
        .eq("provider", "meta_ads")
        .eq("connected", true)
        .maybeSingle();

      if (!metaConn?.access_token) {
        return new Response(JSON.stringify({ error: "Meta Ads não conectado" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const allAdAccounts: Array<{ id: string; name: string }> = [];
      let nextUrl: string | null = `https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name,account_status&limit=100&access_token=${metaConn.access_token}`;

      while (nextUrl) {
        const res: Response = await fetch(nextUrl);
        const data: any = await res.json();
        if (data.data) allAdAccounts.push(...data.data);
        nextUrl = data.paging?.next || null;
      }

      for (const acc of allAdAccounts) {
        await serviceClient.from("manager_meta_ad_accounts").upsert(
          { manager_id: userId, ad_account_id: acc.id, account_name: acc.name || acc.id, is_active: true },
          { onConflict: "manager_id,ad_account_id" }
        );
      }

      return new Response(JSON.stringify({ success: true, count: allAdAccounts.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Sync Google Ads accounts ──
    if (action === "sync_google_accounts") {
      const accessToken = await refreshGoogleToken(serviceClient, userId, "google_ads");
      if (!accessToken) {
        return new Response(JSON.stringify({ error: "Google Ads não conectado ou token expirado" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const devToken = Deno.env.get("GOOGLE_DEVELOPER_TOKEN") || "";
      const accRes = await fetch("https://googleads.googleapis.com/v16/customers:listAccessibleCustomers", {
        headers: { Authorization: `Bearer ${accessToken}`, "developer-token": devToken },
      });
      const accData = await accRes.json();
      const customerIds = (accData.resourceNames || []).map((rn: string) => rn.replace("customers/", ""));

      const allAccounts: Array<{ id: string; name: string }> = [];
      for (const customerId of customerIds) {
        try {
          const query = `SELECT customer_client.client_customer, customer_client.descriptive_name, customer_client.level, customer_client.manager FROM customer_client WHERE customer_client.level <= 1`;
          const searchRes = await fetch(`https://googleads.googleapis.com/v16/customers/${customerId}/googleAds:searchStream`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "developer-token": devToken,
              "login-customer-id": customerId,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ query }),
          });
          const searchData = await searchRes.json();
          if (Array.isArray(searchData) && searchData[0]?.results) {
            for (const row of searchData[0].results) {
              const cc = row.customerClient;
              if (!cc.manager) {
                const childId = cc.clientCustomer?.replace("customers/", "") || "";
                if (childId && !allAccounts.find(a => a.id === childId)) {
                  allAccounts.push({ id: childId, name: cc.descriptiveName || `Conta ${childId}` });
                }
              }
            }
          } else {
            if (!allAccounts.find(a => a.id === customerId)) {
              allAccounts.push({ id: customerId, name: `Conta ${customerId}` });
            }
          }
        } catch {
          if (!allAccounts.find(a => a.id === customerId)) {
            allAccounts.push({ id: customerId, name: `Conta ${customerId}` });
          }
        }
      }

      for (const acc of allAccounts) {
        await serviceClient.from("manager_ad_accounts").upsert(
          { manager_id: userId, customer_id: acc.id, account_name: acc.name, is_active: false },
          { onConflict: "manager_id,customer_id" }
        );
      }

      return new Response(JSON.stringify({ success: true, count: allAccounts.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Sync GA4 properties ──
    if (action === "sync_ga4_properties") {
      const accessToken = await refreshGoogleToken(serviceClient, userId, "ga4");
      if (!accessToken) {
        return new Response(JSON.stringify({ error: "GA4 não conectado ou token expirado" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const propRes = await fetch("https://analyticsadmin.googleapis.com/v1beta/accountSummaries", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const propData = await propRes.json();
      const properties = (propData.accountSummaries || []).flatMap(
        (summary: { propertySummaries?: Array<{ property: string; displayName: string }> }) =>
          (summary.propertySummaries || []).map((p) => ({ id: p.property, name: p.displayName }))
      );

      for (const prop of properties) {
        await serviceClient.from("manager_ga4_properties").upsert(
          { manager_id: userId, property_id: prop.id, property_name: prop.name, is_active: false },
          { onConflict: "manager_id,property_id" }
        );
      }

      return new Response(JSON.stringify({ success: true, count: properties.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Disconnect provider (cleanup accounts) ──
    if (action === "disconnect" && provider) {
      // Delete oauth connection
      await serviceClient.from("oauth_connections").delete().eq("manager_id", userId).eq("provider", provider);
      
      // Clean up associated accounts
      if (provider === "google_ads") {
        await serviceClient.from("manager_ad_accounts").delete().eq("manager_id", userId);
      } else if (provider === "meta_ads") {
        await serviceClient.from("manager_meta_ad_accounts").delete().eq("manager_id", userId);
      } else if (provider === "ga4") {
        await serviceClient.from("manager_ga4_properties").delete().eq("manager_id", userId);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Legacy: update account_data in oauth_connections
    if (provider && body.account_data) {
      const { error } = await supabase
        .from("oauth_connections")
        .update({ account_data: body.account_data })
        .eq("manager_id", userId)
        .eq("provider", provider);

      if (error) throw new Error(error.message);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Fetch all connections + accounts for this user ──
    const { data: connections, error: connError } = await supabase
      .from("safe_oauth_connections")
      .select("*")
      .eq("manager_id", userId);

    if (connError) throw new Error(connError.message);

    const { data: googleAccounts } = await supabase.from("manager_ad_accounts").select("*").eq("manager_id", userId);
    const { data: metaAccounts } = await supabase.from("manager_meta_ad_accounts").select("*").eq("manager_id", userId);
    const { data: ga4Properties } = await supabase.from("manager_ga4_properties").select("*").eq("manager_id", userId);

    // Get token expiry info for frontend
    const { data: tokenInfo } = await serviceClient
      .from("oauth_connections")
      .select("provider, token_expires_at")
      .eq("manager_id", userId)
      .eq("connected", true);

    return new Response(JSON.stringify({
      connections: connections || [],
      google_accounts: googleAccounts || [],
      meta_accounts: metaAccounts || [],
      ga4_properties: ga4Properties || [],
      token_info: tokenInfo || [],
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[manage-connections] Error: ${message}`);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
