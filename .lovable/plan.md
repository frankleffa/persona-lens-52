
Plano: corrigir de vez o “Cadastro” inflado no Meta

Diagnóstico confirmado
- O problema não está só na UI: para o cliente Cravei.io, o banco já salvou `registrations = 36` em `daily_metrics` no dia de hoje, e `daily_campaigns` soma `32` cadastros nas 3 campanhas.
- Há só 1 conta Meta vinculada, então não é duplicação por múltiplas contas.
- O screenshot do Ads Manager mostra algo muito mais próximo de `8 + 8 + 2`, então a inflação nasce na captura da API do Meta.

O que precisa ser corrigido

1. Padronizar as chamadas do Meta para bater com o Ads Manager
- Hoje o código usa `use_account_attribution_setting=true`, mas ainda não usa `action_report_time=mixed`.
- Além disso, várias chamadas de campanha/insights ainda não carregam os mesmos parâmetros da leitura de conta.
- Vou centralizar um helper de parâmetros do Meta e aplicar em:
  - `supabase/functions/fetch-ads-data/index.ts`
  - `supabase/functions/sync-daily-metrics/index.ts`
  - `supabase/functions/backfill-metrics/index.ts`
  - `supabase/functions/analyze-client/index.ts`
- Esse helper será usado em conta, campanha, hourly, geo e demais leituras sensíveis a conversão.

2. Tornar o evento de cadastro configurável por cliente
- Só usar `complete_registration` como fallback global não é robusto o suficiente.
- Vou adicionar um campo opcional na configuração do cliente para definir qual evento do Meta representa “cadastro” naquele cliente.
- Se preenchido, o sistema contará esse evento específico; se vazio, usa a lógica padrão.
- Isso evita divergência em clientes que usam conversão customizada ou setup fora do padrão.

3. Unificar a lógica de contagem de cadastro em um helper único
- Em vez de repetir `.find(...)` espalhado, vou criar uma função única para extrair:
  - cadastro
  - lead
  - compra
  - mensagens
- Assim `fetch`, `sync`, `backfill` e `analysis` passam a usar exatamente a mesma regra.

4. Corrigir a consolidação no frontend
- Hoje `useAdsData` faz merge do `meta_ads`, mas o `consolidated` continua muito baseado no banco.
- Vou recalcular o consolidado a partir dos dados já corrigidos/mesclados, para que:
  - card de Cadastros
  - Meta Ads section
  - funil Cadastro → FTD
  - tabela/campos derivados
  mostrem o mesmo número.

5. Reprocessar o histórico depois do fix
- Depois da correção, o botão de re-backfill já existente poderá regravar os últimos 30 dias com a lógica nova.
- Isso limpa os dados já inflados no banco.

Arquivos envolvidos
- `supabase/functions/fetch-ads-data/index.ts`
- `supabase/functions/sync-daily-metrics/index.ts`
- `supabase/functions/backfill-metrics/index.ts`
- `supabase/functions/analyze-client/index.ts`
- `src/hooks/useAdsData.tsx`
- migração para adicionar o campo opcional de evento de cadastro na configuração do cliente

Resultado esperado
- O “Cadastro” deixa de nascer inflado no backend.
- O número do app passa a acompanhar o Ads Manager com muito mais fidelidade.
- Todos os blocos do dashboard passam a exibir a mesma lógica de cadastro, sem divergência entre card, Meta Ads e funil.
