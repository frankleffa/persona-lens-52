

## Plano: IA focada em reduzir custo e aumentar volume de FTD

### Objetivo
Ajustar o prompt da IA na Edge Function `analyze-client` para que a análise priorize recomendações específicas sobre **FTD (First Time Deposit)** — tanto para reduzir o custo por FTD quanto para aumentar o volume.

### Mudança

**Arquivo: `supabase/functions/analyze-client/index.ts`** (prompt, linhas ~467-495)

Adicionar ao prompt da IA:
- Instrução explícita para focar em **FTD (First Time Deposit)** como métrica principal
- Pedir que a IA analise quais campanhas têm melhor/pior custo por conversão (proxy para FTD)
- Incluir recomendações para reduzir custo por FTD (pausar campanhas caras, realocar budget)
- Incluir recomendações para aumentar volume de FTDs (escalar campanhas eficientes, testar públicos)
- Tratar purchases/registrations como proxy de FTD quando disponível

Nenhuma mudança de banco de dados ou frontend necessária — apenas refinamento do prompt.

