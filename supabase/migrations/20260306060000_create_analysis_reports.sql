-- Analysis Reports: stores full deep-analysis results from Claude
create table analysis_reports (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references auth.users(id) on delete cascade,
  score integer not null check (score >= 1 and score <= 10),
  resumo text not null,
  tendencia text not null check (tendencia in ('melhorando', 'estavel', 'piorando')),
  previsao text,
  alertas_criticos jsonb not null default '[]',
  oportunidades jsonb not null default '[]',
  otimizacoes jsonb not null default '[]',
  dados_periodo jsonb,
  modelo_ia text,
  created_at timestamptz not null default now()
);

-- Index for fast lookups by client + recency
create index idx_analysis_reports_client_created
  on analysis_reports (client_id, created_at desc);

-- RLS
alter table analysis_reports enable row level security;

-- Managers can read analysis for their linked clients
create policy "managers_read_analysis" on analysis_reports
  for select using (
    client_id in (
      select client_user_id from client_manager_links
      where manager_id = auth.uid()
    )
    or exists (
      select 1 from user_roles where user_id = auth.uid() and role = 'admin'
    )
  );

-- Service role inserts (edge functions use service role key)
-- No insert policy needed since edge functions bypass RLS
