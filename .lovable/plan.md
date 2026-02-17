

# Corrigir Healthy Score Sumiu

## Causa Raiz

A migração para Stripe desativou os planos antigos (`is_active: false`) e criou novos planos Solo e Growth, mas a assinatura existente do usuario ficou com `plan_id = null`. Isso faz com que `hasFeature()` retorne `false` para todas as features, escondendo o Health Score e o Agency Control Center.

## Dados atuais no banco

- Assinatura do usuario: `plan_id = null`, `status = active`
- Plano Growth (novo): `id = 4baf266f-...`, tem feature `health_score: true` e `agency_control_center: true`
- Planos antigos (Starter, Professional, Agency): `is_active = false`

## Correção

### 1. Migration SQL

Atualizar a assinatura existente para apontar para o plano Growth (que tem todas as features):

```sql
UPDATE subscriptions
SET plan_id = '4baf266f-778d-4338-a23b-a4815be16e7f'
WHERE plan_id IS NULL AND status = 'active';
```

### 2. Notificar PostgREST

Executar reload do schema cache para garantir que a API reflita as mudancas recentes:

```sql
NOTIFY pgrst, 'reload schema';
```

## Resultado esperado

Apos a correção, `useSubscription` vai retornar o plano Growth com todas as features ativas, restaurando o Health Score e o Agency Control Center.

## Secao Tecnica

```text
Arquivo modificado:
- supabase/migrations/ -> Nova migration para vincular assinatura ao plano Growth

Tabelas impactadas:
- subscriptions: UPDATE plan_id para plano Growth onde plan_id IS NULL
```

