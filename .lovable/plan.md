
# Corrigir: Métricas de Compra e Cadastro em Campanhas + Fidelidade de Dados

## Problemas identificados

### Problema 1 — Compra e Cadastro não existem na tabela de campanhas

A tabela `daily_campaigns` tem os campos `leads`, `messages`, `conversions`, mas **não separa** compras (`purchases`) de cadastros (`registrations`). No Meta Ads, esses são eventos diferentes:
- **Cadastro**: `offsite_conversion.fb_pixel_lead` / `lead`
- **Compra**: `offsite_conversion.fb_pixel_purchase` / `purchase`

Atualmente, o edge function salva ambos misturados em `leads`. A `CampaignTable` não tem colunas para exibir esses valores separados.

### Problema 2 — Fidelidade dos dados comprometida

Três falhas de precisão encontradas:

**Falha A** — Divisão igualitária entre contas (edge function linhas 668-686):
```ts
spend: mAds.investment / metaAccountIds.length  // ERRADO
```
Se você tem 2 contas, uma com R$1000 e outra com R$500, ambas recebem R$750. Os dados reais por conta são ignorados.

**Falha B** — Confusão de leads vs. conversões (edge function linha 699):
```ts
conversions: mAds.leads / metaAccountIds.length  // leads salvos como conversions
```
No `daily_metrics`, o campo `conversions` salva `mAds.leads`. Mas quando o hook lê o banco de volta (linhas 331-365 de `useAdsData`), ele agrega `metaAgg.conversions` como `leads` do Meta — isso cria um loop correto mas mascarado. O problema real é que `Google.conversions` e `Meta.leads` são somados juntos na consolidação.

**Falha C** — Sem campo `purchases` nem `registrations` na tabela `daily_campaigns`:
O banco não persiste Compras e Cadastros separadamente por campanha — só persiste `leads` (misturado) e `messages`.

## Solução completa

### Parte 1 — Migração de banco: adicionar colunas `purchases` e `registrations` em `daily_campaigns`

```sql
ALTER TABLE daily_campaigns 
  ADD COLUMN IF NOT EXISTS purchases bigint DEFAULT 0,
  ADD COLUMN IF NOT EXISTS registrations bigint DEFAULT 0;
```

### Parte 2 — Edge function: separar Compras e Cadastros ao persistir campanhas Meta

No bloco de persistência de campanhas Meta (linhas 746-763), atualmente:
```ts
leads: c.leads,       // mistura compras + cadastros
messages: c.messages,
```

Após a correção, o edge function precisa detectar o tipo da campanha:
- Se a campanha tem `purchases > 0` → é campanha de compra
- Se a campanha tem `leads/registrations > 0` → é campanha de cadastro
- Se tem `messages > 0` → é campanha de mensagens

Para isso, precisamos que `fetchMetaAdsData` retorne `purchases` e `registrations` separadamente por campanha (o código já extrai `purchaseVal` e `leadAct` no loop de campanhas, só não os separa no resultado final).

### Parte 3 — Corrigir divisão igualitária entre contas (fidelidade)

O problema de dividir métricas pelo número de contas (`/ metaAccountIds.length`) é que cada conta pode ter gasto diferente. A solução correta é **buscar as métricas por conta individualmente** no loop de `fetchMetaAdsData`, que já percorre conta a conta. O retorno já agrega tudo, mas na persistência o código divide igualmente.

**Correção**: Em vez de dividir pelo número de contas, salvar uma única linha de métricas agregadas com `account_id = "aggregate"` ou salvar por conta com os dados reais de cada conta. A abordagem mais segura é salvar com o `account_id` de cada conta separadamente usando os dados parciais que já são processados conta a conta no loop.

### Parte 4 — CampaignTable: adicionar colunas de Compra e Cadastro

Adicionar duas novas colunas opcionais à tabela de campanhas:
- `camp_purchases` → "Compras"  
- `camp_registrations` → "Cadastros"

E exibi-las na tabela quando visíveis, lendo os novos campos `purchases` e `registrations` da campanha.

### Parte 5 — MetricKey e tipos

Adicionar `camp_purchases` e `camp_registrations` ao tipo `MetricKey` e ao `PLATFORM_GROUPS["campaigns"]` para que possam ser controladas por permissão.

## Arquivos modificados

| Arquivo | Ação |
|---------|------|
| `supabase/migrations/` | Nova migração: adicionar colunas `purchases` e `registrations` em `daily_campaigns` |
| `supabase/functions/fetch-ads-data/index.ts` | Separar compras/cadastros na persistência; corrigir divisão de métricas por conta |
| `src/lib/types.ts` | Adicionar `camp_purchases` e `camp_registrations` como `MetricKey` |
| `src/components/CampaignTable.tsx` | Adicionar colunas Compras e Cadastros |
| `src/hooks/useAdsData.tsx` | Propagar `purchases` e `registrations` nos dados de campanha retornados |

## Detalhes técnicos

### Mudança no edge function — `fetchMetaAdsData`

Adicionar `purchases` e `registrations` ao tipo de retorno de cada campanha:
```ts
interface MetaAdsMetrics {
  // ... existentes
  campaigns: Array<{ 
    name: string; status: string; spend: number; 
    leads: number; registrations: number; purchases: number;  // ← novo
    messages: number; revenue: number; cpa: number 
  }>;
}
```

No loop de campanhas, já há `leadAct` e `purchaseVal`. Separar:
```ts
const purchaseAct = actions.find(a => a.action_type === "offsite_conversion.fb_pixel_purchase" || a.action_type === "purchase");
const purchases = parseInt(purchaseAct?.value || "0");

const regAct = actions.find(a => a.action_type === "offsite_conversion.fb_pixel_complete_registration" || a.action_type === "lead" || a.action_type === "offsite_conversion.fb_pixel_lead");
const registrations = parseInt(regAct?.value || "0");
```

### Correção da divisão igualitária

No bloco de persistência de `daily_metrics`, em vez de dividir por número de contas, mover a persistência **para dentro do loop de contas** no `fetchMetaAdsData` — ou retornar métricas por conta para persistir individualmente. A abordagem mais simples é salvar os totais em uma única linha com `account_id = metaAccountIds[0]` quando há uma conta, e usar o loop para múltiplas contas (estrutura que já existe no loop da função).

### Interface do `useAdsData` — campanhas

O tipo `all_campaigns` em `consolidated` precisa incluir `purchases` e `registrations`:
```ts
all_campaigns: Array<{ 
  name: string; status: string; spend: number; 
  leads?: number; clicks?: number; conversions?: number; 
  messages?: number; purchases?: number; registrations?: number;  // ← novo
  revenue?: number; cpa: number; source: string 
}>
```

### CampaignTable — novas colunas

```ts
{ key: "camp_purchases", label: "Compras", shortLabel: "Compras" },
{ key: "camp_registrations", label: "Cadastros", shortLabel: "Cadastros" },
```

Renderização:
```tsx
{col.key === "camp_purchases" && (c.purchases || 0).toLocaleString("pt-BR")}
{col.key === "camp_registrations" && (c.registrations || 0).toLocaleString("pt-BR")}
```
