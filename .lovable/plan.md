

## Plano: Análise de IA mais profunda e com mais liberdade

### Problema atual
As duas Edge Functions de análise (`analyze-client` e `deep-analysis`) têm limitações artificiais:
- **`max_tokens` baixo**: 4000 e 4096 respectivamente — a IA é cortada antes de aprofundar
- **Limites de itens rígidos**: "4 a 8 insights", "máximo 3 alertas, 3 oportunidades, 5 otimizações"
- **Prompt restritivo**: instruções como "2-4 frases" e "max 10 words" forçam respostas superficiais
- **Timeout curto no `analyze-client`**: 90s pode não ser suficiente para respostas mais longas

### Mudanças

#### 1. Edge Function `analyze-client/index.ts`
- Aumentar `max_tokens` de **4000 → 8000**
- Aumentar timeout de **90s → 120s**
- No prompt, expandir limites:
  - De "4 to 8 insights" → "6 to 15 insights"
  - De "description in 2-4 sentences" → "description in 3-6 sentences with deep reasoning"
  - De "max 10 words" no título → "max 15 words"
  - De "3 to 5 plano_acao items" → "4 to 7 plano_acao items"
  - Adicionar instrução para incluir **raciocínio estratégico** (por que, não apenas o que)
  - Adicionar instrução para **correlacionar dados entre campanhas** e identificar padrões
  - Adicionar instrução para **projeções numéricas** (se fizer X, espere Y)

#### 2. Edge Function `deep-analysis/index.ts`
- Aumentar `max_tokens` de **4096 → 8192**
- No prompt, expandir limites:
  - De "Máximo: 3 alertas críticos, 3 oportunidades, 5 otimizações" → "Máximo: 5 alertas, 5 oportunidades, 8 otimizações"
  - De "3 a 5 itens em plano_acao" → "4 a 7 itens em plano_acao"
  - Expandir descrições de "2-3 frases" → "3-6 frases com análise causal"
  - Adicionar seções obrigatórias no prompt: **análise de correlação entre campanhas**, **diagnóstico causal** (não só o que está errado, mas POR QUE), **cenários projetados** (otimista/pessimista)
  - Adicionar instrução para **comparar campanhas entre si** e sugerir redistribuição inteligente de budget

#### 3. Sem mudanças no frontend
Os componentes já renderizam listas dinâmicas — mais itens serão exibidos automaticamente.

### Resultado
A IA terá o dobro de espaço para responder, poderá gerar até 15 insights (vs 8), incluir raciocínio estratégico profundo, correlações entre campanhas e projeções numéricas concretas.

