import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Kirvano Webhook Handler
 *
 * Eventos tratados:
 *   - purchase_approved   → ativa assinatura
 *   - purchase_canceled   → cancela assinatura
 *   - purchase_refunded   → cancela assinatura
 *   - subscription_canceled → cancela assinatura
 *
 * Configure a URL do webhook no painel Kirvano:
 *   https://SEU_PROJECT_ID.supabase.co/functions/v1/kirvano-webhook
 *
 * Variável de ambiente necessária:
 *   KIRVANO_WEBHOOK_TOKEN — token secreto configurado na Kirvano
 *     (Painel Kirvano > Integrações > Webhook > Token)
 */

serve(async (req) => {
  // Validação do token secreto enviado pela Kirvano no header
  const token = req.headers.get("x-kirvano-token") ?? req.headers.get("authorization");
  const expectedToken = Deno.env.get("KIRVANO_WEBHOOK_TOKEN");

  if (expectedToken && token !== expectedToken && token !== `Bearer ${expectedToken}`) {
    console.warn("[kirvano-webhook] Token inválido");
    return new Response("Unauthorized", { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  console.log("[kirvano-webhook] Evento recebido:", JSON.stringify(body));

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Kirvano envia: event, purchase.email, purchase.id, purchase.status
  // Adapte os campos conforme a documentação atual da Kirvano
  const event = (body.event as string) ?? (body.type as string) ?? "";
  const purchase = (body.purchase as Record<string, unknown>) ?? body;
  const email = (purchase.email as string) ?? (body.email as string) ?? "";
  const purchaseId = (purchase.id as string) ?? (body.purchase_id as string) ?? "";
  const productId = (purchase.product_id as string) ?? "";

  if (!email) {
    console.warn("[kirvano-webhook] E-mail não encontrado no payload");
    return new Response("E-mail ausente no payload", { status: 422 });
  }

  // Busca o user_id pelo e-mail
  const { data: userRecord, error: userError } = await supabase
    .rpc("get_user_id_by_email", { p_email: email.toLowerCase() });

  if (userError || !userRecord) {
    // Usuário ainda não existe — salva pendência para processar quando ele se cadastrar
    console.log(`[kirvano-webhook] Usuário não encontrado para ${email}. Salvando pendência.`);
    await supabase.from("pending_activations").upsert({
      email: email.toLowerCase(),
      purchase_id: purchaseId,
      event,
      product_id: productId,
      payload: body,
      updated_at: new Date().toISOString(),
    }, { onConflict: "email" });

    return new Response(JSON.stringify({ received: true, pending: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const userId = userRecord as string;

  switch (event) {
    case "purchase_approved":
    case "purchase_complete":
    case "PURCHASE_APPROVED": {
      await supabase.from("subscriptions").upsert({
        user_id: userId,
        kirvano_purchase_id: purchaseId,
        kirvano_product_id: productId,
        status: "active",
        plan: "founders",
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

      // Remove pendência se existia
      await supabase.from("pending_activations").delete().eq("email", email.toLowerCase());

      console.log(`[kirvano-webhook] Assinatura ativada para ${email}`);
      break;
    }

    case "purchase_canceled":
    case "purchase_refunded":
    case "subscription_canceled":
    case "PURCHASE_CANCELED":
    case "PURCHASE_REFUNDED": {
      await supabase.from("subscriptions").update({
        status: "canceled",
        updated_at: new Date().toISOString(),
      }).eq("user_id", userId);

      console.log(`[kirvano-webhook] Assinatura cancelada para ${email}`);
      break;
    }

    default:
      console.log(`[kirvano-webhook] Evento não tratado: ${event}`);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
