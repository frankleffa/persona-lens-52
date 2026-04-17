

## Diagnóstico

**Sintomas:**
- Toast: "Failed to send a request to the Edge Function"
- `supabase--edge_function_logs` para `generate-creatives` retorna **zero logs** — a função nunca foi invocada/boot com sucesso
- Outras functions (deep-analysis, fetch-ads-data) bootam normalmente

**Causa provável:** a função `generate-creatives` existe em `supabase/functions/generate-creatives/index.ts` e está registrada em `supabase/config.toml`, mas não está respondendo no runtime. Como nenhuma invocação aparece nos logs, o problema é deploy/boot, não runtime.

Após inspecionar o código, encontrei suspeitos:
1. Usa `https://deno.land/std@0.168.0/http/server.ts` (versão antiga — outras functions do projeto também usam, então não é bloqueador, mas vale padronizar)
2. **Mais provável:** a função simplesmente não foi deployada/redeployada após criação. Um redeploy "force" via mudança no arquivo deve resolver.

## Plano

1. **Forçar redeploy** da `generate-creatives` adicionando um log de boot no topo do `serve()` (mudança mínima que força republicação).
2. **Verificar invocação** chamando a função diretamente via `supabase--curl_edge_functions` pra capturar o erro real (404 = não deployada; 500 = erro de runtime; 200 = funciona).
3. Se for erro de runtime/boot, ajustar imports (trocar `deno.land/std` por `npm:` ou versão mais recente) e adicionar tratamento defensivo no parse do body.
4. **Confirmar CORS** — headers já incluem todos os campos necessários, sem alteração esperada.

### Resultado esperado
- `curl` da função retorna 401/200 (não erro de rede)
- Botão "Gerar 5 variações" no dialog dispara a function e persiste em `creative_suggestions`
- Logs aparecem no painel após primeira invocação

