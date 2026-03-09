## Correções aplicadas — Pipeline de dados Meta/Google Ads

### Bug 1 ✅ — `sync-daily-metrics`: `leads` agora inclui `purchases + conversions`
### Bug 2 ✅ — `sync-daily-metrics`: campanhas Meta agora persistem `purchases` e `registrations`
### Bug 3 ✅ — `fetch-ads-data`: campanhas Meta usam `account_id` real de cada campanha
### Bug 4 ✅ — `fetch-ads-data`: Google Ads agora persiste métricas per-account (não mais agregado)

## Melhorias aplicadas — Central de Conexões

### Fix 1 ✅ — Sincronizar Google + GA4 além de Meta (botão agora chama todas as plataformas conectadas em paralelo)
### Fix 2 ✅ — Auto-refresh de token Google via refresh_token (função `refreshGoogleToken` na edge function)
### Fix 3 ✅ — Limpar contas ao desconectar (action `disconnect` na edge function deleta contas associadas)
### Fix 4 ✅ — Status WhatsApp baseado em dados reais (não mais hardcoded `connected: true`)
### UX 1 ✅ — Mensagens de erro detalhadas (toasts agora mostram motivo do erro)
### UX 2 ✅ — Data da última sincronização (exibida ao lado do status)
### UX 3 ✅ — Indicador de token expirado (badge + botão "Reconectar")
### UX 4 ✅ — Busca/filtro de contas (campo de busca aparece quando há mais de 5 contas)

## Correções aplicadas — Análise com IA

### Fix 1 ✅ — Migração para Lovable AI Gateway (de Anthropic para `google/gemini-2.5-flash`)
### Fix 2 ✅ — Timeout aumentado de 30s para 60s nas chamadas de IA
### Fix 3 ✅ — Tratamento de erros 429 (rate limit) e 402 (créditos) com mensagens específicas
