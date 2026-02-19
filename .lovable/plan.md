

# Mostrar Visitas ao Perfil e Novos Seguidores em campanhas de seguidores

## Resumo

Extrair as metricas de "visitas ao perfil" e "novos seguidores" da API do Meta Ads (que ja retorna esses dados no array `actions`) e exibi-las como colunas na tabela de campanhas. A API do Meta retorna os action_types `page_engagement` e `follow` (ou `like`) nas insights de campanhas com objetivo de seguidores.

---

## Mudancas planejadas

### 1. `supabase/functions/fetch-ads-data/index.ts` — Extrair novas metricas

Na logica de fetch de campanhas Meta (linhas 230-277), alem dos action_types ja capturados (purchases, registrations, messages), extrair:

- **`follow`** ou **`like`**: novos seguidores da pagina
- **`page_engagement`**: engajamento com a pagina (inclui visitas ao perfil)

Adicionar esses campos ao objeto da campanha retornado:

```ts
// Novos seguidores
const followAct = actions.find((a: any) =>
  a.action_type === "follow" || a.action_type === "like"
);
const followers = parseInt(followAct?.value || "0");

// Engajamento com pagina (inclui visitas ao perfil)
const pageEngAct = actions.find((a: any) =>
  a.action_type === "page_engagement"
);
const profileVisits = parseInt(pageEngAct?.value || "0");
```

Atualizar a interface `MetaAdsMetrics.campaigns` para incluir `followers` e `profile_visits`.

### 2. `daily_campaigns` — Persistir novos campos

A tabela `daily_campaigns` nao possui colunas para seguidores e visitas ao perfil. Sera necessario adicionar via migracao:

```sql
ALTER TABLE daily_campaigns ADD COLUMN IF NOT EXISTS profile_visits bigint DEFAULT 0;
ALTER TABLE daily_campaigns ADD COLUMN IF NOT EXISTS followers bigint DEFAULT 0;
```

Atualizar o upsert de campaigns no fetch-ads-data para incluir os novos campos.

### 3. `src/hooks/useAdsData.tsx` — Propagar novos campos

Atualizar a interface `Campaign` no hook e no `AdsDataResult.consolidated.all_campaigns` para incluir `profile_visits` e `followers`. Propagar esses valores ao montar os dados de campanhas a partir da resposta da edge function e dos dados historicos do banco.

### 4. `src/components/CampaignTable.tsx` — Novas colunas

Adicionar duas novas colunas configuraveis:

| Chave | Label | Short |
|-------|-------|-------|
| `camp_profile_visits` | Visitas ao Perfil | Visitas |
| `camp_followers` | Novos Seguidores | Seguidor. |

Atualizar a interface `Campaign` local para incluir `profile_visits` e `followers`. Renderizar os valores nas novas colunas. As colunas nao estarao visiveis por padrao — o gestor pode ativa-las pelo menu "Colunas".

### 5. `src/lib/types.ts` — Adicionar MetricKeys

Adicionar `"camp_profile_visits"` e `"camp_followers"` ao tipo `MetricKey` para que o sistema de visibilidade de colunas funcione.

### 6. `supabase/functions/sync-daily-metrics/index.ts` — Extrair nas syncs

Aplicar a mesma logica de extracao de `follow` e `page_engagement` no sync diario, para que campanhas de seguidores tenham os dados corretos mesmo quando importados automaticamente.

---

## Detalhes tecnicos

### Action types relevantes na API do Meta

A API de Insights do Meta retorna no array `actions`:
- `follow` — novos seguidores da pagina (objetivo OUTCOME_ENGAGEMENT ou REACH)
- `like` — curtidas na pagina (pode incluir seguidores em campanhas mais antigas)
- `page_engagement` — todas as acoes na pagina (inclui visitas, curtidas, comentarios)

Para campanhas com objetivo de seguidores, o `follow` sera o principal indicador. O `page_engagement` serve como proxy para visitas ao perfil ja que a API nao expoe "profile visits" diretamente como action_type separado.

### Fluxo completo

```text
Meta API (actions) --> fetch-ads-data (extrai follow + page_engagement)
                   --> daily_campaigns (persiste profile_visits + followers)
                   --> useAdsData (propaga para o frontend)
                   --> CampaignTable (exibe nas colunas)
```

---

## Arquivos modificados

| Arquivo | Mudanca |
|---------|---------|
| `supabase/functions/fetch-ads-data/index.ts` | Extrair `follow` e `page_engagement` das actions de campanhas Meta |
| `supabase/functions/sync-daily-metrics/index.ts` | Mesma extracao no sync diario |
| `src/hooks/useAdsData.tsx` | Adicionar `profile_visits` e `followers` nas interfaces e propagacao |
| `src/components/CampaignTable.tsx` | Adicionar colunas `camp_profile_visits` e `camp_followers` |
| `src/lib/types.ts` | Adicionar novas MetricKeys |
| Migracao SQL | Adicionar colunas `profile_visits` e `followers` em `daily_campaigns` |

