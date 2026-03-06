-- ============================================================
-- Deep Analysis System: multi-vertical analysis, automation, WhatsApp reports
-- ============================================================

-- 1. Config de análise por cliente (multi-vertical)
create table if not exists client_analysis_config (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references auth.users(id) unique not null,
  vertical text not null default 'ecommerce'
    check (vertical in ('ecommerce', 'igaming', 'saas', 'infoproduto', 'servicos', 'app', 'leadgen', 'outro')),
  primary_metric text not null default 'purchases'
    check (primary_metric in ('purchases', 'ftd', 'leads', 'registrations', 'messages', 'revenue')),
  primary_metric_label text not null default 'Compras',
  cpa_target numeric,
  roas_target numeric,
  monthly_budget numeric,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table client_analysis_config enable row level security;

create policy "managers_manage_analysis_config" on client_analysis_config
  for all using (
    client_id in (
      select client_user_id from client_manager_links where manager_id = auth.uid()
    )
    or exists (select 1 from user_roles where user_id = auth.uid() and role = 'admin')
    or client_id = auth.uid()
  );

-- 2. Relatórios de análise profunda
create table if not exists analysis_reports (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references auth.users(id) not null,
  score integer check (score >= 1 and score <= 10),
  resumo text,
  tendencia text check (tendencia in ('melhorando', 'estavel', 'piorando')),
  previsao text,
  alertas_criticos jsonb default '[]'::jsonb,
  oportunidades jsonb default '[]'::jsonb,
  otimizacoes jsonb default '[]'::jsonb,
  dados_periodo jsonb,
  modelo_ia text,
  vertical_usado text,
  metrica_primaria_usada text,
  created_at timestamptz default now()
);

alter table analysis_reports enable row level security;

create policy "managers_read_analysis_reports" on analysis_reports
  for select using (
    client_id in (
      select client_user_id from client_manager_links where manager_id = auth.uid()
    )
    or exists (select 1 from user_roles where user_id = auth.uid() and role = 'admin')
    or client_id = auth.uid()
  );

create policy "service_insert_analysis_reports" on analysis_reports
  for insert with check (true);

create index idx_analysis_reports_client_date on analysis_reports(client_id, created_at desc);

-- 3. Regras de automação
create table if not exists automation_rules (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references auth.users(id) not null,
  manager_id uuid references auth.users(id) not null,
  rule_type text not null
    check (rule_type in ('pause_high_cpa', 'scale_good_performer', 'pause_no_conversion', 'alert_only')),
  is_active boolean default true,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table automation_rules enable row level security;

create policy "managers_manage_automation_rules" on automation_rules
  for all using (
    manager_id = auth.uid()
    or exists (select 1 from user_roles where user_id = auth.uid() and role = 'admin')
  );

-- 4. Log de ações automáticas
create table if not exists automation_log (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references auth.users(id) not null,
  rule_id uuid references automation_rules(id),
  action_taken text not null
    check (action_taken in ('paused_campaign', 'increased_budget', 'alert_sent', 'skipped')),
  campaign_name text,
  external_campaign_id text,
  details jsonb default '{}'::jsonb,
  executed_at timestamptz default now()
);

alter table automation_log enable row level security;

create policy "managers_read_automation_log" on automation_log
  for select using (
    client_id in (
      select client_user_id from client_manager_links where manager_id = auth.uid()
    )
    or exists (select 1 from user_roles where user_id = auth.uid() and role = 'admin')
  );

create policy "service_insert_automation_log" on automation_log
  for insert with check (true);

create index idx_automation_log_client_date on automation_log(client_id, executed_at desc);

-- 5. Config de relatório WhatsApp
create table if not exists whatsapp_report_config (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references auth.users(id) unique not null,
  manager_id uuid references auth.users(id) not null,
  is_active boolean default false,
  send_hour integer default 8 check (send_hour >= 0 and send_hour <= 23),
  phone_number text not null,
  last_sent_at timestamptz,
  created_at timestamptz default now()
);

alter table whatsapp_report_config enable row level security;

create policy "managers_manage_wa_config" on whatsapp_report_config
  for all using (
    manager_id = auth.uid()
    or exists (select 1 from user_roles where user_id = auth.uid() and role = 'admin')
  );
