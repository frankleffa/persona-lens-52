
# Correções: Exibir Compras e Cadastros na Tabela de Campanhas

## Diagnóstico confirmado

Os dados estão sendo salvos corretamente no banco de dados desde hoje (19/02). A campanha "teste direto para o site" já tem `purchases: 9` e `registrations: 3` registrados.

Foram identificados 2 problemas que impedem a exibição dessas métricas:

**Problema A — Colunas ocultas por padrão**

Em `src/components/CampaignTable.tsx` (linha 38), o array `DEFAULT_VISIBLE` não inclui `camp_purchases` e `camp_registrations`. Isso faz com que as colunas fiquem invisíveis por padrão para qualquer usuário que acesse sem ter configurado manualmente.

```ts
// Atual — sem Compras e Cadastros
const DEFAULT_VISIBLE = ["camp_investment", "camp_result", "camp_cpa", "camp_cpc", "camp_clicks", "camp_impressions", "camp_ctr"];

// Corrigido — inclui Compras e Cadastros
const DEFAULT_VISIBLE = ["camp_investment", "camp_result", "camp_purchases", "camp_registrations", "camp_cpa", "camp_cpc", "camp_clicks"];
```

**Problema B — Permissões não inicializadas como visíveis**

Em `src/lib/types.ts`, o `INITIAL_METRICS_STATE` precisa ter `camp_purchases: true` e `camp_registrations: true` para que a função `isMetricVisible` retorne `true` por padrão (antes de qualquer configuração manual salva no banco). Se o valor não existir no estado inicial, a função pode retornar `false`.

**Problema C — Dados históricos sem Compras/Cadastros (antes de hoje)**

Os registros anteriores a 19/02 têm `purchases = 0` e `registrations = 0` porque as colunas não existiam. Para recuperar esses dados, o usuário precisa clicar em "Importar Histórico" no dashboard — isso vai rebuscar os dados da API do Meta e repopular com os valores corretos.

## Correções a implementar

### 1. `src/components/CampaignTable.tsx`

Adicionar `camp_purchases` e `camp_registrations` ao `DEFAULT_VISIBLE` para que apareçam por padrão na tabela de campanhas:

```ts
const DEFAULT_VISIBLE: CampaignColumnKey[] = [
  "camp_investment",
  "camp_result", 
  "camp_purchases",       // ← adicionar
  "camp_registrations",   // ← adicionar
  "camp_cpa",
  "camp_cpc",
  "camp_clicks",
];
```

Também remover `camp_impressions` e `camp_ctr` do padrão para não sobrecarregar a tabela (ficam disponíveis no menu de colunas).

### 2. `src/lib/types.ts`

Verificar e garantir que `INITIAL_METRICS_STATE` inclua `camp_purchases: true` e `camp_registrations: true`.

### 3. Nota sobre dados históricos

Após as correções de código, o gestor deve clicar em **"Importar Histórico"** no dashboard para que os dados dos últimos 30 dias sejam rebuscados da API do Meta com os novos campos de compras e cadastros separados.

## Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `src/components/CampaignTable.tsx` | Adicionar `camp_purchases` e `camp_registrations` ao `DEFAULT_VISIBLE` |
| `src/lib/types.ts` | Garantir `camp_purchases: true` e `camp_registrations: true` no estado inicial |

## Resumo do que NÃO precisa ser mudado

- O edge function está correto e salvando os dados separadamente
- O hook `useAdsData` está lendo `purchases` e `registrations` corretamente
- O banco de dados tem as colunas corretas (migração já executada)
- A interface `Campaign` em `CampaignTable` já aceita `purchases` e `registrations`
