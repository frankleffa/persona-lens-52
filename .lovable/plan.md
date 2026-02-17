

# Corrigir URL da Evolution API

## Problema

O secret `EVOLUTION_API_URL` esta salvo com um path extra incluindo um UUID de manager:

**Valor atual (incorreto):** `http://187.77.45.58:57317/manager/instance/8562f0a0-c091-41e3-8788-d143d29d5a98`

**Valor correto:** `http://187.77.45.58:57317`

Por isso, quando a Edge Function monta a URL de criacao de instancia, ela fica:
`/manager/instance/{uuid}/instance/create` em vez de `/instance/create`

## Solucao

Atualizar o secret `EVOLUTION_API_URL` para conter apenas a URL base:

```
EVOLUTION_API_URL = http://187.77.45.58:57317
```

Alem disso, como medida defensiva, adicionar um `.replace(/\/+$/, "")` no codigo da Edge Function para remover trailing slashes e evitar esse tipo de problema no futuro.

## Arquivos a modificar

| Arquivo | Acao |
|---------|------|
| Secret `EVOLUTION_API_URL` | Atualizar para `http://187.77.45.58:57317` |
| `supabase/functions/evolution-whatsapp/index.ts` | Sanitizar a URL removendo trailing slashes |

