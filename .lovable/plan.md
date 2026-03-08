

## Plano: Auditoria completa do pipeline de dados do Meta Ads

Analisei todas as Edge Functions (`fetch-ads-data`, `sync-daily-metrics`, `backfill-metrics`) e o hook `useAdsData` de ponta a ponta. Encontrei **4 bugs** que afetam a precisão dos dados exibidos no dashboard.

---

### Bug 1 (CRÍTICO): `sync-daily-metrics` — campo `leads` exclui compras

**Arquivo:** `supabase/functions/sync-daily-metrics/index.ts`, linha 261

O campo `leads` é salvo como `conversions`, mas `conversions` aqui contém apenas cadastros (registrations). Compras (`purchases`) ficam de fora.

```text
ATUAL:    leads: conversions          // conversions = só registrations
CORRETO:  leads: purchases + conversions  // leads = purchases + registrations
```

**Impacto:** O CPA consolidado no dashboard fica inflado porque divide o investimento por menos conversões.

---

### Bug 2 (CRÍTICO): `sync-daily-metrics` — campanhas Meta sem `purchases` e `registrations`

**Arquivo:** `supabase/functions/sync-daily-metrics/index.ts`, linhas 336-355

O upsert de campanhas inclui `leads`, `messages`, `followers`, `ftd`, mas **não inclui `purchases` nem `registrations`**. Essas colunas existem na tabela `daily_campaigns` mas ficam com o valor default (0).

**Impacto:** Quando o dashboard lê campanhas do banco (períodos anteriores), as colunas `purchases` e `registrations` sempre mostram 0, mesmo que existam dados reais.

**Correção:** Adicionar `purchases: campPurchases` e `registrations: leads` (onde `leads` = soma dos eventos de cadastro) no objeto de campanha.

---

### Bug 3 (MÉDIO): `fetch-ads-data` — campanhas Meta atribuídas à conta errada

**Arquivo:** `supabase/functions/fetch-ads-data/index.ts`, linhas 996 e 1072

Ao persistir campanhas (tanto de hoje quanto de ontem), todas usam `metaAccountIds[0]` como `account_id`, independente de qual conta real a campanha pertence.

```text
ATUAL:    account_id: metaAccountIds[0] || "unknown"   // sempre a primeira conta
CORRETO:  account_id: <conta real de cada campanha>
```

**Impacto:** Para clientes com **múltiplas contas Meta**, as campanhas ficam todas sob a primeira conta. Isso pode causar filtragens incorretas e dados duplicados no dedup do frontend.

**Correção:** Adicionar `account_id` ao retorno de `fetchMetaAdsData` em cada campanha, e usar esse valor na persistência.

---

### Bug 4 (MÉDIO): `fetch-ads-data` — Google Ads persiste todas as contas em uma única linha

**Arquivo:** `supabase/functions/fetch-ads-data/index.ts`, linhas 841-860

O Google Ads agrega métricas de todas as contas e salva tudo sob `googleAccountIds[0]`. Diferente do Meta que já tem `per_account`, o Google não faz isso.

**Impacto:** Para clientes com múltiplas contas Google, os dados ficam todos sob uma conta só, e contas extras não aparecem no histórico.

**Correção:** Implementar `per_account` para Google Ads similar ao que já existe para Meta.

---

### Resumo das correções

| # | Arquivo | Mudança |
|---|---------|---------|
| 1 | `sync-daily-metrics` | `leads: purchases + conversions` |
| 2 | `sync-daily-metrics` | Adicionar `purchases` e `registrations` no upsert de campanhas |
| 3 | `fetch-ads-data` | Propagar `account_id` real nas campanhas Meta persistidas |
| 4 | `fetch-ads-data` | Implementar persistência per-account para Google Ads |

