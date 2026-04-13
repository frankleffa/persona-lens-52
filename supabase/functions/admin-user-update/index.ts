import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { user_id, new_password } = await req.json();

  // Update password
  const { error: pwError } = await adminClient.auth.admin.updateUserById(user_id, {
    password: new_password,
  });

  if (pwError) {
    return new Response(JSON.stringify({ error: pwError.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Sign out all sessions
  const { error: signOutError } = await adminClient.auth.admin.signOut(user_id, "global");

  return new Response(JSON.stringify({ 
    success: true, 
    password_updated: true,
    sessions_revoked: !signOutError,
    signout_error: signOutError?.message || null,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
