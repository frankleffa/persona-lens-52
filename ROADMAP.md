# AdScape — Roadmap técnico (front novo → produto real)

Status: **front-end recriado** (Next 15 + React 19 + Tailwind 4) rodando com dados de
exemplo. O **backend já existe** no legado (`supabase/functions` + 70 migrações) e cobre
quase tudo. O trabalho agora é majoritariamente **reconectar a UI nova ao backend** +
refatorar o que estiver fraco. Estimativas em dias de dev (1 dev focado).

## Ativos que já temos (reaproveitar)

| Área | Tabelas | Edge functions |
| --- | --- | --- |
| Auth/tenant | `profiles`, `user_roles`, `client_manager_links` | `manage-clients` |
| Conexões | `oauth_connections`, `*_ad_accounts`, `*_ga4_properties`, `*_meta_ad_accounts` | `oauth-init`, `oauth-callback`, `manage-connections` |
| Métricas | `daily_metrics`, `daily_campaigns` | `fetch-ads-data`, `sync-daily-metrics`, `backfill-metrics` |
| Campanhas (escrita) | `campaign_actions_log`, `automation_rules`, `automation_log` | `manage-campaigns`, `auto-optimize`, `ai-optimize`, `claude-optimize` |
| CRM | `leads` | — |
| Relatórios/WhatsApp | `report_templates`, `report_instances`, `client_report_settings`, `whatsapp_*` | `generate-client-report-xlsx`, `cron-daily-reports`, `cron-whatsapp-reports`, `evolution-whatsapp` |
| Execução | `optimization_tasks`, `campaign_comments` | — |
| Billing | `plans`, `subscriptions` | `create-checkout`, `customer-portal`, `check-subscription`, `webhook-pagamento` |
| IA/alertas/LTV | `analysis_reports`, `account_balance_alerts`, `meta_customers`, `meta_orders` | `deep-analysis`, `analyze-client`, `check-balance-alerts`, `ltv-webhook` |

---

## Fase 0 — Fundação de dados (1–2 dias) · **bloqueia tudo**
- Supabase no Next: client browser (feito), **client server + middleware** (`@supabase/ssr`).
- **Proteção de rotas** do grupo `(app)` via middleware (sessão em cookie, não localStorage).
- Sessão server-side no layout do app; helper para chamar edge functions com o token.
- Reusar: `profiles`, `user_roles`, `client_manager_links` + RLS já existentes.
- **Deploy no Vercel** já aqui (front pronto) + cadastrar secrets `NEXT_PUBLIC_*` e do servidor.

## Fase 1 — Conexões + ingestão (2–4 dias) · *núcleo*
- Ligar a tela **Conexões** a `oauth-init` / `oauth-callback` / `manage-connections`.
- Seleção de contas ativas → salvar (já existe a action).
- Sync de leitura via `fetch-ads-data` / `sync-daily-metrics`; agendar `backfill-metrics`.
- ⚠️ **Bloqueio externo:** app/escopos OAuth da Meta e Google (token de desenvolvedor do
  Google Ads API, app Meta). Em produção exige **App Review + verificação de negócio**.
  MVP: rodar com contas de dev/test enquanto o review tramita.

## Fase 2 — Dashboard + Campanhas (leitura) (2–3 dias)
- Trocar mocks por `daily_metrics` / `daily_campaigns` (portar `useAdsData` / `ads-api` do legado).
- KPIs, gráfico, repartições, níveis (campanha/conjunto/anúncio) com dados reais.
- Período/comparativo plugados.

## Fase 3 — Relatórios + WhatsApp (3–5 dias) · **diferencial comercial**
- Persistir templates/agendamentos (`report_templates`, `report_instances`, `whatsapp_report_settings`).
- Geração do relatório (PDF/imagem) — reusar `generate-client-report-xlsx` ou gerar PDF do documento novo.
- Disparo via `evolution-whatsapp`; status (enviado/entregue/lido) em `whatsapp_report_logs`.
- Crons: `cron-whatsapp-reports` / `cron-daily-reports` (Supabase scheduled ou Vercel Cron).
- ⚠️ **Bloqueio:** instância da Evolution API (não-oficial) — avaliar **WhatsApp Cloud API**
  oficial para escala/risco de ban.

## Fase 4 — CRM + Execução persistidos (1–2 dias) · *rápido*
- CRM kanban → `leads` (status = etapa do funil).
- Execução kanban → `optimization_tasks` + `campaign_comments`.

## Fase 5 — Billing (2–3 dias) · *vira cobrável*
- `plans` / `subscriptions` + `create-checkout` / `customer-portal` / `check-subscription` / `webhook-pagamento`.
- Gating de plano na UI (limites de clientes/usuários já desenhados em Configurações).
- ⚠️ Conta Stripe (ou Hotmart, já há `hotmart_webhook_logs`).

## Fase 6 — Ações de escrita + motor de regras (4–8 dias + review)
- Pausar/ativar e **editar orçamento** de verdade via `manage-campaigns`.
- Motor de **regras automáticas** (`automation_rules` + `auto-optimize` em cron) executando.
- Log em `campaign_actions_log` / `automation_log`.
- ⚠️ **Bloqueio externo forte:** escrita na Meta/Google exige App Review/permissões avançadas
  (semanas). É o que viabiliza "não depender do Gerenciador" — tratar como fase própria.

## Fase 7 — IA, alertas, LTV (opcional / upsell)
- Insights e otimização sugerida (`deep-analysis` / `analyze-client` / `claude-optimize` — já na Anthropic).
- Alertas de saldo (`check-balance-alerts`).
- LTV (`meta_customers`, `meta_orders`, `ltv-webhook`).

## Transversal (contínuo)
- Re-habilitar TS/ESLint estrito (hoje `ignoreDuringBuilds` no Next durante a migração).
- Observabilidade (logs/erros), onboarding do gestor, testes dos fluxos críticos.
- Migrar crons do legado para Supabase Scheduled Functions ou Vercel Cron.

---

## Sequência recomendada (MVP cobrável)
**0 → 1 → 2 → 3 → 5**. Com isso o gestor conecta contas, vê dados reais, recebe relatório
no WhatsApp e paga. CRM/Execução (4) entram fácil em paralelo. Escrita + regras (6) e
IA/LTV (7) são evolução. Deploy no Vercel pode ir ao ar já na Fase 0.

## Caminho crítico / riscos externos
1. **Meta App Review + verificação de negócio** (leitura ampla e, principalmente, escrita).
2. **Google Ads API developer token** (aprovação).
3. **WhatsApp**: Evolution (rápido, porém não-oficial/risco) vs Cloud API (oficial, mais setup).
4. **Stripe/Hotmart** para cobrança.
