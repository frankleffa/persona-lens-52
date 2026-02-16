
# Criar hook `useOptimizationTasks`

## Arquivo novo

`src/hooks/useOptimizationTasks.ts`

## O que sera implementado

Um hook React que encapsula todas as operacoes CRUD da tabela `optimization_tasks`.

### Interface retornada

```text
{
  tasks: OptimizationTask[]
  loading: boolean
  error: string | null
  createTask: (title: string, description?: string) => Promise<void>
  updateTaskStatus: (taskId: string, newStatus: "TODO" | "IN_PROGRESS" | "DONE") => Promise<void>
}
```

### Tipo `OptimizationTask`

Mapeado a partir do tipo gerado `Tables<"optimization_tasks">` do Supabase.

### Logica

1. **Fetch**: buscar da tabela `optimization_tasks` filtrando por `client_id`, ordenando por `status` ASC (TODO primeiro) e `created_at` DESC
2. **createTask**: inserir nova task com `client_id`, `title`, `description` opcional, recarregar lista apos sucesso
3. **updateTaskStatus**: atualizar `status` do task pelo `taskId`. Se `newStatus === "DONE"`, incluir `completed_at: new Date().toISOString()`. Se diferente de DONE, limpar `completed_at` para `null`. Recarregar lista apos sucesso
4. **Padrao**: seguir o mesmo padrao de `useState`/`useEffect`/`useCallback` usado em `useAgencyControl.ts`, importando supabase de `@/lib/supabase`

### Detalhes tecnicos

- Ordenacao por status usa ordem alfabetica natural do Postgres (`DONE` < `IN_PROGRESS` < `TODO`), entao sera usado `.order("status", { ascending: true })` seguido de `.order("created_at", { ascending: false })` para que TODO venha primeiro sera necessario reverter para ascending false no status ou usar ordenacao customizada no frontend
- Como a ordem alfabetica nao garante TODO primeiro (D < I < T), a ordenacao por status sera feita no frontend apos o fetch, com prioridade: TODO=0, IN_PROGRESS=1, DONE=2
- O fetch do Supabase usara apenas `.order("created_at", { ascending: false })`

### Nenhum outro arquivo sera alterado
