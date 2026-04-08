

## Plano: Relatório de Custos XLSX automático por cliente

### O que será feito
Criar uma planilha Excel (.xlsx) por cliente, no formato do print enviado (seções por plataforma com campanhas, totais e resumo geral), atualizada automaticamente todo dia à meia-noite (horário de Brasília). O gestor poderá filtrar por dia ou mês e baixar a planilha pelo dashboard.

### Estrutura da planilha (baseada no print)

```text
RELATÓRIO DE CUSTOS — [NOME DO CLIENTE]
Período: DD/MM/YYYY a DD/MM/YYYY

META ADS (Facebook & Instagram) — [Mês YYYY]
┌─────────────┬──────────┬───────────┬────────────┬─────┬──────┬─────────┬──────┐
│ Campanha    │ Custo R$ │Impressões │Cliques Link│CPC  │CTR % │Alcance  │CPM   │
├─────────────┼──────────┼───────────┼────────────┼─────┼──────┼─────────┼──────┤
│ ...rows     │          │           │            │     │      │         │      │
│ TOTAL META  │ bold     │ bold      │ bold       │bold │      │ bold    │ bold │
└─────────────┴──────────┴───────────┴────────────┴─────┴──────┴─────────┴──────┘

GOOGLE ADS — [Mês YYYY]
(mesma estrutura adaptada: Custo, Impressões, Cliques, CPC, CTR, CPM)

RESUMO GERAL — [Mês YYYY]
┌────────────┬────────────┬──────┬───────────┬────────┐
│ Plataforma │ Custo Total│Moeda │Impressões │Cliques │
│ INVESTIMENTO TOTAL: R$ X.XXX,XX                     │
└─────────────────────────────────────────────────────┘
```

### Componentes

#### 1. Edge Function `generate-client-report-xlsx`
- Recebe `client_id` e opcionalmente `month` (YYYY-MM) ou `date` (YYYY-MM-DD)
- Busca dados de `daily_campaigns` filtrados pelo período e status ativo
- Agrupa campanhas por plataforma (Meta Ads, Google Ads, etc.)
- Gera o XLSX usando a biblioteca **ExcelJS** (disponível via esm.sh no Deno)
- Aplica formatação: cabeçalho escuro, seções coloridas por plataforma (azul Meta, cinza Google), linha de totais em negrito com fundo amarelo, resumo geral com fundo laranja
- Retorna o arquivo como download binário

#### 2. Cron automático à meia-noite BRT
- Criar um cron job `pg_cron` agendado para `0 3 * * *` (3h UTC = 0h BRT)
- O cron chama uma Edge Function `cron-daily-reports` que:
  - Lista todos os `client_manager_links`
  - Para cada cliente, invoca `generate-client-report-xlsx` com o mês corrente
  - Salva o XLSX no Supabase Storage (bucket `client-reports`, path: `{client_id}/{YYYY-MM}.xlsx`)
  - Sobrescreve o arquivo do mês a cada execução (dados acumulados)

#### 3. UI: Botão de download no dashboard
- Adicionar na área do dashboard do cliente um botão "Baixar Relatório XLSX"
- Seletor de período: mês inteiro ou dia específico
- Ao clicar, chama a Edge Function diretamente e inicia o download
- Opção de acessar relatórios salvos no Storage (histórico por mês)

#### 4. Storage bucket + RLS
- Criar bucket `client-reports` no Supabase Storage
- Políticas de acesso: gestores vinculados ao cliente podem ler os arquivos

### Detalhes técnicos

**Edge Function `generate-client-report-xlsx`:**
- Query: `daily_campaigns` filtrada por `client_id`, período, e `campaign_status NOT LIKE '%paus%'`
- Agrupamento: por `platform` (meta_ads → "META ADS", google_ads → "GOOGLE ADS")
- Colunas por campanha: nome, spend, impressions (de daily_metrics), clicks, CPC (spend/clicks), CTR (clicks/impressions*100), reach (de daily_metrics se disponível), CPM (spend/impressions*1000)
- Totais: soma de spend, impressions, clicks; CPC médio ponderado
- Usa `ExcelJS` via `import ExcelJS from "https://esm.sh/exceljs@4.4.0"`

**Cron `cron-daily-reports`:**
- Executa 1x/dia às 3h UTC
- Gera relatório do mês corrente para todos os clientes ativos
- Usa `supabase.storage.from('client-reports').upload()` com `upsert: true`

**Dados disponíveis em `daily_campaigns`:** campaign_name, spend, clicks, conversions, messages, leads, revenue, purchases, registrations, platform, campaign_status — suficiente para replicar o formato do print (exceto "Alcance" que vem de `daily_metrics.impressions` como proxy, e "Instalações" que não se aplica aos dados atuais de Meta/Google)

