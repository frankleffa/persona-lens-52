
# Redesign Premium da Carteira Adscape

Este e um redesign completo da pagina Carteira, dividido em 4 etapas que transformam a pagina de um dashboard generico em uma ferramenta de decisao estrategica.

---

## Etapa 1 -- Tabela `client_scores` e decomposicao do Score

### Banco de dados
Criar a tabela `client_scores` para armazenar o historico de scores por dimensao:

```text
client_scores
  id              uuid (PK, default gen_random_uuid())
  client_id       uuid (NOT NULL)
  roi_score       numeric (default 0)
  consistency_score numeric (default 0)
  cost_efficiency_score numeric (default 0)
  volume_score    numeric (default 0)
  engagement_score numeric (default 0)
  total_score     numeric (default 0)
  calculated_at   timestamptz (default now())
```

RLS: managers podem ler/escrever via `client_manager_links`; clients podem ler os proprios.

### Logica de calculo (no hook `useAgencyControl`)
Refatorar o calculo do score atual para as 5 dimensoes com pesos:
- **ROI/ROAS (30%)**: baseado no ROAS agregado do periodo
- **Consistencia (20%)**: desvio padrao do spend/conversions diarios (menor desvio = maior score)
- **Eficiencia de Custo (20%)**: CPA relativo (menor CPA = maior score)
- **Volume (15%)**: escala de investimento e impressoes
- **Engajamento (15%)**: CTR e taxa de conversao

O `total_score` e a media ponderada. Os scores por dimensao sao salvos na tabela `client_scores` a cada calculo para criar historico.

### Interface do AgencyClient
Expandir a interface para incluir `dimensions: { roi, consistency, costEfficiency, volume, engagement }` e `scoreHistory: { date, score }[]`.

---

## Etapa 2 -- Tendencia funcional com sparkline

### Calculo
- Buscar registros de `client_scores` dos ultimos 30 dias por cliente
- Comparar media dos ultimos 7 dias vs 7 dias anteriores
- Variacao > 5 pts: up (verde) com "8pts"; < -5 pts: down (vermelho); senao: estavel (cinza)

### Sparkline
- Na celula de Score da tabela, adicionar um mini grafico `recharts` `LineChart` (80x30px)
- Sem eixos, sem labels, apenas a linha
- Cor da linha: verde (up), vermelha (down), cinza (estavel)
- Dados: `scoreHistory` dos ultimos 30 dias

### Coluna Tendencia
- Exibir seta + variacao em pontos (ex: "8pts") com cor correspondente
- Substituir o `TrendIcon` atual que so mostra icone

---

## Etapa 3 -- Drawer lateral rico

### Novo componente `ClientScoreDrawer`
Drawer lateral (Sheet do shadcn, lado direito, ~480px) com 3 secoes:

**Secao 1 -- Diagnostico ("O que esta acontecendo")**
- Top 2 dimensoes (maior score) com icone verde
- Bottom 2 dimensoes (menor score) com icone vermelho
- Frase explicativa para cada dimensao fraca:
  - Eficiencia baixa: "CPL esta acima da meta definida"
  - ROI baixo: "Conversao da landing page esta caindo"
  - Consistencia baixa: "Resultados muito volateis"
  - Volume baixo: "Escala de investimento insuficiente"
  - Engajamento baixo: "CTR e taxa de conversao abaixo do esperado"

**Secao 2 -- Acao Prioritaria ("O que fazer agora")**
- Recomendacao especifica baseada na dimensao mais fraca
- Exemplos concretos e acionaveis (pausar conjuntos, revisar LP, consolidar criativos)

**Secao 3 -- Projecao ("Se voce agir")**
- Score atual com anel + seta + score estimado em 30 dias
- Estimativa: score atual + (100 - dimensao_fraca_score) * 0.3

### Integracao
- Botao "Ver" na tabela abre o drawer em vez de navegar para `/preview`
- Estado controlado por `selectedClientId` no componente pai

---

## Etapa 4 -- Visual Premium

### Score com anel circular (gauge)
- Substituir `ScoreBar` por um componente `ScoreGauge` (SVG puro, ~44px)
- Circulo de fundo cinza + arco preenchido proporcional ao score
- Cores: vermelho < 40, amarelo 40-70, verde > 70
- Numero centralizado dentro do anel

### Linhas em risco
- Clientes com status "CRITICAL" recebem `border-l-2 border-destructive` na `TableRow`
- Nome do cliente com `text-destructive/80`

### Header do Indice Adscape Medio
- Classificacao textual abaixo do numero:
  - 0-40: "Atencao necessaria" (vermelho)
  - 41-70: "Em desenvolvimento" (amarelo)  
  - 71-100: "Carteira saudavel" (verde)
- Animacao count-up de 0 ao valor real em 1.5s (hook `useCountUp`)

### Tipografia e espacamento
- Nome do cliente: `font-semibold` (600)
- Score: `text-base` (maior que o resto)
- Padding das linhas: `py-4` em vez do padrao

---

## Arquivos modificados/criados

| Arquivo | Acao |
|---------|------|
| Migration SQL | Criar tabela `client_scores` com RLS |
| `src/hooks/useAgencyControl.ts` | Refatorar score em 5 dimensoes, salvar historico, buscar sparkline data |
| `src/components/ScoreGauge.tsx` | **Novo** -- anel SVG do score |
| `src/components/ScoreSparkline.tsx` | **Novo** -- mini grafico recharts |
| `src/components/ClientScoreDrawer.tsx` | **Novo** -- drawer lateral com diagnostico, acao, projecao |
| `src/hooks/useCountUp.ts` | **Novo** -- hook de animacao count-up |
| `src/pages/AgencyControlCenter.tsx` | Redesign visual completo (gauge, drawer, tendencia, header) |

---

## Detalhes tecnicos

- A tabela `client_scores` permite historico diario. Os scores sao calculados no frontend ao carregar dados e salvos via upsert. Isso evita a necessidade de um cron/edge function extra.
- O sparkline usa `recharts` (ja instalado) com `LineChart` sem eixos.
- O drawer usa `Sheet` do shadcn (ja disponivel via `src/components/ui/sheet.tsx`).
- O count-up usa `requestAnimationFrame` para animacao suave.
- Nenhuma dependencia nova precisa ser instalada.
