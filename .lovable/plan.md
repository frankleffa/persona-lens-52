

# Corrigir contas Meta Ads nao aparecendo para vinculo com clientes

## Problema identificado

A conta "Brasil Bitcoin 01" (act_1179262460841978) **existe** no banco de dados apos a sincronizacao (34 contas no total), porem com `is_active = false`. O problema esta em dois lugares:

1. **Sincronizacao via `sync_meta_accounts` e `oauth-callback`**: novas contas sao inseridas com `is_active: false`, entao ficam invisiveis.
2. **Tela de vinculo de clientes** (`manage-clients` action `list`): busca contas do gestor filtrando `is_active = true` (linha 114). Contas inativas nunca aparecem como opcao para vincular a um cliente.

Resultado: a conta `act_1179262460841978` foi sincronizada mas nao aparece na Gestao de Clientes porque esta inativa.

## Solucao

Alterar os 3 pontos que inserem contas com `is_active: false` para usar `is_active: true`, conforme a preferencia do usuario de ativar novas contas automaticamente.

### Mudanca 1: `supabase/functions/oauth-callback/index.ts`

Na secao Meta Ads (linha ~238), alterar o upsert de `is_active: false` para `is_active: true`.

### Mudanca 2: `supabase/functions/manage-connections/index.ts`

Na acao `sync_meta_accounts` (linha ~139), alterar o upsert de `is_active: false` para `is_active: true`.

### Mudanca 3: Atualizar contas existentes no banco

Executar um UPDATE para ativar todas as 34 contas Meta que ja foram sincronizadas mas estao inativas.

## Arquivos modificados

| Arquivo | Mudanca |
|---------|---------|
| `supabase/functions/oauth-callback/index.ts` | `is_active: false` → `is_active: true` no upsert de Meta accounts |
| `supabase/functions/manage-connections/index.ts` | `is_active: false` → `is_active: true` no upsert de sync_meta_accounts |
| Banco de dados (UPDATE) | Ativar todas as contas existentes inativas |

## Resultado esperado

- Todas as 34 contas Meta Ads aparecerao na Central de Conexoes como ativas
- Na Gestao de Clientes, todas as contas aparecerao como opcao para vincular
- A conta "Brasil Bitcoin 01" podera ser vinculada ao cliente normalmente
- Novas contas sincronizadas no futuro ja chegam ativas

