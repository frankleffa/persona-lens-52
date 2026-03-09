

## Plano: Reformulação completa do Kanban de Execução

### Mudanças no banco de dados

**1. Tabela `strategic_campaigns` — novos campos:**
- `due_date` (date, nullable) — prazo de entrega
- `assigned_to` (uuid, nullable) — responsável (referência lógica ao `profiles.id`)
- `position` (integer, default 0) — ordem dentro da coluna para reordenação

**2. Nova tabela `campaign_comments`:**
- `id` (uuid, PK)
- `campaign_id` (uuid, NOT NULL) — referência ao `strategic_campaigns.id`
- `user_id` (uuid, NOT NULL)
- `content` (text, NOT NULL)
- `created_at` (timestamptz, default now())

RLS: managers podem CRUD nos comentários de campanhas que gerenciam (via `client_manager_links`).

### Mudanças no frontend

**1. CampaignCard — informações visuais melhoradas:**
- Exibir avatar do responsável (buscar do `profiles`)
- Exibir due date com indicador visual: verde (no prazo), amarelo (amanhã), vermelho (atrasado)
- Exibir contador de comentários
- Progresso do checklist como barra visual em vez de texto

**2. Execution.tsx — UX do board:**
- Adicionar busca por texto (filtrar cards por nome)
- Exibir contadores de progresso no header de cada coluna (ex: "3/5 concluídos")
- Corrigir o layout para scroll vertical correto por coluna
- Melhorar feedback de drag com cores mais claras por coluna de destino
- Adicionar botão de colapsar colunas

**3. CampaignDrawer — novas seções:**
- Seção "Responsável" com select de membros (perfis do manager)
- Seção "Prazo" com date picker
- Seção "Comentários" com lista de comentários + input para adicionar novo
- Seção "Atividade" mostrando histórico de mudanças (comentários + status changes)

**4. Novos componentes:**
- `src/components/execution/KanbanColumnHeader.tsx` — header da coluna com contador, collapse toggle
- `src/components/execution/CampaignComments.tsx` — seção de comentários dentro do drawer
- `src/components/execution/DueDateBadge.tsx` — badge visual de prazo

### Correções de bugs
- Corrigir reordenação dentro da mesma coluna (atualmente não persiste posição)
- Corrigir o `mapDbToCampaign` para suportar labels vindas do DB (atualmente sempre `[]`)
- Garantir que o drawer atualiza o estado local ao salvar sem precisar re-fetch

