

## Plano: Mensuração com dados reais do cliente

### Situação atual
A página `/mensuracao` é uma planilha 100% manual — o manager digita todos os valores. Os dados reais já existem na tabela `daily_metrics` (investimento, receita, conversões, etc.) e `daily_campaigns` (por plataforma), mas não são usados.

### O que muda
Adicionar seletor de cliente + ano, e preencher automaticamente a coluna **"Realizado"** de cada mês com dados agregados do banco. A coluna **"Previsto"** continua editável manualmente (metas do manager).

### Dados mapeados

```text
Métrica                → Fonte (daily_metrics agregado por mês)
─────────────────────────────────────────────────────────
INVESTIMENTO TOTAL     → SUM(spend) 
RECEITA CAPTADA        → SUM(revenue)
TAXA DE CONVERSÃO      → SUM(conversions) / SUM(clicks)
TRANSAÇÕES             → SUM(conversions)
SESSÕES (GERAL)        → SUM(clicks)  [proxy — sem GA4 direto]
SESSÕES MÍDIA          → SUM(clicks) filtrado platform in (meta_ads, google_ads)
FB INVESTIMENTO        → SUM(spend) WHERE platform = 'meta_ads'
FB SESSÕES             → SUM(clicks) WHERE platform = 'meta_ads'
GOOGLE INVESTIMENTO    → SUM(spend) WHERE platform = 'google_ads'
GOOGLE SESSÕES         → SUM(clicks) WHERE platform = 'google_ads'
```

### Mudanças

**1. `src/pages/ResultsMeasurement.tsx`**
- Importar `useManagerClients` para seletor de cliente
- Adicionar seletor de ano (2024, 2025, 2026)
- Query ao `daily_metrics` filtrando por `client_id` e ano selecionado
- Agregar dados por mês e preencher automaticamente o campo `r` (Realizado) de cada métrica
- Manter editabilidade manual no `p` (Previsto) — sem mudança
- Campos calculados (ROAS, CPS, Ticket Médio) recalculam automaticamente com os dados reais
- Indicador visual quando dados reais estão carregados (badge "Dados reais" vs "Manual")

**2. Persistência dos valores "Previsto"** (opcional nesta fase)
- Por ora, os valores previstos ficam em estado local (como hoje). Numa fase futura, podem ser salvos no banco numa tabela `measurement_targets`.

### Fluxo do usuário
1. Manager acessa `/mensuracao`
2. Seleciona o cliente no dropdown
3. Seleciona o ano
4. A coluna "Realizado" é preenchida automaticamente mês a mês
5. Manager edita a coluna "Previsto" com suas metas
6. ROAS, CPS e outros campos calculados atualizam em tempo real

### Arquivos alterados
- `src/pages/ResultsMeasurement.tsx` — seletor de cliente/ano + query + auto-fill

