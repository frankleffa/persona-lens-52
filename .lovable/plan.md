## Correções aplicadas — Pipeline de dados Meta/Google Ads

### Bug 1 ✅ — `sync-daily-metrics`: `leads` agora inclui `purchases + conversions`
### Bug 2 ✅ — `sync-daily-metrics`: campanhas Meta agora persistem `purchases` e `registrations`
### Bug 3 ✅ — `fetch-ads-data`: campanhas Meta usam `account_id` real de cada campanha
### Bug 4 ✅ — `fetch-ads-data`: Google Ads agora persiste métricas per-account (não mais agregado)

Todas as 4 correções foram aplicadas em `sync-daily-metrics/index.ts` e `fetch-ads-data/index.ts`.
