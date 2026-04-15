

## Plano: Corrigir UTM breakdown do GA4 que não aparece no dashboard

### Diagnóstico

Investiguei o fluxo completo:
- A edge function `fetch-ads-data` chama `fetchGA4Data` que retorna `{ sessions, events, conversion_rate, utm_breakdown }`
- A resposta da API **não contém** `utm_breakdown` — testei diretamente e o campo está ausente
- O bloco try/catch do UTM (linhas 590-638) está falhando silenciosamente
- A causa provável: a métrica `keyEvents` usada na query UTM (linha 609) pode não ser suportada pela versão da API ou configuração da propriedade GA4 — o Google renomeou `conversions` para `keyEvents` recentemente
- O `console.error` do catch não aparece nos logs (provavelmente por limitação do runtime)

### Alterações

**1. `supabase/functions/fetch-ads-data/index.ts`** — Corrigir o bloco de UTM breakdown:
- Adicionar fallback: tentar primeiro com `keyEvents`, se falhar tentar com `conversions`
- Adicionar `console.log` antes e depois da requisição UTM para diagnóstico
- Garantir que `utm_breakdown` sempre está presente no resultado (mesmo vazio)
- Melhorar o logging do catch para usar `console.log` (mais confiável que `console.error` nos logs)

**2. Verificar e re-deploy** a edge function, depois testar se o campo `utm_breakdown` aparece na resposta.

### Resultado esperado
- A tabela de UTMs do GA4 aparecerá no dashboard quando houver dados
- Se não houver dados UTM, o campo estará vazio mas presente na resposta
- Logs de diagnóstico permitirão debugar problemas futuros

