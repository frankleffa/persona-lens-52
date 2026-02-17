

# Plano: Atualizar Planos de Assinatura (SOLO e GROWTH)

## Resumo

Atualizar a tabela `plans` no banco de dados para refletir os dois novos planos (SOLO e GROWTH), substituindo os três planos anteriores (Starter, Professional, Agency). Adicionar enforcements no frontend para bloquear funcionalidades com base no plano ativo.

## Mudancas no Banco de Dados

Atualizar os registros existentes na tabela `plans`:

| Campo | SOLO | GROWTH |
|-------|------|--------|
| name | Solo | Growth |
| max_clients | 3 | 15 |
| max_ad_accounts | 3 | 15 |
| features | ver abaixo | ver abaixo |

Features SOLO:
- dashboard, kpis, campaign_table, period_selector, backfill_30d, manual_sync, basic_reports, simple_kanban

Features GROWTH (tudo do SOLO +):
- agency_control_center, health_score, auto_status, granular_permissions, advanced_reports, custom_templates, balance_alerts, optimization_tasks, whatsapp_auto_reports

Os planos antigos (Starter, Professional, Agency) serao desativados (`is_active = false`) e os dois novos inseridos. Os campos `hotmart_product_id` e `hotmart_offer_id` ficarao vazios ate voce informar os IDs reais da Hotmart.

## Mudancas no Frontend

### 1. Hook useSubscription - Adicionar helpers de feature

Expandir o hook `useSubscription` para expor uma funcao `hasFeature(featureKey)` que consulta o campo `features` do plano ativo. Isso permite checar permissoes em qualquer componente.

### 2. Protecao de rotas e componentes

Adicionar guards nos seguintes pontos:

- **Agency Control Center** (`/agency-control`): Exigir feature `agency_control_center`, senao mostrar upsell
- **Permissoes** (`/permissoes`): Exigir feature `granular_permissions`
- **Alertas de saldo**: Exigir feature `balance_alerts`
- **Tarefas de otimizacao**: Exigir feature `optimization_tasks`
- **Relatorios avancados**: Exigir feature `advanced_reports` para templates customizaveis

### 3. Componente UpgradeBanner

Criar um componente reutilizavel que aparece quando o usuario tenta acessar uma feature bloqueada, incentivando upgrade para o plano Growth.

### 4. Limite de clientes

No fluxo de criacao de clientes (pagina Agency/Clientes), verificar `maxClients` do plano antes de permitir adicionar novos clientes.

## Secao Tecnica

```text
Arquivos modificados:
- supabase/migrations/   -> Migration SQL (desativar planos antigos, inserir SOLO e GROWTH)
- src/hooks/useSubscription.ts -> Adicionar hasFeature()
- src/components/UpgradeBanner.tsx -> Novo componente
- src/App.tsx -> Wraps condicionais nas rotas protegidas
- src/components/AppSidebar.tsx -> Ocultar itens do menu conforme plano
- src/pages/AgencyControl.tsx -> Guard de feature
- src/pages/AgencyControlCenter.tsx -> Guard de feature
- src/pages/Permissions.tsx -> Guard de feature
```

A migration SQL sera:
1. `UPDATE plans SET is_active = false` (desativar todos)
2. `INSERT INTO plans` com os dois novos planos e seus features em JSONB

