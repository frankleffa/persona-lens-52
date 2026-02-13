import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  console.log(`[oauth-callback] Request received: ${req.url}`);
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");
  const errorDesc = url.searchParams.get("error_description");

  if (errorParam) {
    console.error(`[oauth-callback] Provider returned error: ${errorParam} - ${errorDesc}`);
    const APP_URL = Deno.env.get("APP_URL") || "https://id-preview--11c33897-8c98-4723-9aae-0320f299c69c.lovable.app";
    return new Response(null, {
      status: 302,
      headers: { Location: `${APP_URL}/conexoes?error=${encodeURIComponent(errorDesc || errorParam)}` },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
  const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
  const META_APP_ID = Deno.env.get("META_APP_ID")!;
  const META_APP_SECRET = Deno.env.get("META_APP_SECRET")!;

  const redirectUri = `${SUPABASE_URL}/functions/v1/oauth-callback`;
  const APP_URL = Deno.env.get("APP_URL") || "https://id-preview--11c33897-8c98-4723-9aae-0320f299c69c.lovable.app";

  if (!code || !stateRaw) {
    console.error(`[oauth-callback] Missing code or state. code=${!!code}, state=${!!stateRaw}`);
    return new Response("Missing code or state", { status: 400 });
  }

  let state: { provider: string; token: string };
  try {
    state = JSON.parse(atob(stateRaw));
    console.log(`[oauth-callback] Provider: ${state.provider}`);
  } catch {
    console.error(`[oauth-callback] Failed to parse state`);
    return new Response("Invalid state", { status: 400 });
  }

  const { provider, token } = state;

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

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  try {
    let accessToken: string;
    let refreshToken: string | null = null;
    let expiresIn: number | null = null;
    let accountData: unknown[] = [];

    if (provider === "google_ads" || provider === "ga4") {
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
      console.log(`[oauth-callback] Google token response status: ${tokenRes.status}`);
      if (!tokenRes.ok) throw new Error(`Google token error: ${JSON.stringify(tokenData)}`);

      accessToken = tokenData.access_token;
      refreshToken = tokenData.refresh_token || null;
      expiresIn = tokenData.expires_in || 3600;

      if (provider === "google_ads") {
        const devToken = Deno.env.get("GOOGLE_DEVELOPER_TOKEN") || "";
        
        // List accessible customers (could be MCC or direct accounts)
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
        console.log(`[oauth-callback] Accessible customers: ${JSON.stringify(accData.resourceNames || [])}`);

        const customerIds = (accData.resourceNames || []).map((rn: string) => rn.replace("customers/", ""));
        
        // For each accessible customer, try to list child accounts (MCC detection)
        const allAccounts: Array<{ id: string; name: string }> = [];
        
        for (const customerId of customerIds) {
          try {
            // Query customer_client to detect MCC child accounts
            const query = `SELECT customer_client.client_customer, customer_client.descriptive_name, customer_client.level, customer_client.manager FROM customer_client WHERE customer_client.level <= 1`;
            
            const searchRes = await fetch(
              `https://googleads.googleapis.com/v16/customers/${customerId}/googleAds:searchStream`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "developer-token": devToken,
                  "login-customer-id": customerId,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ query }),
              }
            );
            const searchData = await searchRes.json();
            
            if (Array.isArray(searchData) && searchData[0]?.results) {
              for (const row of searchData[0].results) {
                const cc = row.customerClient;
                // Only include non-manager (leaf) accounts
                if (!cc.manager) {
                  const childId = cc.clientCustomer?.replace("customers/", "") || "";
                  if (childId && !allAccounts.find(a => a.id === childId)) {
                    allAccounts.push({
                      id: childId,
                      name: cc.descriptiveName || `Conta ${childId}`,
                    });
                  }
                }
              }
            } else {
              // Not an MCC, add the account itself
              if (!allAccounts.find(a => a.id === customerId)) {
                allAccounts.push({ id: customerId, name: `Conta ${customerId}` });
              }
            }
          } catch (e) {
            console.warn(`[oauth-callback] Error querying customer ${customerId}:`, e);
            if (!allAccounts.find(a => a.id === customerId)) {
              allAccounts.push({ id: customerId, name: `Conta ${customerId}` });
            }
          }
        }

        console.log(`[oauth-callback] Found ${allAccounts.length} Google Ads accounts`);

        // Save accounts to manager_ad_accounts table
        for (const acc of allAccounts) {
          await supabase.from("manager_ad_accounts").upsert(
            { manager_id: userId, customer_id: acc.id, account_name: acc.name, is_active: false },
            { onConflict: "manager_id,customer_id" }
          );
        }

        accountData = allAccounts.map(a => ({ id: a.id, name: a.name, selected: false }));
      }

      if (provider === "ga4") {
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

      console.log(`[oauth-callback] Meta token response status: ${metaRes.status}`);
      if (!metaRes.ok) throw new Error(`Meta token error: ${JSON.stringify(metaTokenData)}`);

      accessToken = metaTokenData.access_token;
      expiresIn = metaTokenData.expires_in || 5184000;

      // Fetch ad accounts via /me/adaccounts
      const adAccRes = await fetch(
        `https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name,account_status&access_token=${accessToken}`
      );
      const adAccData = await adAccRes.json();
      console.log(`[oauth-callback] Meta ad accounts found: ${adAccData.data?.length || 0}`);
      
      if (adAccData.data) {
        // Save to manager_meta_ad_accounts table
        for (const acc of adAccData.data) {
          await supabase.from("manager_meta_ad_accounts").upsert(
            { manager_id: userId, ad_account_id: acc.id, account_name: acc.name || acc.id, is_active: false },
            { onConflict: "manager_id,ad_account_id" }
          );
        }

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
    console.log(`[oauth-callback] Connection saved for provider: ${provider}, user: ${userId}`);

    return new Response(null, {
      status: 302,
      headers: { Location: `${APP_URL}/conexoes?connected=${provider}` },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("OAuth callback error:", message);
    return new Response(null, {
      status: 302,
      headers: { Location: `${APP_URL}/conexoes?error=${encodeURIComponent(message)}` },
    });
  }
});
