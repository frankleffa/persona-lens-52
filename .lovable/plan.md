

# Editar metricas do Funil da Jornada

## Resumo

Adicionar um botao "Configurar" no card do Funil da Jornada (visivel apenas para gestores) que abre um painel inline para selecionar e reordenar as etapas do funil. A configuracao sera salva na tabela `funnel_configurations` que ja existe no banco.

---

## Metricas disponiveis para o funil

Todas as metricas que o sistema ja coleta e que fazem sentido como etapas de funil:

| Chave | Label | Fonte |
|-------|-------|-------|
| `impressions` | Impressoes | Google Ads + Meta Ads |
| `clicks` | Cliques | Google Ads + Meta Ads |
| `sessions` | Sessoes | GA4 |
| `events` | Eventos | GA4 |
| `leads` | Leads | Meta Ads |
| `messages` | Mensagens | Meta Ads / Consolidado |
| `registrations` | Cadastros | Meta Ads / Consolidado |
| `purchases` | Compras | Meta Ads / Consolidado |

---

## Mudancas planejadas

### 1. `src/components/JourneyFunnelChart.tsx` — Adicionar configuracao inline

- Receber novas props: `isManager`, `clientId`, `clientUserId` (o user_id do cliente, para salvar no `funnel_configurations`)
- Adicionar botao "Configurar" no header (ao lado de "Funil da Jornada"), visivel apenas para managers
- Ao clicar, exibir painel inline com:
  - Lista de metricas disponiveis com checkboxes para ativar/desativar
  - Drag-and-drop (usando `@hello-pangea/dnd` ja instalado) para reordenar as etapas ativas
  - Botao "Salvar" para persistir
- Carregar config existente do banco ao montar (`funnel_configurations` WHERE `client_user_id = clientId` AND `manager_id = auth.uid()`)
- Se nao houver config salva, usar o padrao atual (Impressoes, Cliques, Eventos, melhor conversao)
- Ao salvar, fazer upsert na tabela `funnel_configurations` com `stages` como array JSON:
  ```json
  [
    { "key": "impressions", "label": "Impressoes" },
    { "key": "clicks", "label": "Cliques" },
    { "key": "registrations", "label": "Cadastros" }
  ]
  ```

### 2. Logica de exibicao do funil

- Quando houver config salva: usar as etapas configuradas (na ordem salva), buscando o valor de cada metrica nos dados disponiveis
- Quando nao houver config: manter comportamento atual (Impressoes -> Cliques -> Eventos -> melhor conversao)
- Etapas com valor 0 continuam sendo removidas da exibicao

### 3. Mapeamento de chave para valor

Criar um mapa dentro do componente que resolve cada chave ao valor correto:

```ts
const metricValues: Record<string, number> = {
  impressions: (googleAds?.impressions || 0) + (metaAds?.impressions || 0),
  clicks: (googleAds?.clicks || 0) + (metaAds?.clicks || 0),
  sessions: ga4?.sessions || 0,
  events: ga4?.events || consolidated?.events || 0,
  leads: consolidated?.leads || metaAds?.leads || 0,
  messages: consolidated?.messages || metaAds?.messages || 0,
  registrations: consolidated?.registrations || metaAds?.registrations || 0,
  purchases: consolidated?.purchases || metaAds?.purchases || 0,
};
```

### 4. `src/components/ClientDashboard.tsx` — Passar props extras

- Passar `isManager`, `clientId` e o `clientUserId` (que ja e o `clientId` prop) para `JourneyFunnelChart`

---

## Arquivos modificados

| Arquivo | Mudanca |
|---------|---------|
| `src/components/JourneyFunnelChart.tsx` | Adicionar painel de config, carregar/salvar `funnel_configurations`, drag-and-drop para reordenar etapas |
| `src/components/ClientDashboard.tsx` | Passar `isManager` e `clientId` para o JourneyFunnelChart |

Nenhuma migracao necessaria — a tabela `funnel_configurations` ja existe com as colunas `stages` (jsonb), `manager_id`, `client_user_id` e RLS correto.
