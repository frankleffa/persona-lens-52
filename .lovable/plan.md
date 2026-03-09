

## Plano: Corrigir timeout da IA nas análises

### Diagnóstico

Os logs mostram que **todas** as chamadas à `deep-analysis` estão falhando com `AbortError: The signal has been aborted`. A causa é um timeout de 30 segundos na chamada à API da Anthropic (linha 527), que é insuficiente para prompts grandes com tabelas de campanhas.

A mesma vulnerabilidade existe em `analyze-client`, que não tem timeout mas usa o mesmo provedor.

### Solução

Migrar ambas as edge functions de **Anthropic** para **Lovable AI** (gateway já configurado com `LOVABLE_API_KEY`). Isso resolve:
- Timeout: Lovable AI responde mais rápido e podemos aumentar o timeout para 60s
- Custo: Lovable AI tem uso incluído, sem depender de créditos Anthropic
- Confiabilidade: elimina dependência de modelo específico (`claude-sonnet-4`) que pode não existir

### Mudanças

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/deep-analysis/index.ts` | Trocar `callAnthropic` por chamada ao Lovable AI gateway. Aumentar timeout para 60s. Usar modelo `google/gemini-2.5-flash`. |
| `supabase/functions/analyze-client/index.ts` | Trocar `callAnthropic` por chamada ao Lovable AI gateway. Adicionar timeout de 60s. Usar modelo `google/gemini-2.5-flash`. |

### Detalhes técnicos

- Endpoint: `https://ai.gateway.lovable.dev/v1/chat/completions`
- Auth: `Bearer ${LOVABLE_API_KEY}`
- Modelo: `google/gemini-2.5-flash` (bom equilíbrio velocidade/qualidade para análise de dados)
- Formato: OpenAI-compatible, resposta em `choices[0].message.content`
- Timeout: 60 segundos com AbortController
- Fallback: tratar erros 429 (rate limit) e 402 (créditos) com mensagens específicas

