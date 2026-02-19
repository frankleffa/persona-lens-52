
# Diagnóstico: Por que o Investimento não bate com o valor real

## Causa Raiz Identificada — Bug crítico de persistência

O problema foi confirmado com dados reais do banco. Há **dois bugs encadeados** que causam a discrepância.

---

## Bug 1 — `fetch-ads-data`: Salva o total do PERÍODO como se fosse o dia de HOJE

**Evidência do banco (prova definitiva):**
```
Soma dos 13 dias históricos (06/02 a 18/02): R$ 2.080,94
Valor salvo em "hoje" (19/02):               R$ 2.080,94
```

Os valores são **idênticos**. Isso confirma: o investimento de "hoje" no banco é o total acumulado dos últimos 30 dias — não o gasto do dia.

**Por que acontece:**

O `fetch-ads-data` (linhas 699-746) faz a chamada com `meta_date_preset = "last_30d"` e usa `date_preset` para buscar dados acumulados de 30 dias. Depois, persiste esse total em uma única linha com `date = today`:

```ts
// O problema: sempre salva em date=today, mas o valor é o acumulado do período selecionado
const today = new Date().toISOString().split("T")[0]; // "2026-02-19"

metricsToUpsert.push({
  date: today,               // ← salva como "hoje"
  spend: mAds.investment,   // ← mas este valor é o acumulado dos últimos 30 dias!
  ...
});
```

**Fluxo do dashboard:**
1. Usuário seleciona "Últimos 30 dias"
2. `useAdsData.tsx` busca do banco: `daily_metrics WHERE date >= (hoje - 30) AND date <= hoje`
3. Soma todos os registros: histórico backfill (correto, por dia) + "hoje" (errado, 30 dias acumulados)
4. **Resultado: investimento duplicado/inflado**

---

## Bug 2 — `sync-daily-metrics`: Ainda usa `.find()` para cadastros — não captura `complete_registration`

No `sync-daily-metrics/index.ts` linha 220-223, o código ainda usa a lógica antiga:
```ts
const leadAction = d.actions?.find((a) =>
  a.action_type === "lead" || a.action_type === "offsite_conversion.fb_pixel_lead"
  // ← NÃO inclui complete_registration (Concluir Inscrição)!
);
```

Isso significa que o **sync diário automático** (que roda de madrugada para salvar dados de ontem) também está com a lógica incorreta de cadastros. A correção do `fetch-ads-data` e `backfill-metrics` foi feita, mas o `sync-daily-metrics` ficou de fora.

---

## Solução

### Fix 1 — `fetch-ads-data/index.ts` (linhas 699-759): NÃO persistir quando o período não é TODAY

O `fetch-ads-data` deve salvar no banco **apenas quando** a requisição é para o dia atual (`TODAY`). Para períodos históricos (`LAST_7_DAYS`, `LAST_14_DAYS`, `LAST_30_DAYS`), os dados já estão no banco via `backfill-metrics` e `sync-daily-metrics` — não precisa e não deve sobrescrever com totais acumulados.

```ts
// CORREÇÃO: Só persistir se o date_range for TODAY
const today = new Date().toISOString().split("T")[0];

// Só salva no banco se for consulta de hoje (não de períodos históricos)
const shouldPersist = dateRange === "TODAY" || body.meta_date_preset === "today";

if (shouldPersist) {
  // ... faz o upsert de metrics e campaigns
}
```

Isso resolve o problema fundamental: os dados históricos vêm do backfill/sync (corretos, por dia), e o `fetch-ads-data` persiste apenas o valor do dia atual.

### Fix 2 — `sync-daily-metrics/index.ts` (linhas 220-260): Adicionar `complete_registration` e usar `.filter()` + `.reduce()`

Aplicar a mesma correção que já foi feita no `fetch-ads-data` e `backfill-metrics`:

```ts
// ANTES (linha 220 - incompleto):
const leadAction = d.actions?.find((a) =>
  a.action_type === "lead" || a.action_type === "offsite_conversion.fb_pixel_lead"
);
const conversions = parseInt(leadAction?.value || "0");

// DEPOIS (inclui complete_registration + soma todos):
const regActions = d.actions?.filter((a) =>
  a.action_type === "offsite_conversion.fb_pixel_complete_registration" ||
  a.action_type === "complete_registration" ||
  a.action_type === "lead" ||
  a.action_type === "offsite_conversion.fb_pixel_lead"
) || [];
const conversions = regActions.reduce((sum, a) => sum + parseInt(a.value || "0"), 0);
```

E o mesmo para campanhas (linha 258):
```ts
// ANTES:
const leadAct = actions.find((a) => a.action_type === "lead" || ...);
const leads = parseInt(leadAct?.value || "0");

// DEPOIS:
const regActs = actions.filter((a) =>
  a.action_type === "offsite_conversion.fb_pixel_complete_registration" ||
  a.action_type === "complete_registration" ||
  a.action_type === "lead" ||
  a.action_type === "offsite_conversion.fb_pixel_lead"
);
const leads = regActs.reduce((sum, a) => sum + parseInt(a.value || "0"), 0);
```

---

## Impacto nos dados históricos (o que acontece com o "hoje" corrompido)

Após o fix, o registro de `date = 2026-02-19` com `spend = 2080.94` (total de 30 dias) precisa ser corrigido. Há duas abordagens:

**Opção A (automática):** Ao abrir o dashboard com "Hoje" selecionado, o `fetch-ads-data` persistirá o valor correto do dia — o upsert por `account_id,platform,date` sobrescreverá o valor errado.

**Opção B (imediata):** Executar a sync do dia de hoje manualmente para sobrescrever o registro com o valor correto de hoje.

A Opção A acontece naturalmente quando o manager abre o dashboard com o filtro "Hoje".

---

## Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/fetch-ads-data/index.ts` | Só persistir quando `dateRange === "TODAY"` |
| `supabase/functions/sync-daily-metrics/index.ts` | Adicionar `complete_registration` e usar `filter()+reduce()` (2 locais) |

---

## Por que o backfill está correto mas hoje não

O `backfill-metrics` funciona porque faz uma chamada específica por dia (`segments.date = '2026-01-26'`, etc.) e salva cada dia com a data correta. O `sync-daily-metrics` também funciona corretamente pois busca `yesterday` com `time_range = { since: dateStr, until: dateStr }`.

O problema é exclusivamente no `fetch-ads-data` quando chamado com períodos longos (last_7d, last_30d): ele busca o total acumulado e **escreve esse acumulado na linha de "hoje"**, contaminando os dados futuros.
