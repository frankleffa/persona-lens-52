

## Plano: Adicionar opção iGaming com métrica FTD na configuração de análise

### Mudanças

**`src/components/analysis/ClientAnalysisConfig.tsx`**:
1. Adicionar `"igaming"` na lista de verticais do Select (label: "iGaming / Apostas")
2. Adicionar `"ftd"` na lista de métricas principais (label: "FTD (First Time Deposit)")
3. Atualizar o mapeamento de labels automáticos para incluir `ftd: "FTD"`
4. Quando o usuário selecionar vertical `"igaming"`, auto-selecionar `"ftd"` como métrica principal

### Detalhes técnicos
- O campo `ftd` já existe na tabela `daily_metrics` e `daily_campaigns`
- A Edge Function `analyze-client` já é especializada em métricas de iGaming/FTD
- Apenas mudanças visuais no formulário, sem alteração de lógica ou banco

