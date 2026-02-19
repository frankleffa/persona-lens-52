

# Alterar período padrão do dashboard para "Hoje + Ontem"

## O que muda

Ao acessar o dashboard, o período selecionado será automaticamente "Ontem e Hoje" (2 dias), em vez dos 30 dias atuais. Isso garante dados mais frescos e relevantes logo no primeiro acesso.

## Mudanças técnicas

### 1. Adicionar preset "LAST_2_DAYS" no tipo e na lógica de datas

**Arquivo:** `src/hooks/useAdsData.tsx`

- Adicionar `"LAST_2_DAYS"` ao tipo `DateRangeOption`
- Adicionar case no `getDateRange` para retroceder 1 dia (ontem até hoje)
- Adicionar mapeamento de `meta_date_preset` (usando `yesterday` + hoje via time_range)
- **Alterar o estado inicial** de `"LAST_30_DAYS"` para `"LAST_2_DAYS"` (linha 200)

### 2. Adicionar o preset no seletor de período

**Arquivo:** `src/components/DateRangePicker.tsx`

- Adicionar "Ontem e Hoje" na lista de PRESETS (antes de "7 dias")
- Adicionar case na função `dateRangeOptionToDates` para `LAST_2_DAYS`
- Adicionar detecção automática no `handleApply` para reconhecer o range de 2 dias

### 3. Atualizar o utilitário de comparação

**Arquivo:** `src/lib/periodUtils.ts`

- Adicionar `LAST_2_DAYS: 2` no mapa `PRESET_DAYS` para que a comparação com período anterior funcione corretamente

## Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useAdsData.tsx` | Adicionar preset LAST_2_DAYS, mudar default de LAST_30_DAYS para LAST_2_DAYS |
| `src/components/DateRangePicker.tsx` | Adicionar botão "Ontem e Hoje" nos atalhos |
| `src/lib/periodUtils.ts` | Adicionar LAST_2_DAYS no mapa de presets |

