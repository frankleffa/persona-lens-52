
# Adicionar Custo por Compra e Custo por Cadastro

## O que será adicionado

Duas novas métricas derivadas calculadas a partir dos dados já disponíveis:

- **Custo por Compra** = Investimento ÷ Compras
- **Custo por Cadastro** = Investimento ÷ Cadastros

Essas métricas aparecerão em dois lugares:
1. **Seção Meta Ads** (cards no topo do dashboard, controláveis via Permissões)
2. **Tabela de Campanhas** (novas colunas opcionais, visíveis via menu "Colunas")

---

## Mudanças por arquivo

### 1. `src/lib/types.ts`

Adicionar 4 itens ao tipo `MetricKey`:
```ts
| "meta_cost_per_purchase"
| "meta_cost_per_registration"
| "camp_cost_per_purchase"
| "camp_cost_per_registration"
```

Adicionar as definições ao `METRIC_DEFINITIONS`:
```ts
{ key: "meta_cost_per_purchase", label: "Custo/Compra", module: "Meta Ads", description: "Custo por compra no Meta Ads" },
{ key: "meta_cost_per_registration", label: "Custo/Cadastro", module: "Meta Ads", description: "Custo por cadastro no Meta Ads" },
{ key: "camp_cost_per_purchase", label: "Custo/Compra (Camp.)", module: "Campanhas", description: "Custo por compra por campanha" },
{ key: "camp_cost_per_registration", label: "Custo/Cadastro (Camp.)", module: "Campanhas", description: "Custo por cadastro por campanha" },
```

Adicionar ao `MOCK_METRIC_DATA` e ao `PLATFORM_GROUPS` (grupo Meta e Campanhas).

### 2. `src/hooks/useAdsData.tsx`

No objeto `metaAdsMetrics` (linha ~551), adicionar:
```ts
cost_per_purchase: {
  key: "meta_cost_per_purchase" as const,
  value: data.meta_ads.purchases > 0
    ? formatCurrency(data.meta_ads.investment / data.meta_ads.purchases)
    : "—",
  change: 0,
  trend: "neutral" as const,
},
cost_per_registration: {
  key: "meta_cost_per_registration" as const,
  value: data.meta_ads.registrations > 0
    ? formatCurrency(data.meta_ads.investment / data.meta_ads.registrations)
    : "—",
  change: 0,
  trend: "neutral" as const,
},
```

### 3. `src/components/ClientDashboard.tsx`

No `META_METRIC_MAP`, adicionar:
```ts
cost_per_purchase: "meta_cost_per_purchase",
cost_per_registration: "meta_cost_per_registration",
```

No `META_LABELS`, adicionar:
```ts
cost_per_purchase: "Custo/Compra",
cost_per_registration: "Custo/Cadastro",
```

### 4. `src/components/CampaignTable.tsx`

Adicionar dois novos tipos à lista de colunas:
```ts
{ key: "camp_cost_per_purchase", label: "Custo/Compra", shortLabel: "C/Compra" },
{ key: "camp_cost_per_registration", label: "Custo/Cadastro", shortLabel: "C/Cadastro" },
```

E na renderização das células, calcular:
```ts
{col.key === "camp_cost_per_purchase" && 
  (c.purchases && c.purchases > 0 
    ? `R$ ${(c.spend / c.purchases).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` 
    : "—")}
{col.key === "camp_cost_per_registration" && 
  (c.registrations && c.registrations > 0 
    ? `R$ ${(c.spend / c.registrations).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` 
    : "—")}
```

Atualizar também o tipo `CampaignColumnKey` e o array `CAMPAIGN_COLUMN_KEYS` em `ClientDashboard.tsx`.

---

## Comportamento esperado

- Na seção **Meta Ads** do dashboard, aparecerão os cards "Custo/Compra" e "Custo/Cadastro" (visíveis por padrão, controláveis via Permissões)
- Na **Tabela de Campanhas**, as colunas ficam disponíveis no menu "Colunas" mas não aparecem por padrão (para não sobrecarregar a view)
- Se não houver compras ou cadastros, exibe "—" em vez de dividir por zero

## Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `src/lib/types.ts` | Novos MetricKey, definições e grupos |
| `src/hooks/useAdsData.tsx` | Calcular e expor `cost_per_purchase` e `cost_per_registration` |
| `src/components/ClientDashboard.tsx` | Mapear novas chaves no META_METRIC_MAP e META_LABELS |
| `src/components/CampaignTable.tsx` | Novas colunas opcionais na tabela |
