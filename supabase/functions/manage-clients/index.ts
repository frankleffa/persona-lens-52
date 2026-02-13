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

    // LIST clients for this manager
    if (!action || action === "list") {
      const { data: links, error } = await supabaseAdmin
        .from("client_manager_links")
        .select("id, client_user_id, client_label, created_at")
        .eq("manager_id", managerId);

      if (error) throw new Error(error.message);

      // Get profile info for each client
      const clientIds = (links || []).map((l) => l.client_user_id);
      let profiles: Array<{ id: string; email: string | null; full_name: string | null }> = [];
      if (clientIds.length > 0) {
        const { data: p } = await supabaseAdmin
          .from("profiles")
          .select("id, email, full_name")
          .in("id", clientIds);
        profiles = p || [];
      }

      const clients = (links || []).map((link) => {
        const profile = profiles.find((p) => p.id === link.client_user_id);
        return {
          ...link,
          email: profile?.email || null,
          full_name: profile?.full_name || null,
        };
      });

      return new Response(JSON.stringify({ clients }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // CREATE a new client user
    if (action === "create") {
      const { email, password, full_name, client_label } = body;

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
        });

      if (linkError) throw new Error(linkError.message);

      return new Response(JSON.stringify({ success: true, client_user_id: clientUserId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // UPDATE client label
    if (action === "update") {
      const { link_id, client_label } = body;
      if (!link_id) {
        return new Response(JSON.stringify({ error: "link_id is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabaseAdmin
        .from("client_manager_links")
        .update({ client_label })
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
