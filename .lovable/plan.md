
## Plano: Diferenciar evento padrão 'Purchase' da conversão personalizada 'FTD'

### Diagnóstico Atual

Analisando o sistema atual, vejo que já existe estrutura para separar `purchases` e `ftd` na tabela `daily_metrics`, mas preciso investigar:

1. **Edge Functions de sincronização**: Como `sync-daily-metrics` e `fetch-ads-data` estão capturando e diferenciando esses eventos
2. **Lógica de mapeamento**: Se há diferenciação entre evento padrão de purchase vs conversão personalizada FTD
3. **Frontend**: Como essas métricas estão sendo exibidas no dashboard e relatórios

### Problema Identificado

Atualmente o sistema pode estar:
- Mapeando todos os eventos de compra como `purchases` genérico
- Não identificando conversões personalizadas de FTD separadamente
- Faltando lógica específica para diferentes tipos de conversão por vertical/cliente

### Solução Proposta

**1. Atualizar Edge Functions de Captura de Dados**
- `sync-daily-metrics`: Adicionar lógica para identificar eventos FTD específicos
- `fetch-ads-data`: Separar captura de purchase padrão vs conversões personalizadas
- Mapear eventos do Meta Ads baseado em nome/tipo da conversão personalizada

**2. Configuração por Cliente**
- Usar tabela `client_analysis_config` para definir qual tipo de conversão priorizar
- Campo `primary_metric` já existe e pode ser usado para essa diferenciação
- Permitir configurar eventos personalizados por cliente

**3. Melhorar Lógica de Mapeamento**
- Meta Ads: Identificar `offsite_conversion.fb_pixel_purchase` (padrão) vs conversões custom
- Google Ads: Separar conversões por nome/tipo de ação
- Criar mapeamento inteligente baseado no nome da conversão

**4. Atualizar Frontend**
- Dashboard: Mostrar Purchase e FTD como métricas separadas quando aplicável
- Configuração: Permitir escolher qual conversão usar como métrica primária
- Relatórios: Incluir ambas as métricas quando relevante

### Implementação Técnica

**Edge Functions a modificar:**
- `supabase/functions/sync-daily-metrics/index.ts`
- `supabase/functions/fetch-ads-data/index.ts`

**Componentes Frontend:**
- `src/components/KPICard.tsx` - para exibir métricas separadas
- `src/components/CampaignTable.tsx` - colunas para Purchase vs FTD
- `src/components/analysis/ClientAnalysisConfig.tsx` - configuração por cliente

**Tabela de configuração:**
- `client_analysis_config` já tem campos necessários
- Pode precisar adicionar campo para mapeamento de eventos personalizados

### Validação

1. **Meta Ads**: Verificar se consegue identificar diferentes tipos de conversão
2. **Google Ads**: Mapear conversões por nome/tipo
3. **Dashboard**: Confirmar que métricas aparecem separadas
4. **Relatórios**: Validar que both Purchase e FTD estão disponíveis

O sistema já tem a estrutura de dados necessária, precisamos principalmente melhorar a lógica de captura e mapeamento de eventos.
