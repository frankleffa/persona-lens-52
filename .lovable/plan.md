

# Corrigir exibicao da Carteira para Admin

## Problema
O hook `useUserRole` retorna `role: "manager"` como padrao enquanto carrega. O `useSubscription` usa esse valor inicial para decidir `isAdmin`, e como a query de subscription tambem resolve rapido (sem assinatura), o resultado final fica cached como "nao admin, sem feature".

A sidebar mostra "Gestor" em vez de "Admin" e o link "Carteira" nao aparece.

## Solucao
Fazer o `useSubscription` considerar o estado de loading do `useUserRole` para nao tomar decisoes antes do role estar disponivel.

## Mudancas

### 1. `src/hooks/useSubscription.ts`
- Importar `loading` de `useUserRole` (alem de `role`)
- Enquanto `useUserRole` estiver carregando, `isLoading` do subscription deve ser `true`
- Somente definir `isAdmin` quando o role ja estiver carregado

```typescript
const { role, loading: roleLoading } = useUserRole();
const isAdmin = !roleLoading && role === "admin";

// ...

return {
  // ...
  isLoading: roleLoading || (isAdmin ? false : isLoading),
};
```

### 2. `src/hooks/useUserRole.tsx`
- Exportar o `loading` state (ja exporta, confirmar que esta correto)

### 3. `src/components/AppSidebar.tsx`
- O `roleLabel` ja usa `useUserRole` diretamente, verificar que funciona apos a correcao

Nenhuma outra pagina precisa ser alterada -- a correcao e centralizada no `useSubscription`.
