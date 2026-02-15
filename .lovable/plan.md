

## Backfill de dados historicos para clientes reais

### Problema
O seletor de periodo (Hoje, 7, 14, 30 dias) nao muda os dados porque o cliente real so tem 1 dia de dados no banco. A funcao `sync-daily-metrics` so sincroniza o dia anterior, entao clientes novos nunca recebem historico.

### Solucao
Adicionar uma opcao de backfill que importa os ultimos 30 dias de dados quando executada. Isso pode ser acionado manualmente pelo gestor ou automaticamente na primeira sincronizacao de um cliente.

### Mudancas

**1. Nova edge function `backfill-metrics` (`supabase/functions/backfill-metrics/index.ts`)**
- Recebe `client_id` e opcionalmente `days` (padrao: 30)
- Para cada dia no intervalo, busca dados do Google Ads e Meta Ads usando a mesma logica do `sync-daily-metrics`
- Faz upsert em `daily_metrics` e `daily_campaigns` para cada dia
- Retorna contagem de registros inseridos

**2. Botao no dashboard (`src/components/ClientDashboard.tsx`)**
- Adicionar um botao "Sincronizar Historico" visivel apenas para gestores/admins
- Aparece quando o cliente tem poucos dados (menos de 7 dias)
- Ao clicar, chama a edge function `backfill-metrics`
- Mostra progresso e recarrega os dados ao finalizar

### Detalhes tecnicos

A edge function `backfill-metrics`:
- Itera de `hoje - N dias` ate `ontem` (dia a dia)
- Para cada dia, faz chamadas ao Google Ads API e Meta Ads API identicas as do `sync-daily-metrics`
- Usa upsert com `onConflict` para nao duplicar dados que ja existam
- Retorna JSON com `{ success, days_processed, metrics_upserted, campaigns_upserted, errors }`

O botao no dashboard:
- Fica proximo ao seletor de periodo
- Texto: "Importar Historico (30 dias)"
- Estado de loading enquanto processa
- Toast de sucesso/erro ao finalizar
- Desaparece ou muda para "Atualizar" apos backfill completo

### Resultado
Apos executar o backfill, o cliente tera 30 dias de dados e o seletor de periodo mostrara valores diferentes para cada opcao.
