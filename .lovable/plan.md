

## Plano: Estilizar relatório XLSX com cores profissionais

### Problema
O SheetJS community edition não suporta estilos de célula (cores, fontes, bordas). O relatório atual é texto puro sem formatação visual — muito diferente do modelo desejado (image-17: cabeçalho azul escuro, seções com fundo cinza, totais amarelos, resumo laranja).

### Solução
Trocar `xlsx@0.18.5` por `xlsx-js-style` — um fork do SheetJS que adiciona suporte completo a estilos de célula (fill, font, border, alignment) e mantém compatibilidade com Google Sheets.

### Estilo a aplicar (baseado no print)

```text
Linha 1: RELATÓRIO DE CUSTOS — CLIENTE
  → Fundo azul escuro (#1B2A4A), texto branco, bold, tamanho 14, merge A1:H1

Linha 2: Período: DD/MM/YYYY a DD/MM/YYYY
  → Fundo azul escuro (#1B2A4A), texto branco/cinza claro, merge A2:H2

Seção plataforma (ex: META ADS — Março 2026):
  → Fundo azul (#2563EB), texto branco, bold, merge A:H

Cabeçalho colunas (Campanha, Custo, Impressões...):
  → Fundo cinza escuro (#374151), texto branco, bold

Dados campanhas:
  → Sem fundo, texto preto, bordas finas cinza

Linha TOTAL:
  → Fundo amarelo (#FDE68A), texto preto bold, bordas

RESUMO GERAL:
  → Fundo laranja (#F97316), texto branco bold, merge

Cabeçalho resumo:
  → Fundo cinza escuro, texto branco

INVESTIMENTO TOTAL:
  → Fundo amarelo escuro (#F59E0B), texto branco bold
```

### Alterações

**`supabase/functions/generate-client-report-xlsx/index.ts`**
- Trocar import de `xlsx@0.18.5` para `xlsx-js-style@1.2.0`
- Após montar o sheet com `aoa_to_sheet`, aplicar estilos célula por célula usando `ws[cellRef].s = { fill, font, border, alignment }`
- Aplicar merges nas linhas de título e seções (`ws["!merges"]`)
- Manter toda a lógica de dados inalterada

### Compatibilidade
`xlsx-js-style` gera XLSX válido com estilos que funcionam tanto no Google Sheets quanto no Excel. É o mesmo formato base do SheetJS, apenas com suporte a estilos adicionados.

