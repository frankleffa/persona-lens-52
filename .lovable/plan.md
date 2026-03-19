

## Plano: Corrigir contagem de Cadastros (Registrations) do Meta Ads

### Problema
O sistema soma `lead` + `complete_registration` (e suas variantes pixel) como um único valor de "Cadastros". No Gerenciador de Anúncios do Meta, esses são eventos distintos. Isso causa inflação no número exibido — ex: se uma campanha tem 10 leads E 10 complete_registrations, o sistema mostra 20 "cadastros" quando deveria mostrar apenas um dos dois.

### Causa raiz
Em `fetch-ads-data/index.ts` e `sync-daily-metrics/index.ts`, o filtro de `registrationActions` inclui tanto `lead` quanto `complete_registration` no mesmo somatório.

### Solução
Separar a extração: usar **apenas `complete_registration`** (e sua variante pixel) como "Cadastros", e manter `lead` (e sua variante pixel) separado como "Leads". O campo `leads` no banco já existe e hoje é calculado como `purchases + registrations` — passará a ter valor próprio vindo do evento `lead` da API.

### Mudanças

**1. `supabase/functions/fetch-ads-data/index.ts`**
- Registrations: filtrar apenas `complete_registration` e `offsite_conversion.fb_pixel_complete_registration`
- Leads: extrair separadamente de `lead` e `offsite_conversion.fb_pixel_lead`
- Aplicar em todos os 4 blocos onde o filtro aparece (insights de conta, campanhas, geo, hourly)

**2. `supabase/functions/sync-daily-metrics/index.ts`**
- Mesma separação nos 2 blocos de extração (métricas de conta e campanhas)

### Arquivos alterados
- `supabase/functions/fetch-ads-data/index.ts`
- `supabase/functions/sync-daily-metrics/index.ts`

