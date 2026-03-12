import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  console.log(`[oauth-callback] Request received: ${req.url}`);
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");
  const errorDesc = url.searchParams.get("error_description");

  const FALLBACK_URL = Deno.env.get("APP_URL") || "https://persona-lens-52.lovable.app";

  if (errorParam) {
    console.error(`[oauth-callback] Provider returned error: ${errorParam} - ${errorDesc}`);
    let errorRedirect = FALLBACK_URL;
    if (stateRaw) {
      try { errorRedirect = JSON.parse(atob(stateRaw)).origin || FALLBACK_URL; } catch {}
    }
    return new Response(null, {
      status: 302,
      headers: { Location: `${errorRedirect}/conexoes?error=${encodeURIComponent(errorDesc || errorParam)}` },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
  const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
  const META_APP_ID = Deno.env.get("META_APP_ID")!;
  const META_APP_SECRET = Deno.env.get("META_APP_SECRET")!;

  const redirectUri = `${SUPABASE_URL}/functions/v1/oauth-callback`;

  if (!code || !stateRaw) {
    console.error(`[oauth-callback] Missing code or state. code=${!!code}, state=${!!stateRaw}`);
    return new Response("Missing code or state", { status: 400 });
  }

  let state: { provider: string; token: string; origin?: string };
  try {
    state = JSON.parse(atob(stateRaw));
    console.log(`[oauth-callback] Provider: ${state.provider}, origin: ${state.origin}`);
  } catch {
    console.error(`[oauth-callback] Failed to parse state`);
    return new Response("Invalid state", { status: 400 });
  }

  const { provider, token } = state;
  const APP_URL = state.origin || FALLBACK_URL;

  const supabaseAuth = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  let userId: string;

  try {
    const jwt = token.replace("Bearer ", "");
    const { data, error } = await supabaseAuth.auth.getUser(jwt);
    if (error || !data.user) {
      console.error(`[oauth-callback] Auth error: ${error?.message || "No user"}`);
      throw new Error("Token expirado. Faça login novamente e reconecte.");
    }
    userId = data.user.id;
    console.log(`[oauth-callback] Authenticated user: ${userId}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Token inválido";
    return new Response(null, {
      status: 302,
      headers: { Location: `${APP_URL}/conexoes?error=${encodeURIComponent(msg)}` },
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  try {
    let accessToken: string;
    let refreshToken: string | null = null;
    let expiresIn: number | null = null;
    let accountData: unknown[] = [];

    if (provider === "google_ads" || provider === "ga4") {
      console.log(`[oauth-callback] Exchanging code for Google token...`);
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
      if (!tokenRes.ok) {
        console.error(`[oauth-callback] Google token error body:`, JSON.stringify(tokenData));
        const errorDetail = tokenData.error_description || tokenData.error || "Token exchange failed";
        throw new Error(`Erro Google OAuth: ${errorDetail}`);
      }

      accessToken = tokenData.access_token;
      refreshToken = tokenData.refresh_token || null;
      expiresIn = tokenData.expires_in || 3600;

      if (!refreshToken) {
        console.warn(`[oauth-callback] No refresh_token received for ${provider}. User may need to revoke access and reconnect.`);
      }

      if (provider === "google_ads") {
        const devToken = Deno.env.get("GOOGLE_DEVELOPER_TOKEN") || "";
        console.log(`[oauth-callback] Fetching accessible Google Ads customers...`);
        
        const accRes = await fetch(
          "https://googleads.googleapis.com/v16/customers:listAccessibleCustomers",
          { headers: { Authorization: `Bearer ${accessToken}`, "developer-token": devToken } }
        );
        const accData = await accRes.json();
        
        if (!accRes.ok) {
          console.error(`[oauth-callback] Google Ads customers error:`, JSON.stringify(accData));
          throw new Error(`Erro ao listar contas Google Ads: ${accData.error?.message || accRes.status}`);
        }
        
        console.log(`[oauth-callback] Accessible customers: ${JSON.stringify(accData.resourceNames || [])}`);
        const customerIds = (accData.resourceNames || []).map((rn: string) => rn.replace("customers/", ""));
        
        const allAccounts: Array<{ id: string; name: string }> = [];
        
        for (const customerId of customerIds) {
          try {
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
          } catch (e) {
            console.warn(`[oauth-callback] Error querying customer ${customerId}:`, e);
            if (!allAccounts.find(a => a.id === customerId)) {
              allAccounts.push({ id: customerId, name: `Conta ${customerId}` });
            }
          }
        }

        console.log(`[oauth-callback] Found ${allAccounts.length} Google Ads accounts`);

        for (const acc of allAccounts) {
          const { error: upsertErr } = await supabase.from("manager_ad_accounts").upsert(
            { manager_id: userId, customer_id: acc.id, account_name: acc.name, is_active: false },
            { onConflict: "manager_id,customer_id" }
          );
          if (upsertErr) console.warn(`[oauth-callback] Upsert ad account error:`, upsertErr.message);
        }

        accountData = allAccounts.map(a => ({ id: a.id, name: a.name, selected: false }));
      }

      if (provider === "ga4") {
        console.log(`[oauth-callback] Fetching GA4 properties...`);
        const propRes = await fetch(
          "https://analyticsadmin.googleapis.com/v1beta/accountSummaries",
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const propData = await propRes.json();
        
        if (!propRes.ok) {
          console.error(`[oauth-callback] GA4 API error:`, JSON.stringify(propData));
          throw new Error(`Erro ao listar propriedades GA4: ${propData.error?.message || propRes.status}. Verifique se a Google Analytics Admin API está ativada no console do Google Cloud.`);
        }
        
        console.log(`[oauth-callback] GA4 accountSummaries: ${(propData.accountSummaries || []).length} accounts`);
        
        if (propData.accountSummaries) {
          const properties = propData.accountSummaries.flatMap(
            (summary: { propertySummaries?: Array<{ property: string; displayName: string }> }) =>
              (summary.propertySummaries || []).map((p) => ({ id: p.property, name: p.displayName, selected: false }))
          );

          for (const prop of properties) {
            const { error: upsertErr } = await supabase.from("manager_ga4_properties").upsert(
              { manager_id: userId, property_id: prop.id, property_name: prop.name, is_active: false },
              { onConflict: "manager_id,property_id" }
            );
            if (upsertErr) console.warn(`[oauth-callback] Upsert GA4 property error:`, upsertErr.message);
          }

          console.log(`[oauth-callback] Saved ${properties.length} GA4 properties`);
          accountData = properties;
        }
      }
    } else if (provider === "meta_ads") {
      console.log(`[oauth-callback] Exchanging code for Meta token...`);
      const metaTokenUrl = new URL("https://graph.facebook.com/v19.0/oauth/access_token");
      metaTokenUrl.searchParams.set("client_id", META_APP_ID);
      metaTokenUrl.searchParams.set("client_secret", META_APP_SECRET);
      metaTokenUrl.searchParams.set("redirect_uri", redirectUri);
      metaTokenUrl.searchParams.set("code", code);

      const metaRes = await fetch(metaTokenUrl.toString());
      const metaTokenData = await metaRes.json();

      console.log(`[oauth-callback] Meta token response status: ${metaRes.status}`);
      if (!metaRes.ok) {
        console.error(`[oauth-callback] Meta token error:`, JSON.stringify(metaTokenData));
        const errorDetail = metaTokenData.error?.message || metaTokenData.error?.type || "Token exchange failed";
        throw new Error(`Erro Meta OAuth: ${errorDetail}`);
      }

      accessToken = metaTokenData.access_token;
      expiresIn = metaTokenData.expires_in || 5184000;

      const allAdAccounts: Array<{ id: string; name: string; account_status: number; timezone_name?: string }> = [];
      let nextUrl: string | null = `https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name,account_status,timezone_name&limit=100&access_token=${accessToken}`;
      
      while (nextUrl) {
        const adAccRes: Response = await fetch(nextUrl);
        const adAccData: any = await adAccRes.json();
        if (adAccData.data) allAdAccounts.push(...adAccData.data);
        nextUrl = adAccData.paging?.next || null;
      }
      
      console.log(`[oauth-callback] Meta ad accounts found: ${allAdAccounts.length}`);
      
      if (allAdAccounts.length > 0) {
        for (const acc of allAdAccounts) {
          const { error: upsertErr } = await supabase.from("manager_meta_ad_accounts").upsert(
            { manager_id: userId, ad_account_id: acc.id, account_name: acc.name || acc.id, is_active: true, timezone_name: acc.timezone_name || null },
            { onConflict: "manager_id,ad_account_id" }
          );
          if (upsertErr) console.warn(`[oauth-callback] Upsert meta account error:`, upsertErr.message);
        }

        accountData = allAdAccounts.map((acc) => ({ id: acc.id, name: acc.name, selected: false }));
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
        token_expires_at: expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null,
        account_data: accountData,
        connected: true,
      },
      { onConflict: "manager_id,provider" }
    );

    if (dbError) {
      console.error(`[oauth-callback] DB upsert error:`, dbError.message);
      throw new Error(`Erro ao salvar conexão: ${dbError.message}`);
    }
    console.log(`[oauth-callback] Connection saved for provider: ${provider}, user: ${userId}`);

    return new Response(null, {
      status: 302,
      headers: { Location: `${APP_URL}/conexoes?connected=${provider}` },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[oauth-callback] Error:", message);
    return new Response(null, {
      status: 302,
      headers: { Location: `${APP_URL}/conexoes?error=${encodeURIComponent(message)}` },
    });
  }
});
