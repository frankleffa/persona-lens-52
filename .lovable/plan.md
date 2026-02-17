

# Plano: Migrar de Hotmart para Stripe

## Resumo

Substituir toda a integracao de pagamento Hotmart pelo Stripe, incluindo: criar produtos/precos no Stripe, implementar checkout via Stripe Checkout Sessions, processar webhooks do Stripe para ativar/cancelar assinaturas, e limpar referencias ao Hotmart.

## Etapas

### 1. Habilitar integracao Stripe

Usar a ferramenta nativa do Lovable para conectar o Stripe ao projeto. Isso vai solicitar a secret key e disponibilizar as ferramentas de criacao de produtos/precos.

### 2. Criar produtos e precos no Stripe

Usando as ferramentas do Stripe:
- **Produto Solo** (R$ 97/mes) com preco recorrente mensal
- **Produto Growth** (R$ 197/mes) com preco recorrente mensal

### 3. Migrar schema do banco de dados

Migration SQL para:
- Adicionar colunas `stripe_price_id` e `stripe_product_id` na tabela `plans` (substituindo `hotmart_product_id` e `hotmart_offer_id`)
- Adicionar colunas `stripe_customer_id`, `stripe_subscription_id` na tabela `subscriptions` (substituindo `hotmart_*`)
- Remover colunas Hotmart das tabelas `plans` e `subscriptions`
- Criar tabela `stripe_webhook_logs` (substituindo `hotmart_webhook_logs`)
- Opcional: dropar tabela `hotmart_webhook_logs`

### 4. Criar edge function `stripe-webhook`

Nova edge function que:
- Valida assinatura do webhook usando `STRIPE_WEBHOOK_SECRET`
- Processa eventos:
  - `checkout.session.completed` -> cria/ativa assinatura
  - `customer.subscription.updated` -> atualiza status
  - `customer.subscription.deleted` -> cancela assinatura
  - `invoice.payment_failed` -> marca como `past_due`
- Faz match do plano via `stripe_price_id` na tabela `plans`
- Cria usuario automaticamente se nao existir (mesmo fluxo atual)

### 5. Criar edge function `create-checkout`

Nova edge function que:
- Recebe `price_id` e `user_id` (ou email)
- Cria um Stripe Customer (se nao existir)
- Cria uma Checkout Session com `mode: 'subscription'`
- Retorna a URL do checkout para redirect

### 6. Criar edge function `create-portal`

Nova edge function que:
- Recebe `customer_id`
- Cria uma sessao do Stripe Customer Portal
- Retorna a URL para o usuario gerenciar assinatura (cancelar, trocar cartao, etc.)

### 7. Atualizar frontend

- **UpgradeBanner.tsx**: Trocar link da Hotmart por chamada ao `create-checkout` com redirect para Stripe Checkout
- **Novo componente ManageSubscription**: Botao "Gerenciar assinatura" que abre o Stripe Customer Portal
- **Pagina de sucesso**: Rota `/checkout-success` para callback apos pagamento

### 8. Limpar codigo Hotmart

- Deletar `supabase/functions/hotmart-webhook/index.ts`
- Remover configuracao do hotmart-webhook no `supabase/config.toml`

## Secao Tecnica

```text
Arquivos criados:
- supabase/functions/stripe-webhook/index.ts
- supabase/functions/create-checkout/index.ts
- supabase/functions/create-portal/index.ts
- src/pages/CheckoutSuccess.tsx

Arquivos modificados:
- supabase/migrations/ -> Migration SQL (colunas Stripe, remover Hotmart)
- src/components/UpgradeBanner.tsx -> Chamar create-checkout
- src/hooks/useSubscription.ts -> Adicionar stripe_customer_id
- src/App.tsx -> Rota /checkout-success
- supabase/config.toml -> Adicionar stripe-webhook (verify_jwt=false)

Arquivos deletados:
- supabase/functions/hotmart-webhook/index.ts

Secrets necessarios:
- STRIPE_SECRET_KEY (via ferramenta Stripe)
- STRIPE_WEBHOOK_SECRET (configurado apos criar webhook)

Tabelas impactadas:
- plans: +stripe_product_id, +stripe_price_id, -hotmart_product_id, -hotmart_offer_id
- subscriptions: +stripe_customer_id, +stripe_subscription_id, -hotmart_*
- stripe_webhook_logs: nova tabela
- hotmart_webhook_logs: removida
```
