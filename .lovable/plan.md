

## Problema

A tabela `automation_rules` no banco tem as colunas `condition` e `action` (ambas JSONB), mas o código em `useAutomation.ts` usa uma coluna `config` que não existe. O erro "Could not find the 'config' column" impede criar e atualizar regras.

## Plano

### Atualizar `src/hooks/useAutomation.ts`

Mapear o campo `config` do código para as colunas reais `condition` e `action` da tabela:

1. **Interface `AutomationRule`**: trocar `config: Record<string, any>` por `condition: Record<string, any>` e `action: Record<string, any>`
2. **Interface `CreateRuleInput`**: mesma troca
3. **Interface `UpdateRuleInput`**: mesma troca
4. **`createRuleMutation`**: no insert, usar `condition` e `action` em vez de `config`
5. **`updateRuleMutation`**: no update payload, usar `condition` e `action` em vez de `config`

### Atualizar `src/components/automation/AutomationConfig.tsx`

Ajustar todas as referências a `rule.config` e `config` nos inputs de criação/atualização para usar `condition`/`action` conforme a nova interface.

### Arquivos modificados
- `src/hooks/useAutomation.ts`
- `src/components/automation/AutomationConfig.tsx`

