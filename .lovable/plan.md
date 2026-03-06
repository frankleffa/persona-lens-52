

## Problema

O app ainda tem resquícios visuais antigos que não seguem a identidade azul unificada e o estilo moderno dos componentes `LeadsTable`/`ContactsTable`. Identifiquei:

1. **Execution.tsx linha 380**: cor hardcoded `#FF5C3A` (coral) no hover accent line das colunas kanban
2. **Execution.tsx linhas 384, 391**: referências a fontes `Syne` e `DM Mono` que não são as fontes do sistema (`Geist` / `Geist Mono`)
3. **Execution.tsx linha 315**: mesma fonte `Syne` no título "Execução"
4. O `LeadsTable` foi criado mas não está integrado em nenhuma página

## Plano

### 1. Corrigir cores e fontes hardcoded no Execution.tsx

| Linha | De | Para |
|-------|-----|------|
| 380 | `background: '#FF5C3A'` | `background: 'var(--accent)'` |
| 384, 315 | `fontFamily: 'Syne, sans-serif'` | `fontFamily: 'var(--font-sans)'` |
| 391 | `fontFamily: 'DM Mono, monospace'` | `fontFamily: 'var(--font-mono)'` |

### 2. Sidebar width ajustada

O sidebar usa `w-[220px]` mas o conteúdo faz `lg:ml-64` (256px) — há 36px de espaço morto. Unificar para `w-64` / `lg:ml-64`.

### 3. Integrar o LeadsTable (opcional, para demonstração)

O componente já está em `src/components/ui/leads-data-table.tsx`. Posso integrá-lo como uma view alternativa na página de Clientes (`AgencyControl`) ou como seção no Dashboard, conforme preferir.

### Arquivos afetados

| Arquivo | Mudanças |
|---------|----------|
| `src/pages/Execution.tsx` | 4 linhas: trocar cores e fontes hardcoded |
| `src/components/AppSidebar.tsx` | 1 linha: `w-[220px]` → `w-64` |

