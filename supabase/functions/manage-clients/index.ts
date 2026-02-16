import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STRATEGY_TYPES = ["REVENUE", "DEMAND", "MESSAGE"] as const;

function normalizeStrategyType(value: unknown) {
  return typeof value === "string" && STRATEGY_TYPES.includes(value as (typeof STRATEGY_TYPES)[number])
    ? value
    : "DEMAND";
}

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
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

  const supabaseUser = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: userError } = await supabaseUser.auth.getUser(token);
  if (userError || !userData.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const managerId = userData.user.id;
  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Verify caller is a manager or admin
  const { data: roleData } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", managerId)
    .limit(1);

  const callerRole = roleData?.[0]?.role;
  if (callerRole !== "manager" && callerRole !== "admin") {
    return new Response(JSON.stringify({ error: "Forbidden: only managers can manage clients" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { action } = body;

    // LIST clients for this manager (includes assigned accounts)
    if (!action || action === "list") {
      const { data: links, error } = await supabaseAdmin
        .from("client_manager_links")
        .select("id, client_user_id, client_label, strategy_type, created_at")
        .eq("manager_id", managerId);

      if (error) throw new Error(error.message);

      const clientIds = (links || []).map((l) => l.client_user_id);
      let profiles: Array<{ id: string; email: string | null; full_name: string | null }> = [];
      if (clientIds.length > 0) {
        const { data: p } = await supabaseAdmin
          .from("profiles")
          .select("id, email, full_name")
          .in("id", clientIds);
        profiles = p || [];
      }

      // Fetch assigned accounts per client
      const { data: clientGoogle } = clientIds.length > 0
        ? await supabaseAdmin.from("client_ad_accounts").select("*").in("client_user_id", clientIds)
        : { data: [] };
      const { data: clientMeta } = clientIds.length > 0
        ? await supabaseAdmin.from("client_meta_ad_accounts").select("*").in("client_user_id", clientIds)
        : { data: [] };
      const { data: clientGA4 } = clientIds.length > 0
        ? await supabaseAdmin.from("client_ga4_properties").select("*").in("client_user_id", clientIds)
        : { data: [] };

      const clients = (links || []).map((link) => {
        const profile = profiles.find((p) => p.id === link.client_user_id);
        return {
          ...link,
          email: profile?.email || null,
          full_name: profile?.full_name || null,
          google_accounts: (clientGoogle || []).filter((a) => a.client_user_id === link.client_user_id).map((a) => a.customer_id),
          meta_accounts: (clientMeta || []).filter((a) => a.client_user_id === link.client_user_id).map((a) => a.ad_account_id),
          ga4_properties: (clientGA4 || []).filter((a) => a.client_user_id === link.client_user_id).map((a) => a.property_id),
        };
      });

      // Also fetch manager's available accounts
      const { data: managerGoogle } = await supabaseAdmin
        .from("manager_ad_accounts")
        .select("customer_id, account_name")
        .eq("manager_id", managerId)
        .eq("is_active", true);

      const { data: managerMeta } = await supabaseAdmin
        .from("manager_meta_ad_accounts")
        .select("ad_account_id, account_name")
        .eq("manager_id", managerId)
        .eq("is_active", true);

      // GA4 properties from oauth_connections account_data
      const { data: ga4Conn } = await supabaseAdmin
        .from("oauth_connections")
        .select("account_data")
        .eq("manager_id", managerId)
        .eq("provider", "ga4")
        .eq("connected", true)
        .limit(1);

      const ga4Properties = ((ga4Conn?.[0]?.account_data as Array<{ id: string; name?: string; selected?: boolean }>) || [])
        .filter((a) => a.selected)
        .map((a) => ({ property_id: a.id, name: a.name || a.id }));

      return new Response(JSON.stringify({
        clients,
        available_accounts: {
          google: managerGoogle || [],
          meta: managerMeta || [],
          ga4: ga4Properties,
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // CREATE a new client user
    if (action === "create") {
      const { email, password, full_name, client_label, strategy_type } = body;
      const normalizedStrategyType = normalizeStrategyType(strategy_type);

      if (!email || !password) {
        return new Response(JSON.stringify({ error: "Email and password are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create auth user with admin API
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: full_name || "" },
      });

      if (createError) throw new Error(createError.message);

      const clientUserId = newUser.user.id;

      // Set role to 'client'
      await supabaseAdmin
        .from("user_roles")
        .update({ role: "client" })
        .eq("user_id", clientUserId);

      // Link client to manager
      const { error: linkError } = await supabaseAdmin
        .from("client_manager_links")
        .insert({
          client_user_id: clientUserId,
          manager_id: managerId,
          client_label: client_label || full_name || email,
          strategy_type: normalizedStrategyType,
        });

      if (linkError) throw new Error(linkError.message);

      return new Response(JSON.stringify({ success: true, client_user_id: clientUserId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // UPDATE client data
    if (action === "update") {
      const { link_id, client_label, strategy_type } = body;
      const normalizedStrategyType = normalizeStrategyType(strategy_type);
      if (!link_id) {
        return new Response(JSON.stringify({ error: "link_id is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabaseAdmin
        .from("client_manager_links")
        .update({ client_label, strategy_type: normalizedStrategyType })
        .eq("id", link_id)
        .eq("manager_id", managerId);

      if (error) throw new Error(error.message);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DELETE client link (does not delete the user)
    if (action === "delete") {
      const { link_id } = body;
      if (!link_id) {
        return new Response(JSON.stringify({ error: "link_id is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabaseAdmin
        .from("client_manager_links")
        .delete()
        .eq("id", link_id)
        .eq("manager_id", managerId);

      if (error) throw new Error(error.message);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SAVE client account assignments
    if (action === "save_accounts") {
      const { client_user_id, google_accounts, meta_accounts, ga4_properties } = body;
      if (!client_user_id) {
        return new Response(JSON.stringify({ error: "client_user_id is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify this client belongs to this manager
      const { data: linkCheck } = await supabaseAdmin
        .from("client_manager_links")
        .select("id")
        .eq("client_user_id", client_user_id)
        .eq("manager_id", managerId)
        .limit(1);

      if (!linkCheck || linkCheck.length === 0) {
        return new Response(JSON.stringify({ error: "Client not linked to this manager" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Google accounts
      if (Array.isArray(google_accounts)) {
        await supabaseAdmin.from("client_ad_accounts").delete().eq("client_user_id", client_user_id);
        if (google_accounts.length > 0) {
          await supabaseAdmin.from("client_ad_accounts").insert(
            google_accounts.map((cid: string) => ({ client_user_id, customer_id: cid }))
          );
        }
      }

      // Meta accounts
      if (Array.isArray(meta_accounts)) {
        await supabaseAdmin.from("client_meta_ad_accounts").delete().eq("client_user_id", client_user_id);
        if (meta_accounts.length > 0) {
          await supabaseAdmin.from("client_meta_ad_accounts").insert(
            meta_accounts.map((aid: string) => ({ client_user_id, ad_account_id: aid }))
          );
        }
      }

      // GA4 properties
      if (Array.isArray(ga4_properties)) {
        await supabaseAdmin.from("client_ga4_properties").delete().eq("client_user_id", client_user_id);
        if (ga4_properties.length > 0) {
          await supabaseAdmin.from("client_ga4_properties").insert(
            ga4_properties.map((pid: string) => ({ client_user_id, property_id: pid }))
          );
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
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
