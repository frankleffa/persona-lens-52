

## Plano: Reverter para Anthropic/Claude com timeout corrigido

Ambas as edge functions (`analyze-client` e `deep-analysis`) foram migradas para o Lovable AI Gateway na última alteração. Vou reverter para usar a API da Anthropic diretamente, mantendo as correções de timeout (60s) e tratamento de erros.

### Mudanças

| Arquivo | O que muda |
|---------|-----------|
| `supabase/functions/analyze-client/index.ts` | Trocar `callLovableAI` por `callAnthropic` usando `ANTHROPIC_API_KEY`, modelo `claude-sonnet-4-20250514` com fallback para `claude-3-5-sonnet-20241022`, timeout 60s |
| `supabase/functions/deep-analysis/index.ts` | Mesmo: trocar `callLovableAI` por `callAnthropic`, manter timeout 60s, tratar erros 429/402/`not_found` |

### Detalhes da função `callAnthropic`

- Endpoint: `https://api.anthropic.com/v1/messages`
- Headers: `x-api-key`, `anthropic-version: 2023-06-01`
- Modelo primário: `claude-sonnet-4-20250514`
- Fallback: se erro `not_found`, retry com `claude-3-5-sonnet-20241022`
- Timeout: 60s via `AbortController` (era 30s antes, causava o erro)
- Tratamento de `credit balance is too low` → mensagem específica para o usuário
- `max_tokens`: 1500 (analyze-client) e 2000 (deep-analysis)

### Validação

A secret `ANTHROPIC_API_KEY` já existe no projeto — nenhuma configuração adicional necessária.

