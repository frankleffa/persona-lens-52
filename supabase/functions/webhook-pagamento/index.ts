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

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método não permitido. Use POST." }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // 1. Recebendo os Inputs (email e valor_pago)
    const body = await req.json();
    const { email, valor_pago } = body;

    // Validações básicas de segurança
    if (!email || valor_pago === undefined) {
      return new Response(JSON.stringify({ error: "Os campos 'email' e 'valor_pago' são obrigatórios." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const valorNumerico = parseFloat(valor_pago);
    if (isNaN(valorNumerico)) {
      return new Response(JSON.stringify({ error: "O 'valor_pago' deve ser um número." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!; 
    const supabase = createClient(supabaseUrl, supabaseKey);

    // AÇÃO 1: Buscar o Lead (Query/Get Record)
    const { data: lead, error: fetchError } = await supabase
      .from("leads")
      .select("id, ltv_total")
      .eq("email", email)
      .single(); // '.single()' garante que só pegamos 1 registro, e dá erro se não existir

    if (fetchError || !lead) {
      return new Response(JSON.stringify({ error: "Lead não encontrado. O cadastro deve ser feito antes da compra." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // AÇÃO 2: A Matemática (Math/Calculate)
    // Pega o valor existente (ou assume 0 caso ainda não exista) e soma o valor pago
    const ltvExistente = typeof lead.ltv_total === "number" ? lead.ltv_total : parseFloat(lead.ltv_total || 0);
    const novoLtvTotal = ltvExistente + valorNumerico;

    // AÇÃO 3: Atualizar o Banco (Update Record)
    const { error: updateError } = await supabase
      .from("leads")
      .update({ ltv_total: novoLtvTotal })
      .eq("id", lead.id);

    if (updateError) {
      throw updateError;
    }

    // Resposta de Sucesso (Response Status 200)
    return new Response(JSON.stringify({ 
      status: "sucesso", 
      mensagem: "Pagamento adicionado ao LTV com sucesso!",
      novo_ltv_total: novoLtvTotal
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Erro interno no Webhook de Pagamento:", msg);
    return new Response(JSON.stringify({ status: "erro", detalhes: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
