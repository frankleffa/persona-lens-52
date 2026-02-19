

# Corrigir refresh: dados sumindo e campanhas duplicadas

## Problemas identificados

### 1. Dados somem ao clicar em Atualizar
Quando o usuario clica no botao de refresh com periodo "Ontem e Hoje" (`LAST_2_DAYS`):
- O sistema carrega dados **persistidos** do banco (daily_metrics + daily_campaigns) -- OK
- Depois, dispara um **live sync em background** chamando `fetch-ads-data` com `date_range: LAST_2_DAYS`
- O live sync **NAO persiste** nada (guard: so persiste quando `dateRange === "TODAY"`)
- Quando o live sync retorna, a funcao de merge (linha 498-528) **sobrescreve** os dados consolidados com os dados da API ao vivo
- Se o Google Ads falhar ou retornar null, o consolidado recalcula usando `liveGoogle?.investment || 0` = 0, sumindo com os dados do Google
- As metricas consolidadas (investimento, receita, ROAS, etc.) ficam incorretas

O merge recalcula o consolidado apenas com `liveGoogle + liveMeta`, ignorando os totais do banco que foram cuidadosamente agregados por dia.

### 2. Campanhas duplicam ao clicar em Atualizar
- A linha 525 do merge substitui `all_campaigns` pela lista vinda da API ao vivo
- A API ao vivo retorna campanhas com nomes atuais, mas podem ter IDs duplicados quando o usuario tem multiplas contas Meta
- Alem disso, o live sync NAO chama `triggerLiveSync` (que faria `dateRange=TODAY` e persistiria), entao os dados persistidos ficam antigos
- Na proxima carga, os dados antigos do banco + os novos do live sync podem conflitar

### 3. `triggerLiveSync` nunca e chamado
A funcao existe (linha 165) mas nunca e invocada. O refresh deveria chama-la para atualizar os dados de hoje no banco.

## Solucao

### Mudanca 1: Chamar `triggerLiveSync` ao clicar em Atualizar
Antes do live sync em background, chamar `triggerLiveSync` para garantir que os dados de HOJE sejam persistidos no banco. Isso mantem o historico atualizado.

### Mudanca 2: Corrigir o merge do live sync para nao sobrescrever dados validos
O merge deve ser mais conservador:
- **NAO recalcular** consolidated.investment/revenue/roas/leads/messages/cpa a partir de liveGoogle + liveMeta quando o resultado seria zero (o que indica falha, nao ausencia real de dados)
- Manter os dados persistidos como base e so atualizar campos que o live sync traz de novo (GA4, hourly, geo)
- Para campaigns: fazer merge inteligente por `external_campaign_id` ou `name` ao inves de substituir cegamente

### Mudanca 3: Separar o live sync em duas chamadas
- Uma chamada "leve" apenas para **GA4 + hourly + geo** (dados que nao sao persistidos)
- NAO buscar google_ads e meta_ads no live sync de background, pois esses dados ja estao persistidos e atualizados via `triggerLiveSync`

Porem, a abordagem mais simples e segura:
- Manter o live sync atual mas **nao substituir** os valores consolidados quando os dados persistidos ja existem
- Apenas **adicionar** GA4, hourly e geo ao resultado existente

## Arquivo modificado

| Arquivo | Mudanca |
|---------|---------|
| `src/hooks/useAdsData.tsx` | Chamar `triggerLiveSync` no refresh, corrigir merge para preservar dados persistidos |

## Detalhes da correcao do merge

```text
ANTES (linha 498-528):
- Substitui google_ads, meta_ads, consolidated inteiro
- Recalcula investment/revenue/roas do zero com dados live

DEPOIS:
- Mantem google_ads e meta_ads dos dados persistidos (nao sobrescreve)
- Apenas adiciona GA4, hourly_conversions e geo_conversions
- Atualiza all_campaigns apenas se live retornar campanhas validas
- Mantem os totais consolidados do banco (que sao mais confiaveis)
```

## Fluxo corrigido do refresh

```text
1. Usuario clica Atualizar
2. fetchData(LAST_2_DAYS) e chamado
3. Carrega dados persistidos do banco (daily_metrics + daily_campaigns)
4. Monta resultado com dados do banco
5. Chama triggerLiveSync(clientId) -> persiste dados de HOJE no banco
6. Dispara live sync background com LAST_2_DAYS
7. Live sync retorna -> merge APENAS GA4, hourly, geo
8. Campanhas e metricas consolidadas permanecem as do banco
```

