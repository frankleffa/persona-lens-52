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

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

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

  try {
    const body = await req.json().catch(() => ({}));
    const { action, provider, accounts } = body;

    // Save selected accounts (new flow using dedicated tables)
    if (action === "save_google_accounts" && accounts) {
      // Update is_active for all google accounts of this manager
      // First set all to inactive
      await supabase.from("manager_ad_accounts")
        .update({ is_active: false })
        .eq("manager_id", userId);
      
      // Then activate selected ones
      for (const accId of accounts) {
        await supabase.from("manager_ad_accounts")
          .update({ is_active: true })
          .eq("manager_id", userId)
          .eq("customer_id", accId);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "save_meta_accounts" && accounts) {
      await supabase.from("manager_meta_ad_accounts")
        .update({ is_active: false })
        .eq("manager_id", userId);
      
      for (const accId of accounts) {
        await supabase.from("manager_meta_ad_accounts")
          .update({ is_active: true })
          .eq("manager_id", userId)
          .eq("ad_account_id", accId);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "save_ga4_properties" && accounts) {
      await supabase.from("manager_ga4_properties")
        .update({ is_active: false })
        .eq("manager_id", userId);
      
      for (const propId of accounts) {
        await supabase.from("manager_ga4_properties")
          .update({ is_active: true })
          .eq("manager_id", userId)
          .eq("property_id", propId);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Legacy: update account_data in oauth_connections (for GA4 which still uses JSON)
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

    // Fetch all connections + accounts for this user
    const { data: connections, error: connError } = await supabase
      .from("safe_oauth_connections")
      .select("*")
      .eq("manager_id", userId);

    if (connError) throw new Error(connError.message);

    // Fetch Google Ads accounts
    const { data: googleAccounts } = await supabase
      .from("manager_ad_accounts")
      .select("*")
      .eq("manager_id", userId);

    // Fetch Meta Ads accounts
    const { data: metaAccounts } = await supabase
      .from("manager_meta_ad_accounts")
      .select("*")
      .eq("manager_id", userId);

    // Fetch GA4 properties (dedicated table, same pattern as Google/Meta)
    const { data: ga4Properties } = await supabase
      .from("manager_ga4_properties")
      .select("*")
      .eq("manager_id", userId);

    return new Response(JSON.stringify({
      connections: connections || [],
      google_accounts: googleAccounts || [],
      meta_accounts: metaAccounts || [],
      ga4_properties: ga4Properties || [],
    }), {
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
