

O erro é claro nos logs:

1. `creative_suggestions` table não existe no banco (PGRST205)
2. `generate-creatives` edge function falha ao ser invocada (FunctionsFetchError)

A feature de sugestão de criativos foi implementada no frontend (`useCreativeSuggestions.ts`) e provavelmente o edge function existe, mas a tabela do banco nunca foi criada.

## Plano: Corrigir geração de sugestões de criativos

### Problema
A feature de "Sugestão de Criativos" foi implementada mas a tabela `creative_suggestions` nunca foi criada no banco. Isso causa:
- Erro 404 ao listar sugestões existentes
- Edge function `generate-creatives` falha ao tentar inserir resultados

### Solução

**1. Criar tabela `creative_suggestions`** via migration:

```sql
CREATE TABLE public.creative_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  generated_by uuid,
  replaces_ad_name text,
  hook text NOT NULL,
  headline text NOT NULL,
  primary_text text NOT NULL,
  cta text,
  angulo text,
  por_que_funciona text,
  status text NOT NULL DEFAULT 'pending',
  reference_ads jsonb DEFAULT '[]'::jsonb,
  context_note text,
  modelo_ia text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.creative_suggestions ENABLE ROW LEVEL SECURITY;
```

**RLS policies**:
- SELECT/INSERT/UPDATE: gestor vinculado ao cliente (via `client_manager_links`) ou admin
- O próprio cliente pode ver suas sugestões

**2. Verificar/ajustar edge function `generate-creatives`**:
- Confirmar que existe (já está em `supabase/functions/generate-creatives/index.ts`)
- Garantir CORS headers corretos
- Validar que está usando `supabase-js@2` (não `npm:`)
- Confirmar uso de `LOVABLE_API_KEY` para chamar Gemini/GPT
- Verificar que insere na tabela `creative_suggestions` corretamente

**3. Trigger `update_updated_at`** na tabela para manter `updated_at` sincronizado.

### Resultado
- Lista de sugestões carrega sem 404
- Botão "Gerar 5 variações" funciona e persiste resultados
- Gestores conseguem marcar como usado/descartar

