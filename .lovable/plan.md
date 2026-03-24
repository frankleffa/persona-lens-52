

## Diagnóstico: Cadastros inflados

### Causa raiz
Dois arquivos **não foram corrigidos** na correção anterior e ainda somam `lead` + `complete_registration` como um único número de "cadastros/registrations":

1. **`backfill-metrics/index.ts`** — linhas 246-252 (métricas de conta) e 294-300 (campanhas): filtram `complete_registration` + `lead` juntos como `leads`
2. **`analyze-client/index.ts`** — linhas 101-107 (métricas de conta) e 157-162 (campanhas): mesma mistura

Isso significa que **dados backfillados e análises de IA** usam números inflados.

### Solução
Aplicar a mesma separação já feita em `fetch-ads-data` e `sync-daily-metrics`:
- **Registrations** = apenas `complete_registration` + `fb_pixel_complete_registration`
- **Leads** = apenas `lead` + `fb_pixel_lead`
- Os dois valores são campos separados no banco (`registrations` e `leads`)

### Mudanças

**1. `supabase/functions/backfill-metrics/index.ts`**
- Linhas 246-252 (account metrics): separar em dois filtros — `registrationActions` (só complete_registration) e `leadActions` (só lead)
- Atualizar `metricsToUpsert` para usar `registrations` e `leads` separadamente
- Linhas 294-300 (campaigns): mesma separação

**2. `supabase/functions/analyze-client/index.ts`**
- Linhas 101-107 (account metrics): separar `regActs` em registrations-only, criar `leadActs` para leads-only
- Linhas 157-162 (campaign metrics): mesma separação

### Impacto
Após o fix, os dados novos virão corretos. Dados já backfillados com valores inflados precisarão de um re-backfill para corrigir.

