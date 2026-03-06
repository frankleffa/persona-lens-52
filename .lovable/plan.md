

## Plano: Corrigir inflação de dados e discrepância compras vs gráfico de conversões

### Problema 1: Dados inflados após background sync

**Causa raiz**: `triggerLiveSync` dispara duas chamadas à edge function:
- Uma com `date_range: "TODAY"` — persiste corretamente os dados de hoje
- Uma com `date_range: "LAST_2_DAYS"` — busca dados Meta **agregados de 2 dias**, mas a persistência sempre salva como `today` (linha 828: `shouldPersistToday = true` sempre)

Resultado: a segunda chamada sobrescreve o registro de hoje com o valor de 2 dias, inflando todos os números.

**Correção em `supabase/functions/fetch-ads-data/index.ts`**:
- Na seção de persistência (linha 828), mudar `shouldPersistToday` para só persistir quando `dateRange` for `"TODAY"` ou `"LAST_2_DAYS"` (ranges curtos que incluem hoje). Para ranges maiores como `LAST_7_DAYS`, `LAST_30_DAYS`, não persistir o aggregado como "hoje"
- Mais importante: quando `dateRange !== "TODAY"`, **não** persistir o totalizador como "today" — apenas persistir yesterday separadamente (que já funciona corretamente)

Mudança específica:
```typescript
// Antes:
const shouldPersistToday = true;

// Depois: só persiste como "today" quando o range é exclusivamente TODAY
const shouldPersistToday = dateRange === "TODAY";
```

### Problema 2: Compras no topo não batem com gráfico de conversões

**Causa raiz**: Os KPI cards usam dados do banco (`daily_metrics` → colunas `purchases`, `registrations`), enquanto o gráfico de conversões usa `hourly_conversions` que vem do `enrichQuery` (dados ao vivo da API Meta). São fontes diferentes e podem ter valores/períodos diferentes.

O `hourly_conversions` é pedido com o `metaDatePreset` do range selecionado (ex: `last_2d`), mas os dados do banco podem ter apenas 1 dia disponível, ou a API pode retornar dados ligeiramente diferentes do que foi persistido.

**Correção**: Não há como fazer o hourly bater 100% (é breakdow por hora, não existe no banco). Mas podemos adicionar um total no gráfico que some os valores hourly e mostrar que é o total do período ao vivo, diferenciando-o visualmente do total persistido nos KPIs. Isso já parece implementado no componente com o "live ticker".

A correção real é garantir que os dados não estejam inflados (Problema 1). Uma vez que o Problema 1 seja resolvido, os KPIs e o gráfico devem convergir porque ambos olham para o mesmo período.

### Resumo das mudanças

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/fetch-ads-data/index.ts` | `shouldPersistToday = dateRange === "TODAY"` — impede que ranges agregados sobrescrevam o dia de hoje com totais acumulados |
| `src/services/ads-api.ts` | Ajustar `triggerLiveSync` para enviar a segunda chamada com range mais restrito, ou remover a chamada `LAST_2_DAYS` que é redundante (yesterday já é persistido separadamente) |

