

## Plano: Exportar CSV completo de métricas diárias do previsao.io

### O que vou fazer
Gerar um arquivo CSV com todas as métricas diárias do cliente **previsao.io** (client_id: `df2a33e5-03f1-406f-81c1-956f2ef63c1d`), desde o primeiro dia com dados (2026-02-06) até hoje (2026-03-25).

O CSV terá um formato similar à planilha de Mensuração, mas com granularidade diária em vez de mensal.

### Estrutura do CSV
Cada linha = 1 dia. Colunas:

| Coluna | Descrição |
|--------|-----------|
| Data | YYYY-MM-DD |
| Investimento (R$) | spend |
| Receita (R$) | revenue |
| ROAS | revenue / spend |
| Impressões | impressions |
| Cliques | clicks |
| CTR (%) | ctr |
| CPC (R$) | cpc |
| CPM (R$) | cpm |
| Conversões | conversions |
| CPA (R$) | cpa |
| Cadastros | registrations |
| Compras | purchases |
| Leads | leads |
| Mensagens | messages |
| FTD | ftd |
| Custo/FTD (R$) | cost_per_ftd |

Além disso, incluirei uma linha de **totais** no final, e os dados de campanhas numa segunda aba/seção do CSV (campanha, gasto, cliques, conversões, registros, compras, leads, mensagens, receita, CPA).

### Como
- Script Python usando dados diretos do banco via `psql`
- Gerar o CSV em `/mnt/documents/previsao_metricas_diarias.csv`
- Formato brasileiro (separador `;`, decimais com `,`)

### Dados disponíveis
- 48 registros em `daily_metrics` (2026-02-06 a 2026-03-25)
- 90 registros em `daily_campaigns`
- Plataforma: apenas Meta Ads

