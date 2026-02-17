

# Acesso total para Admin sem assinatura

## Objetivo
Garantir que usuarios com role `admin` tenham acesso a todos os recursos, independente de possuirem assinatura ativa.

## Abordagem
Modificar o hook `useSubscription` para receber o role do usuario e, quando for `admin`, retornar valores que desbloqueiam tudo automaticamente.

## Mudanca

**Arquivo: `src/hooks/useSubscription.ts`**

- Importar `useUserRole`
- Se o role for `admin`, forcar `hasFeature` a retornar `true` sempre, `isActive` como `true`, e limites altos para `maxClients` e `maxAdAccounts`

Isso resolve de forma centralizada -- todas as paginas que usam `hasFeature` (AppSidebar, AgencyControlCenter, Permissions) passam a liberar acesso automaticamente para admins.

## Detalhes tecnicos

```text
useSubscription()
  |
  +-- useUserRole() -> role
  |
  +-- if role === "admin"
  |     hasFeature() -> always true
  |     isActive -> true
  |     maxClients -> 999
  |     maxAdAccounts -> 999
  |
  +-- else
        (comportamento atual via query no banco)
```

Nenhuma outra pagina ou componente precisa ser alterado.
