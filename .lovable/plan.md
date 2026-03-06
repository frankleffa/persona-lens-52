

## Plano: Melhorias de Fluidez, Tabela de Clientes e Toggle Moderno

### 1. Kanban Drag-and-Drop — Fix definitivo
**Arquivo:** `src/pages/Execution.tsx`

- Trocar `closestCorners` por `pointerWithin` (resolve pela posição do ponteiro, não do retângulo do card — elimina o problema do card bloqueando a si mesmo)
- Remover o fallback complexo com `elementsFromPoint` (linhas 282-306) — não será mais necessário
- Resultado: lógica simples e confiável

### 2. Tabela de Clientes — Visual da referência
**Arquivo:** `src/pages/AgencyControl.tsx`

Substituir o layout de accordion/lista expandível por uma **tabela de dados limpa** no estilo da imagem de referência:

- Header com busca por texto e botão de export
- Colunas: Checkbox | Cliente (avatar + nome) | Email | Label/Empresa | Contas Vinculadas | Otimizações | Data | Ações
- Rows com hover sutil, badges de status coloridos
- Manter KPI cards no topo, dialog de criação, modal de otimizações
- Expandir detalhes (contas vinculadas, WhatsApp, alertas) ao clicar na row em vez de accordion
- Checkbox de seleção por row (preparado para ações em lote futuras)

### 3. Toggle Dark/Light — Moderno
**Arquivo:** `src/components/AppSidebar.tsx`

Substituir o toggle atual (bolinha simples) por um switch minimalista estilo iOS:
- Pílula com `framer-motion` para animação spring do thumb
- Ícone de sol/lua animado dentro do thumb (rotação suave na troca)
- Cores mais vibrantes: primary quando dark, muted quando light

---

| Arquivo | Mudanças |
|---------|----------|
| `src/pages/Execution.tsx` | `closestCorners` → `pointerWithin`, remover fallback `elementsFromPoint` |
| `src/pages/AgencyControl.tsx` | Refatorar para tabela com colunas, checkboxes, busca, badges |
| `src/components/AppSidebar.tsx` | Toggle moderno com framer-motion e ícones animados |

