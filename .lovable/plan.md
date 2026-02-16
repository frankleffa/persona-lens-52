

# Seletor de Metricas no Relatorio PDF

## Problema
Atualmente o relatorio PDF exibe metricas fixas (Investimento, Receita, ROAS, Conversoes). O gestor nao consegue escolher quais metricas aparecem, e metricas como "Receita" podem nao fazer sentido para certas campanhas.

## Solucao
Adicionar um bloco de selecao de metricas na pagina de criacao do relatorio, permitindo que o gestor escolha exatamente quais KPIs e colunas aparecem no PDF.

## Mudancas

### 1. Pagina de Criacao (`ReportCreate.tsx`)
- Adicionar novo bloco "Metricas do Relatorio" com checkboxes agrupados:
  - **Cards de KPI** (topo do relatorio): Investimento, Receita, ROAS, Conversoes, Cliques, CPA
  - **Colunas da Tabela de Campanhas**: Investimento, Receita, Conversoes, Cliques, Impressoes, CPA
- Cada metrica pode ser ligada/desligada individualmente
- Salvar as selecoes no campo `sections_snapshot` do `report_instances` (campo JSONB ja existente)

### 2. Pagina de Preview (`ReportPreview.tsx`)
- Ler as metricas selecionadas do `sections_snapshot`
- `MetricCards`: renderizar apenas os cards selecionados
- `SectionSummary`: exibir apenas as linhas selecionadas
- `SectionComparison`: exibir apenas as linhas selecionadas
- `SectionTopCampaigns` e `SectionCampaignTable`: exibir apenas as colunas selecionadas

### 3. Compatibilidade
- Relatorios antigos (sem campo de metricas no snapshot) continuam funcionando mostrando todas as metricas como fallback

### Detalhes Tecnicos

O `sections_snapshot` (JSONB) passara a incluir dois novos campos:

```text
{
  sections: [...],
  order: [...],
  custom_title: "...",
  custom_subtitle: "...",
  template_id: "...",
  selected_kpis: ["spend", "conversions", "clicks", "cpa"],
  selected_campaign_columns: ["spend", "conversions", "clicks", "cpa"]
}
```

Nenhuma migracao de banco e necessaria -- o campo JSONB ja aceita dados adicionais.

As metricas disponiveis para selecao:
- **KPI Cards**: spend, revenue, roas, conversions, clicks, impressions, cpa
- **Colunas Campanha**: spend, revenue, conversions, clicks, impressions, cpa

Valores default (quando nao ha selecao): todas as metricas ativas, mantendo compatibilidade com relatorios ja gerados.

