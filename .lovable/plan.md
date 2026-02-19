

# Substituir botoes de periodo por calendario interativo

## Resumo

Substituir os botoes fixos ("Hoje", "7 dias", "14 dias", "30 dias") por um date range picker com calendario que permite selecionar data inicial e final livremente. Toda a cadeia (frontend, hook, edge function, comparacao de periodos) sera atualizada.

---

## Mudancas planejadas

### 1. `src/hooks/useAdsData.tsx` — Suportar datas customizadas

- Mudar o tipo `DateRangeOption` para aceitar tambem um objeto `{ startDate: string; endDate: string }`:

```ts
export type DateRangeOption = 
  | "TODAY" | "LAST_7_DAYS" | "LAST_14_DAYS" | "LAST_30_DAYS"
  | { startDate: string; endDate: string };
```

- Atualizar `getDateRange()` para lidar com objetos custom (retornar as datas diretamente)
- Atualizar `getPreviousDateRange()` para calcular o periodo anterior com base na duracao do range custom
- Atualizar o mapeamento de `metaPreset` e `ga4Range`:
  - Para ranges custom, Meta usa `time_range` em vez de `date_preset` (passado como JSON no body)
  - Google Ads usa `BETWEEN 'YYYY-MM-DD' AND 'YYYY-MM-DD'` em vez de `DURING LAST_30_DAYS`
  - GA4 ja aceita datas no formato `YYYY-MM-DD`
- Atualizar `expectedDays` para calcular com base na diferenca de dias do range
- Ajustar `shouldPersist` no body: enviar flag `is_today: true` apenas quando o range cobre somente o dia atual

### 2. `supabase/functions/fetch-ads-data/index.ts` — Aceitar datas custom

- Aceitar novo campo `meta_time_range` no body (objeto `{ since, until }`) como alternativa ao `meta_date_preset`
- Na chamada Meta, usar `time_range` na URL quando fornecido, em vez de `date_preset`
- Para Google Ads, aceitar `google_date_range` como string `BETWEEN 'start' AND 'end'` quando for custom
- Manter a logica `shouldPersist` verificando se a data e apenas TODAY

### 3. `src/components/DateRangePicker.tsx` — Novo componente

Criar um componente de date range picker usando:
- `Popover` + `Calendar` (Shadcn) com `mode="range"`
- Botao trigger mostrando o range selecionado formatado (ex: "06 Fev - 19 Fev")
- Presets rapidos dentro do popover: "Hoje", "7 dias", "14 dias", "30 dias"
- Botao "Aplicar" para confirmar a selecao
- Classe `pointer-events-auto` no Calendar para garantir interatividade dentro do Popover
- Limitar selecao a datas ate hoje (nao permitir futuro)

### 4. `src/components/ClientDashboard.tsx` — Usar novo componente

- Remover o array `DATE_OPTIONS` e os botoes de periodo
- Importar e renderizar `DateRangePicker` no lugar
- O componente emite o `DateRangeOption` (preset ou custom) que e passado para `changeDateRange`

### 5. `src/components/WhatsAppReportConfig.tsx` e outros consumidores

- Verificar se outros componentes importam `DateRangeOption` e ajustar se necessario

---

## Detalhes tecnicos

### Meta Ads API — Custom date range
Em vez de `date_preset=last_30d`, usar query parameter:
```
time_range={"since":"2026-02-06","until":"2026-02-19"}
```

### Google Ads API — Custom date range
Em vez de `DURING LAST_30_DAYS`, usar:
```
WHERE segments.date BETWEEN '2026-02-06' AND '2026-02-19'
```

### Logica de persistencia
A persistencia no banco (upsert de `daily_metrics`) so acontece quando:
- O range e exatamente "TODAY" (um unico dia = hoje)
- Isso ja esta implementado e sera mantido

### Comparacao de periodos
Para um range custom de N dias, o periodo anterior sera os N dias imediatamente anteriores ao inicio do range selecionado. A logica em `getPreviousDateRange` sera atualizada para calcular isso corretamente.

### Cobertura de dados
O `expectedDays` sera calculado como `differenceInDays(end, start) + 1` para ranges custom, permitindo o banner de "dados incompletos" funcionar corretamente.

---

## Arquivos modificados

| Arquivo | Mudanca |
|---------|---------|
| `src/components/DateRangePicker.tsx` | Novo componente de calendario com range |
| `src/hooks/useAdsData.tsx` | Suportar `DateRangeOption` custom, ajustar mapeamentos de API |
| `src/components/ClientDashboard.tsx` | Substituir botoes por `DateRangePicker` |
| `supabase/functions/fetch-ads-data/index.ts` | Aceitar `meta_time_range` e `google_date_range` custom |
| `src/components/ui/calendar.tsx` | Adicionar `pointer-events-auto` |

