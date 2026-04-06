import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { email, valor_pago } = await req.json();
    if (!email || valor_pago === undefined) {
      return new Response(
        JSON.stringify({ error: "Os campos 'email' e 'valor_pago' são obrigatórios." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: lead, error: fetchErr } = await supabase
      .from("leads")
      .select("id, ltv_total")
      .eq("email", email)
      .single();

    if (fetchErr || !lead) {
      return new Response(JSON.stringify({ error: "Lead não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const novoLtvTotal = (parseFloat(lead.ltv_total) || 0) + parseFloat(valor_pago);

    await supabase.from("leads").update({ ltv_total: novoLtvTotal }).eq("id", lead.id);

    return new Response(
      JSON.stringify({ status: "sucesso", novoLtv: novoLtvTotal }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
