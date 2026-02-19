
# Diagnóstico do Funil da Jornada — Problemas Encontrados

## O que o Funil da Jornada deveria mostrar

Um gráfico de rosca (donut) com as etapas da jornada do cliente:
- Impressões → Cliques → Eventos (GA4) → Mensagens/Conversões

Com uma **Taxa Total** no centro calculada como a conversão entre a primeira e a última etapa disponível.

---

## Problema 1 — O Funil está escondido atrás de "attribution_comparison" (condição errada)

**Arquivo:** `src/components/ClientDashboard.tsx`, linha 133

```ts
// ATUAL — o Funil aparece quando showAttribution é true
const showAttribution = ANALYSIS_METRICS.some((k) => isMetricVisible(clientId, k));
// ANALYSIS_METRICS = ["attribution_comparison", "discrepancy_percentage"]
```

E na linha 331:
```tsx
{showAttribution && (
  <JourneyFunnelChart ... />
)}
```

O Funil da Jornada está condicionado à visibilidade de `attribution_comparison` e `discrepancy_percentage`, que são métricas de análise de atribuição — **nada têm a ver com o funil visual**. A variável `showFunnel` (linha 134) que usa `"funnel_visualization"` existe mas **nunca é usada** para renderizar o JourneyFunnelChart.

**Correção:** Trocar `showAttribution` por `showFunnel` na condição do JourneyFunnelChart.

---

## Problema 2 — O Funil não inclui Compras e Cadastros como etapa final

**Arquivo:** `src/components/JourneyFunnelChart.tsx`, linhas 44-55

```ts
// ATUAL — 4 métricas, mas Compras e Cadastros não estão
const impressions = ...;
const clicks = ...;
const events = ...;
const messages = ...;

// Faltam:
// const purchases = ...;
// const registrations = ...;
```

O funil mostra Impressões → Cliques → Eventos → Mensagens. Mas quando o cliente tem campanhas de **Compras** ou **Cadastros** (sem mensagens), a última etapa aparece como 0 e o gráfico fica vazio ou incompleto.

**Correção:** Adicionar `purchases` e `registrations` como opções de etapa final, com a lógica: usar a que tiver valor maior entre mensagens, compras e cadastros.

---

## Problema 3 — A Taxa Total no centro é calculada de forma enganosa

**Arquivo:** `src/components/JourneyFunnelChart.tsx`, linhas 57-61

```ts
// ATUAL — mostra taxa de cliques se não tiver mensagens
const totalRate = impressions > 0 && messages > 0
  ? ((messages / impressions) * 100).toFixed(2)
  : impressions > 0 && clicks > 0
  ? ((clicks / impressions) * 100).toFixed(2)  // ← CTR, não "taxa de conversão"
  : "0.00";
```

O label diz "Taxa Total" mas o valor mostrado pode ser o CTR (cliques/impressões). Isso é confuso: se o cliente tem cliques mas não tem mensagens, aparece algo como "2.30%" com o rótulo "Taxa Total" — que parece ser taxa de conversão mas é CTR.

**Correção:** Mostrar o rótulo correto dependendo do que está sendo calculado ("CTR" ou "Taxa de Conversão"), e incluir compras/cadastros no cálculo.

---

## Problema 4 — O Funil é um gráfico de pizza (proporções), não um funil real

O componente usa `PieChart` com partes **proporcionais** ao valor de cada métrica. Isso significa que "Cliques" com valor 5.000 vai aparecer **maior** que "Mensagens" com valor 100 — visualmente parece que houve mais cliques que impressões, o que é matematicamente impossível num funil.

Um funil correto deveria mostrar barras decrescentes (Impressões > Cliques > Eventos > Conversões), não fatias de pizza proporcionais aos valores absolutos.

**Correção:** Substituir o `PieChart` por um componente de funil com barras horizontais decrescentes, onde cada barra representa a porcentagem em relação à etapa anterior.

---

## Correções a implementar

### Arquivo 1: `src/components/ClientDashboard.tsx`

**Mudança A — linha 331:** Trocar a condição de exibição do JourneyFunnelChart:
```tsx
// ANTES
{showAttribution && (
  <JourneyFunnelChart ... />
)}

// DEPOIS
{showFunnel && (
  <JourneyFunnelChart ... />
)}
```

### Arquivo 2: `src/components/JourneyFunnelChart.tsx`

Reescrever o componente para:

1. **Incluir compras e cadastros** como etapas adicionais no funil
2. **Mudar de PieChart para barras horizontais** decrescentes (funil real)
3. **Calcular taxa de conversão** entre cada etapa consecutiva
4. **Exibir etiqueta correta** no centro (ou abaixo das barras)

A estrutura visual será:

```
Impressões   [████████████████████████████] 120.000   100%
Cliques      [████████████████]              4.800     4,0%
Eventos      [████████]                      2.100     1,75%
Mensagens    [███]                             380     0,32%
```

Com a taxa de conversão de cada etapa para a próxima exibida ao lado.

---

## Resumo

| Problema | Impacto | Correção |
|----------|---------|---------|
| Condição errada (`showAttribution` vs `showFunnel`) | Funil aparece quando ativado `attribution_comparison`, não `funnel_visualization` | Trocar condição |
| Compras e Cadastros não incluídos | Funil vazio para clientes com campanhas de compra | Adicionar as métricas |
| Taxa Total com label enganoso | Mostra CTR mas chama de "Taxa Total" | Corrigir label e cálculo |
| PieChart proporcional (não é funil) | Valores maiores parecem "melhores" — confunde o cliente | Substituir por barras horizontais decrescentes |

## Arquivos modificados

| Arquivo | Mudanças |
|---------|---------|
| `src/components/ClientDashboard.tsx` | Corrigir condição `showAttribution` → `showFunnel` |
| `src/components/JourneyFunnelChart.tsx` | Reescrever visualização: barras horizontais + compras/cadastros + taxa correta |
