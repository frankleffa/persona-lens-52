

## Plano: Restringir análise de IA apenas para Gestores

### Problema
Atualmente o botão "Analisar com IA" aparece para qualquer usuário que não seja demo, incluindo clientes. Apenas gestores (e admins) devem ter acesso.

### Mudanças

**1. Frontend — `src/components/ClientDashboard.tsx`**
- Importar `useUserRole` 
- Condicionar a renderização do `AIAnalysisButton` e `AIInsightsPanel` para exibir apenas quando `role === "manager" || role === "admin"`

**2. Backend — `supabase/functions/analyze-client/index.ts`**
- Extrair o JWT do header `Authorization` da request
- Verificar na tabela `user_roles` se o usuário autenticado tem role `manager` ou `admin`
- Retornar erro 403 caso seja um cliente tentando acessar

### Detalhes

No frontend, a mudança é simples — envolver os componentes de IA com a condição de role:
```tsx
const { role } = useUserRole();
const isManager = role === "manager" || role === "admin";

// No JSX, trocar {!isDemo && ...} por {!isDemo && isManager && ...}
```

No backend, adicionar verificação logo após parsear o body:
```typescript
const authHeader = req.headers.get("Authorization");
const { data: { user } } = await supabase.auth.getUser(authHeader?.replace("Bearer ", ""));
if (!user) throw new Error("Não autenticado");

const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id).limit(1);
const userRole = roles?.[0]?.role;
if (userRole === "client") {
  return new Response(JSON.stringify({ error: "Acesso negado", insights: [] }), { status: 403, headers: corsHeaders });
}
```

Nenhuma mudança de banco de dados necessária.

