

## Diagnóstico

O board de Execução (Kanban) está preso no loading (skeletons infinitos) porque a tabela **`strategic_campaigns` não existe** no banco de dados. Todas as requisições retornam **404**. O build em si compilou sem erros — o problema é exclusivamente de schema.

## Plano

### 1. Criar a tabela `strategic_campaigns`

Baseado no código de `Execution.tsx` e `campaignToDb()`, a tabela precisa das seguintes colunas:

| Coluna | Tipo | Notas |
|--------|------|-------|
| id | uuid PK | default gen_random_uuid() |
| client_id | text | referência ao cliente |
| campaign_name | text | nome da campanha |
| platform | text | "Meta Ads", "Google Ads", etc. |
| objective | text | "Conversão", etc. |
| budget | numeric | default 0 |
| start_date | date | |
| status | text | "PLANEJAMENTO", "PRONTO", "VEICULACAO", "TESTE", "FINALIZADO" |
| creatives | jsonb | array de criativos |
| copy | jsonb | headline, primary_text, etc. |
| checklist | jsonb | array de checklist items |
| notes | text | |
| learning | text | mapeado como `description` no front |
| created_at | timestamptz | default now() |

### 2. Habilitar RLS com políticas para usuários autenticados

- SELECT, INSERT, UPDATE, DELETE para `authenticated` — o usuário autenticado pode gerenciar suas campanhas.
- A política será baseada no `client_id` estar vinculado ao manager via `client_manager_links`.

### 3. Resultado esperado

Após criar a tabela, o board Kanban vai carregar corretamente mostrando as 5 colunas vazias com o botão "Adicionar um cartão" funcional.

