-- Substitui colunas Stripe por campos Kirvano na tabela subscriptions
alter table public.subscriptions
  drop column if exists stripe_customer_id,
  drop column if exists stripe_subscription_id,
  add column if not exists kirvano_purchase_id text,
  add column if not exists kirvano_product_id text;

-- Tabela para ativações pendentes (compra antes do cadastro)
create table if not exists public.pending_activations (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  purchase_id text,
  event text,
  product_id text,
  payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pending_activations enable row level security;

-- Somente service_role acessa
create policy "Service role manages pending_activations"
  on public.pending_activations for all
  using (auth.role() = 'service_role');

-- Função auxiliar: retorna user_id pelo e-mail (acesso via service_role)
create or replace function public.get_user_id_by_email(p_email text)
returns uuid
language sql
security definer
as $$
  select id from auth.users where lower(email) = lower(p_email) limit 1;
$$;
