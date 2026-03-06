

## Plano: Reduzir requisito mínimo para 1 dia

### Problema adicional detectado

Os logs da edge function mostram que a API Anthropic está retornando erro de saldo insuficiente:
> "Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits."

Isso significa que mesmo reduzindo o requisito de dias, a análise vai falhar até que o saldo da conta Anthropic seja recarregado. Uma alternativa seria migrar para o Lovable AI Gateway (sem necessidade de API key própria).

### Alteração no requisito de dias

**`supabase/functions/analyze-client/index.ts`** — Duas mudanças:

1. Linha ~57: Alterar a validação de `uniqueDates.size < 3` para `uniqueDates.size < 1`
2. Linha ~54: Atualizar a mensagem de erro correspondente de "mínimo 3 dias" para "mínimo 1 dia"

Ambas as verificações (linhas ~49-53 e ~56-60) precisam ser atualizadas.

### Resumo

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/analyze-client/index.ts` | Reduzir threshold de 3 para 1 dia em duas validações |

Depois de aplicar, a função precisa ser re-deployada. Porém, o erro de saldo da Anthropic continuará até ser resolvido externamente ou migrar para Lovable AI.

