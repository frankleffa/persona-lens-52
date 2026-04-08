

## Plano: Corrigir XLSX para abrir no Google Sheets

### Problema
Dois problemas prováveis impedem o arquivo de abrir no Google Sheets:

1. **Cliente**: `supabase.functions.invoke()` retorna o body como `Blob` quando o Content-Type não é JSON. Mas o código faz `new Blob([data])` — encapsulando um Blob dentro de outro Blob, o que pode corromper o binário.

2. **Servidor**: A biblioteca `ExcelJS` via `esm.sh` no Deno pode gerar buffers incompatíveis porque depende de polyfills de Node.js (streams, Buffer) que o esm.sh nem sempre resolve corretamente. Google Sheets é mais restritivo que o Excel na validação do formato.

### Solução

#### 1. Cliente — usar `fetch` direto em vez de `supabase.functions.invoke()`
- Construir a URL da Edge Function manualmente e fazer `fetch()` com `responseType: 'arraybuffer'`
- Isso garante que recebemos os bytes puros sem intermediação do SDK
- Criar o Blob diretamente do ArrayBuffer recebido

#### 2. Servidor — trocar ExcelJS por construção manual via `xlsx` (SheetJS)
- Importar SheetJS via `https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs` (compatível com Deno)
- SheetJS gera XLSX mais limpo e compatível com Google Sheets
- Replicar toda a estrutura atual (seções por plataforma, totais, resumo) usando a API do SheetJS
- Manter formatação básica (larguras de coluna, número format) — SheetJS community não suporta fills/colors, mas o arquivo abrirá corretamente

#### Trade-off de formatação
SheetJS community edition não suporta cores de fundo e estilos avançados. As opções são:
- **SheetJS (recomendado)**: arquivo funcional em todos os leitores, sem cores de fundo
- **ExcelJS com fix de buffer**: manter cores mas risco de incompatibilidade persistir

### Detalhes técnicos

**Edge Function**: Substituir `ExcelJS` por SheetJS, usando `XLSX.utils.aoa_to_sheet()` para montar a planilha linha por linha, depois `XLSX.write()` com `type: 'array'` para gerar o buffer binário.

**Cliente**: Trocar `supabase.functions.invoke()` por `fetch(url, { headers: { Authorization, apikey } })` e usar `response.arrayBuffer()`.

