

# Corrigir extração de Seguidores do Meta Ads

## Problema identificado

Os dados do banco confirmam que as campanhas de seguidores ("perfil - seguidores 02", "perfil - seguidores 03") estao com `followers: 0`, enquanto `profile_visits` (extraido de `page_engagement`) tem valores (319, 76). Isso indica que a API do Meta nao retorna o `action_type: "follow"` nem `"like"` separadamente para essas campanhas -- o valor de seguidores esta embutido dentro de `page_engagement`.

## Causa raiz

Segundo a documentacao oficial do Meta, `page_engagement` e um **action_type agrupado** que inclui `like` (page likes), `comment`, `post_engagement`, etc. Em muitas campanhas de seguidores, a API nao devolve `like` como action separado -- devolve apenas o grupo `page_engagement`. O codigo atual busca `follow` ou `like` individualmente, que retornam vazio.

## Solucao

### 1. Adicionar log de debug na edge function

Adicionar um `console.log` temporario no `fetch-ads-data` para logar todos os `action_types` retornados pelas campanhas de seguidores. Isso vai revelar exatamente qual action_type o Meta esta devolvendo.

**Arquivo:** `supabase/functions/fetch-ads-data/index.ts`

Na secao de processamento de campanhas (apos linha 235), adicionar:

```ts
// Debug: log all action_types for follower campaigns
if (camp.objective === "OUTCOME_ENGAGEMENT" || camp.name?.toLowerCase().includes("seguidor")) {
  console.log(`[debug-followers] Campaign: ${camp.name}, objective: ${camp.objective}, actions:`, 
    JSON.stringify(actions.map((a: any) => ({ type: a.action_type, value: a.value }))));
}
```

### 2. Ajustar a extracao de seguidores

Com base na documentacao, `like` dentro de `actions` representa "Page Likes". Porem, para campanhas com objetivo de seguidores, o Meta pode retornar o resultado como:
- `like` (page likes)
- `follow` (follows)
- Ou apenas dentro do grupo `page_engagement`

A correcao sera expandir a busca para incluir mais action_types e, como fallback, usar `page_engagement` para campanhas de seguidores:

```ts
// Followers (novos seguidores) - buscar todos os tipos possiveis
const followAct = actions.find((a: any) =>
  a.action_type === "follow" || 
  a.action_type === "like" ||
  a.action_type === "page_like"
);
let followers = parseInt(followAct?.value || "0");

// Fallback: se nao encontrou seguidores mas a campanha e de seguidores,
// usar page_engagement como proxy
if (followers === 0 && (
  camp.objective === "OUTCOME_ENGAGEMENT" || 
  camp.name?.toLowerCase().includes("seguidor")
)) {
  const pageEngAct = actions.find((a: any) => a.action_type === "page_engagement");
  followers = parseInt(pageEngAct?.value || "0");
}
```

### 3. Aplicar mesma logica no sync diario

**Arquivo:** `supabase/functions/sync-daily-metrics/index.ts`

Replicar a mesma logica de extracao expandida no sync diario para manter consistencia.

### 4. Deployar e validar com os logs

Apos o deploy, acessar o dashboard para disparar uma chamada, e checar os logs da edge function para confirmar os action_types reais. Com essa informacao, ajustar a logica final se necessario.

---

## Detalhes tecnicos

### Action types relevantes (documentacao Meta)

| action_type | Significado |
|------------|-------------|
| `like` | Page Likes (curtidas na pagina) |
| `follow` | Page Follows |
| `page_engagement` | Grupo: inclui like + comment + post + tudo |
| `post_engagement` | Subgrupo de page_engagement |

### Dados atuais no banco

| Campanha | Seguidores | Page Engagement | Gasto |
|----------|-----------|----------------|-------|
| perfil - seguidores 02 | 0 | 319 | R$ 31.61 |
| perfil - seguidores 03 | 0 | 76 | R$ 12.89 |

### Fluxo corrigido

```text
1. API retorna actions para campanha de seguidores
2. Buscar "follow", "like", "page_like" nos actions
3. Se nenhum encontrado E campanha e de seguidores -> usar page_engagement
4. Gravar em daily_campaigns.followers
5. Dashboard exibe na coluna "Novos Seguidores"
```

## Arquivos modificados

| Arquivo | Mudanca |
|---------|---------|
| `supabase/functions/fetch-ads-data/index.ts` | Expandir extracao de seguidores + log de debug |
| `supabase/functions/sync-daily-metrics/index.ts` | Mesma logica expandida no sync diario |

