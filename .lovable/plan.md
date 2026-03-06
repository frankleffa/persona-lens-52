

## Problema

A tabela `client_analysis_config` **não existe** no banco de dados. As requisições retornam 404 com a mensagem "Could not find the table 'public.client_analysis_config' in the schema cache". O código usa `as any` para contornar o TypeScript, mas a tabela nunca foi criada.

## Plano

### 1. Criar tabela `client_analysis_config` via migração

```sql
CREATE TABLE public.client_analysis_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL UNIQUE,
  vertical text NOT NULL DEFAULT 'ecommerce',
  primary_metric text NOT NULL DEFAULT 'purchases',
  primary_metric_label text NOT NULL DEFAULT 'Compras',
  cpa_target numeric,
  roas_target numeric,
  monthly_budget numeric,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.client_analysis_config ENABLE ROW LEVEL SECURITY;

-- Managers can manage configs for their clients
CREATE POLICY "Managers can manage client analysis config"
ON public.client_analysis_config FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM client_manager_links
    WHERE client_manager_links.client_user_id = client_analysis_config.client_id
    AND client_manager_links.manager_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM client_manager_links
    WHERE client_manager_links.client_user_id = client_analysis_config.client_id
    AND client_manager_links.manager_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_client_analysis_config_updated_at
  BEFORE UPDATE ON public.client_analysis_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 2. Criar também as outras tabelas faltantes

As tabelas `automation_rules`, `automation_log` e `analysis_reports` também retornam 404. Serão criadas na mesma migração para eliminar os erros repetidos no console.

### Arquivos modificados
- Migração SQL (via ferramenta de migração) -- cria as 4 tabelas faltantes
- Nenhuma mudança de código necessária (o hook `useClientAnalysisConfig` já está correto)

