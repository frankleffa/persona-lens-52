

## Plano: Card de FTD por Campanha (abaixo do card consolidado)

### O que será criado
Um novo componente que mostra o breakdown de FTD por campanha, exibido logo abaixo dos cards consolidados de FTD. Mantém os cards consolidados existentes e adiciona a tabela/lista detalhada.

### Dados disponíveis
A tabela `daily_campaigns` já tem a coluna `ftd` por campanha. O hook `useAdsData` já retorna `all_campaigns` com `ftd` por campanha no objeto `consolidated`. Não é necessário nenhuma query nova nem mudança no backend.

**Nota:** Dados a nível de **conjunto de anúncios** (ad set) não são coletados atualmente pela API — apenas contagem de ad sets por campanha. O breakdown mais granular disponível é por **campanha**. Para ter FTD por ad set, seria necessário uma mudança significativa no `fetch-ads-data` para buscar métricas por ad set (chamadas extras à API do Meta por campanha).

### Mudanças

**1. `src/components/FtdByCampaignCard.tsx`** (novo)
- Recebe `campaigns` (array com name, ftd, spend, source) e `isLoading`/`isFetching`
- Filtra apenas campanhas com `ftd > 0`
- Mostra lista ordenada por FTD desc com:
  - Nome da campanha (truncado)
  - Badge de source (Meta/Google)
  - Quantidade de FTD
  - Custo/FTD (spend / ftd)
  - Barra de progresso proporcional ao max FTD
- Visual: card com mesmo estilo `card-executive`, título "FTD por Campanha"
- Se nenhuma campanha tem FTD, não renderiza

**2. `src/components/ClientDashboard.tsx`**
- Importar `FtdByCampaignCard`
- Após o grid de FTD KPIs (linha ~442), renderizar o novo card passando `consolidated.all_campaigns`
- Condicional: só aparece quando o card de FTD está visível

### Arquivos
- `src/components/FtdByCampaignCard.tsx` — novo
- `src/components/ClientDashboard.tsx` — adicionar o card na seção FTD

