
Diagnóstico confirmado
- O problema não é só visual: os cadastros já chegam inflados na persistência e depois contaminam campanhas, painel de conversões e análises.
- As chamadas do Meta já estão com `use_account_attribution_setting=true` e `action_report_time=mixed`, então o principal suspeito agora não é a janela de atribuição, e sim o mapeamento do evento de cadastro + mistura entre `registrations`, `leads` e `conversions`.
- Hoje essa regra está duplicada em vários pontos (`fetch-ads-data`, `backfill-metrics`, `sync-daily-metrics`, `analyze-client`) e não existe um evento de cadastro configurável por cliente.
- O deploy está travado antes de qualquer correção entrar: `supabase/functions/analyze-client/index.ts` faz push de `leads` em `MetaLiveCampaign`, mas o tipo não declara esse campo.

O que vou implementar
1. Destravar o build imediatamente
- Corrigir o tipo `MetaLiveCampaign` em `supabase/functions/analyze-client/index.ts`
- Revisar também o override `metrics.leads = metrics.registrations`, porque ele colapsa duas métricas diferentes e atrapalha a análise

2. Unificar a captura de métricas do Meta em um único critério
- Criar um helper único para extrair `purchases`, `registrations`, `leads`, `messages` e `ftd` de `actions/action_values`
- Garantir que `registrations` nunca herde `lead` e nunca some aliases indevidos
- Aplicar exatamente a mesma regra em:
  - `supabase/functions/fetch-ads-data/index.ts`
  - `supabase/functions/backfill-metrics/index.ts`
  - `supabase/functions/sync-daily-metrics/index.ts`
  - `supabase/functions/analyze-client/index.ts`

3. Tornar “Cadastro” configurável por cliente
- Adicionar na `client_analysis_config` um campo opcional como `registration_event_name`
- Se o cliente usa uma custom conversion ou `action_type` específico no Ads Manager, o sistema passa a usar esse valor como fonte oficial do cadastro
- Se não houver configuração, manter o fallback canônico atual (`offsite_conversion.fb_pixel_complete_registration` -> `complete_registration`)
- Expor esse campo na UI de configuração de análise do cliente

4. Eliminar mistura entre Cadastros, Leads e Conversões no app
- Revisar `src/hooks/useAdsData.tsx` para que:
  - Cadastros = `meta_ads.registrations`
  - Leads = `meta_ads.leads`
  - Compras = `purchases`
- Ajustar composições que hoje ainda mascaram a origem correta, incluindo a lógica de `consolidatedLeads`
- Manter o painel de conversões com headline canônico, usando breakdown só para distribuição visual

5. Corrigir o histórico já salvo
- Depois da nova regra entrar, reprocessar o período afetado para sobrescrever `daily_metrics` e `daily_campaigns`
- Isso remove os números inflados já persistidos e evita que o frontend continue “acertando por cima” de uma base errada

6. Verificar de ponta a ponta
- Conferir, no mesmo cliente e mesmo período:
  - resposta live da função de captura
  - linha diária salva no banco
  - campanhas salvas
  - cards do dashboard
  - painel de conversões
  - análise automática
- Validar pelo menos: Hoje, Ontem e Últimos 2 Dias
- Fazer uma checagem de corte diário/fuso, porque hoje existem pontos com `Date` local/UTC (`getBrazilToday` e persistência com `toISOString`) que podem deslocar o dia em relação ao fuso da conta Meta

Arquivos / áreas impactadas
- `supabase/functions/analyze-client/index.ts`
- `supabase/functions/fetch-ads-data/index.ts`
- `supabase/functions/backfill-metrics/index.ts`
- `supabase/functions/sync-daily-metrics/index.ts`
- `src/hooks/useAdsData.tsx`
- `src/components/analysis/ClientAnalysisConfig.tsx`
- hook/fluxo de leitura e salvamento da `client_analysis_config`
- migração para adicionar `registration_event_name`

Resultado esperado
- O número de Cadastros do app passa a seguir a mesma fonte oficial do Ads Manager para cada cliente
- O valor deixa de nascer inflado no backend
- Histórico, cards, campanhas, painel de conversões e análise passam a usar a mesma lógica
- O build volta a passar e a correção pode ser publicada e validada imediatamente
