-- Tabela de assinaturas Stripe
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text not null default 'inactive' check (status in ('active', 'canceled', 'inactive', 'past_due', 'trialing')),
  plan text not null default 'founders',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

-- RLS
alter table public.subscriptions enable row level security;

-- Usuário vê apenas sua própria assinatura
create policy "Users can view own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- Apenas service role pode inserir/atualizar (via webhook)
create policy "Service role manages subscriptions"
  on public.subscriptions for all
  using (auth.role() = 'service_role');

-- Índice para busca por customer ID no webhook
create index if not exists subscriptions_stripe_customer_id_idx
  on public.subscriptions(stripe_customer_id);
