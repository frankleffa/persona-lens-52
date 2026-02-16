
# Criar `src/lib/periodUtils.ts`

## Objetivo
Criar um utilitário de cálculo de períodos de comparação para o dashboard de métricas.

## O que será criado

Um único arquivo novo: `src/lib/periodUtils.ts`

### Tipos exportados

- **PresetRange**: `"LAST_7_DAYS" | "LAST_14_DAYS" | "LAST_30_DAYS"`
- **CustomRange**: `{ start: string; end: string }`
- **DateRange**: `PresetRange | CustomRange`

### Função exportada

```text
getComparisonPeriods(range: DateRange) => {
  current: { start: string; end: string }
  previous: { start: string; end: string }
}
```

### Lógica

1. Se `range` for preset:
   - `LAST_7_DAYS`: current = ultimos 7 dias, previous = 7 dias antes disso
   - `LAST_14_DAYS`: current = ultimos 14 dias, previous = 14 dias antes
   - `LAST_30_DAYS`: current = ultimos 30 dias, previous = 30 dias antes
2. Se `range` for custom `{ start, end }`:
   - Calcular duração em dias entre start e end
   - Previous = mesmo numero de dias imediatamente antes do start
3. Datas retornadas no formato `YYYY-MM-DD`
4. Usar `date-fns` (ja instalado) para manipulacao de datas

### Nenhum outro arquivo sera alterado
