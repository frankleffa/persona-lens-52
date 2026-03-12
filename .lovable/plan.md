

## Plano: Reverter deep-analysis para Anthropic Claude

### Contexto
A função `deep-analysis` foi migrada para Lovable AI Gateway (Gemini 2.5 Flash) para resolver um timeout 504. O usuário prefere manter a API da Anthropic pela qualidade superior. A secret `ANTHROPIC_API_KEY` já está configurada.

### Causa raiz do timeout original
O timeout de 504 ocorria porque o prompt é muito grande e complexo. A solução não é trocar o modelo — é aumentar o timeout e tratar melhor a resposta lenta.

### Mudanças em `supabase/functions/deep-analysis/index.ts`

**1. Substituir `callLovableAI` por `callAnthropic`**
- Usar `https://api.anthropic.com/v1/messages` com modelo `claude-sonnet-4-20250514`
- Usar `ANTHROPIC_API_KEY` (já configurada como secret)
- Timeout de 120s no `AbortController` (Anthropic suporta respostas mais longas)
- `max_tokens: 4096` para garantir resposta completa
- Tratar erros específicos: 429 (rate limit), 529 (overloaded), 401 (chave inválida)

**2. Atualizar `supabase/config.toml`** — NÃO (auto-gerenciado)

**3. Manter fallback robusto**
- Se Anthropic falhar com 529/503, retornar mensagem amigável pedindo retry
- Manter o parse de JSON existente (funciona igual)

### Arquivo alterado
- `supabase/functions/deep-analysis/index.ts` — apenas a função `callLovableAI` → `callAnthropic`

