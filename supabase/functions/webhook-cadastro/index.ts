import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Tratamento de CORS pré-voo (preflight)
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Verifica se o método é POST (como o Gemini indicou)
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método não permitido. Use POST." }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // 1. Recebendo os Inputs
    const body = await req.json();
    const { email, utm_source, utm_medium, utm_campaign } = body;

    if (!email) {
      return new Response(JSON.stringify({ error: "O campo 'email' é obrigatório." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Conectando as engrenagens ao Banco de Dados (Supabase)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!; // Garante permissão para inserir o dado
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 3. Workflow: Database Operation - Insert
    const { error } = await supabase
      .from("leads")
      .insert([
        {
          email,
          utm_source: utm_source || null,
          utm_medium: utm_medium || null,
          utm_campaign: utm_campaign || null,
          // ltv_total e data_cadastro são preenchidos automaticamente com 0 e NOW() pelo banco!
        },
      ]);

    if (error) {
      // Se o email já existir (Marcamos como Único na tabela), podemos apenas retornar sucesso para não quebrar o cliente, ou avisar.
      if (error.code === '23505') {
         return new Response(JSON.stringify({ status: "sucesso", info: "O Lead já existia e não foi duplicado." }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
         });
      }
      throw error;
    }

    // 4. Resposta de Sucesso
    return new Response(JSON.stringify({ status: "sucesso" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Erro interno no Webhook:", msg);
    return new Response(JSON.stringify({ status: "erro", detalhes: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
