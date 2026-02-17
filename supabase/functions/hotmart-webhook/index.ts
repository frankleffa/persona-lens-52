import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const HOTMART_TOKEN = Deno.env.get("HOTMART_TOKEN");
    if (!HOTMART_TOKEN) {
      throw new Error("HOTMART_TOKEN not configured");
    }

    const body = await req.json();
    console.log("Hotmart webhook received:", JSON.stringify(body));

    // Validate hottok
    const hottok = body.hottok;
    if (hottok !== HOTMART_TOKEN) {
      console.error("Invalid hottok");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const event = body.event;
    const data = body.data;

    // Log webhook
    await supabase.from("hotmart_webhook_logs").insert({
      event_type: event,
      payload: body,
      processed: false,
    });

    if (event === "PURCHASE_APPROVED" || event === "PURCHASE_COMPLETE") {
      const buyerEmail = data?.buyer?.email;
      const buyerName = data?.buyer?.name;
      const productId = data?.product?.id?.toString();
      const subscriptionId = data?.subscription?.subscriber?.code;
      const transactionId = data?.purchase?.transaction;

      if (!buyerEmail) {
        throw new Error("No buyer email in webhook payload");
      }

      // Find matching plan by hotmart_product_id
      const { data: plan } = await supabase
        .from("plans")
        .select("id")
        .eq("hotmart_product_id", productId)
        .eq("is_active", true)
        .maybeSingle();

      // Check if user already exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(
        (u) => u.email === buyerEmail
      );

      let userId: string;

      if (existingUser) {
        userId = existingUser.id;
      } else {
        // Create user with random password (they'll reset it)
        const tempPassword = crypto.randomUUID();
        const { data: newUser, error: createError } =
          await supabase.auth.admin.createUser({
            email: buyerEmail,
            password: tempPassword,
            email_confirm: true,
            user_metadata: { full_name: buyerName || "" },
          });

        if (createError || !newUser.user) {
          throw new Error(`Failed to create user: ${createError?.message}`);
        }
        userId = newUser.user.id;
      }

      // Upsert subscription
      await supabase.from("subscriptions").upsert(
        {
          user_id: userId,
          plan_id: plan?.id || null,
          status: "active",
          started_at: new Date().toISOString(),
          hotmart_subscription_id: subscriptionId || null,
          hotmart_transaction_id: transactionId || null,
          hotmart_product_id: productId || null,
        },
        { onConflict: "user_id" }
      );

      // Mark webhook as processed
      await supabase
        .from("hotmart_webhook_logs")
        .update({ processed: true })
        .eq("event_type", event)
        .order("created_at", { ascending: false })
        .limit(1);

      console.log(`User ${buyerEmail} subscription activated`);
    } else if (
      event === "PURCHASE_CANCELED" ||
      event === "SUBSCRIPTION_CANCELLATION"
    ) {
      const buyerEmail = data?.buyer?.email;
      if (buyerEmail) {
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const user = existingUsers?.users?.find(
          (u) => u.email === buyerEmail
        );

        if (user) {
          await supabase
            .from("subscriptions")
            .update({
              status: "cancelled",
              cancelled_at: new Date().toISOString(),
            })
            .eq("user_id", user.id);

          console.log(`Subscription cancelled for ${buyerEmail}`);
        }
      }
    } else if (event === "PURCHASE_REFUNDED") {
      const buyerEmail = data?.buyer?.email;
      if (buyerEmail) {
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const user = existingUsers?.users?.find(
          (u) => u.email === buyerEmail
        );

        if (user) {
          await supabase
            .from("subscriptions")
            .update({
              status: "refunded",
              cancelled_at: new Date().toISOString(),
            })
            .eq("user_id", user.id);

          console.log(`Subscription refunded for ${buyerEmail}`);
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
