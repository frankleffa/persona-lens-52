
# Labels Coloridas + Card com Descritivo (Copy, Imagem, Video)

## O que muda

### 1. Labels coloridas editaveis nos cards (estilo Trello)
- Adicionar um campo `labels` ao tipo `Campaign` -- array de objetos `{ id, text, color }`
- Predefinir 6 cores (verde, amarelo, laranja, vermelho, roxo, azul) como no Trello
- No card, exibir as labels como barrinhas coloridas clicaveis na parte superior
- Ao clicar numa label, abrir um pequeno popover para editar o texto ou remover
- No drawer, adicionar secao para gerenciar labels (adicionar, editar texto, trocar cor, remover)

### 2. Card com descritivo -- copy, imagem e video
- Adicionar campo `description` (string) ao tipo `Campaign` para texto descritivo livre
- Adicionar campo `cover_url` (string opcional) para imagem/video de capa do card
- No card, se houver `cover_url`, renderizar uma miniatura de imagem/video acima do titulo (estilo Trello cover)
- Se houver `description`, mostrar um icone de texto no footer do card indicando que tem descricao
- No drawer, adicionar campos para:
  - Descricao livre (textarea)
  - URL de capa (imagem ou video) com preview inline
  - A copy do anuncio ja existe no drawer, mantemos como esta

### 3. Layout do card -- quadrado como no Trello
- Aumentar a largura efetiva do conteudo do card removendo padding excessivo
- Card ocupa toda largura da coluna com aspecto mais "quadrado" quando tem capa
- Sem a capa, card fica compacto como hoje mas com as labels no topo

## Detalhes Tecnicos

### Alteracoes em `src/lib/execution-types.ts`
- Adicionar interface `Label` com campos `id`, `text`, `color`
- Adicionar `LABEL_COLORS` constante com 6 cores predefinidas
- Adicionar campos `labels`, `description`, `cover_url` a interface `Campaign`

### Alteracoes em `src/components/CampaignCard.tsx`
- Renderizar labels como pequenas barras coloridas no topo (flex wrap, gap-1)
- Se `cover_url` presente, renderizar imagem de capa com aspect-ratio 16/9 acima das labels
- Adicionar icones no footer: icone de descricao (AlignLeft) quando houver texto
- Manter editar titulo com duplo-clique

### Alteracoes em `src/components/CampaignDrawer.tsx`
- Adicionar secao "Labels" com chips coloridos clicaveis para toggle + input para texto
- Adicionar campo "Descricao" (textarea) 
- Adicionar campo "Imagem de Capa" (input URL com preview)
- Manter secoes existentes (copy, criativos, checklist)

### Alteracoes em `src/pages/Execution.tsx`
- Atualizar mock data para incluir labels e description nos exemplos
- Passar callbacks de update labels para os cards
