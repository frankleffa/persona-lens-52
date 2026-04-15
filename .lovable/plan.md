

## Plano: Alinhar fuso horário do Adscape com a conta de anúncios

### Problema
`getBrazilToday()` usa o fuso do navegador do usuário para calcular "Hoje" e todos os intervalos de data. Se a conta Meta está em `America/Noronha` (UTC-2) e o gestor está em `America/Sao_Paulo` (UTC-3), o "Hoje" pode divergir — causando discrepâncias nos dados exibidos.

### Solução
Usar o `timezone_name` da conta Meta do cliente como referência para todos os cálculos de data no dashboard. O timezone já é retornado pela API (`meta_timezones`), só precisa ser propagado para as funções de data.

### Alterações

**1. `src/lib/date-utils.ts`** — Tornar timezone-aware:

- Alterar `getBrazilToday(timezone?: string)` para aceitar um timezone opcional
- Quando fornecido, calcular a data atual naquele timezone usando `Intl.DateTimeFormat` com `timeZone` option (sem dependências externas)
- Propagar o timezone para `getDateRange`, `getPreviousDateRange`, `getComparisonDateRange`

```typescript
export const getTodayInTimezone = (tz?: string): Date => {
  const now = new Date();
  if (!tz) return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // Use Intl to get date parts in the target timezone
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit"
  }).format(now).split("-");
  return new Date(+parts[0], +parts[1] - 1, +parts[2]);
};
```

**2. `src/hooks/useAdsData.tsx`** — Extrair timezone do cliente:

- Após o primeiro fetch que retorna `meta_timezones`, guardar o timezone principal (primeiro valor do map) num state
- Passar esse timezone para `getDateRange(range, tz)` e `getComparisonDateRange(range, mode, tz)`
- Na construção de DB queries, usar datas ajustadas ao timezone da conta

**3. `src/services/ads-api.ts`** — Propagar timezone:

- `buildRequestBody` recebe timezone opcional para garantir que as datas enviadas ao Edge Function estejam alinhadas com a conta

**4. `src/components/ClientDashboard.tsx`** — Exibir timezone ativo:

- Substituir o alerta de "fuso diferente" por um indicador permanente e discreto mostrando o timezone em uso (ex: badge "🕐 America/Noronha" no header)
- Remover o alerta amarelo de discrepância — agora o sistema usa o timezone correto

**5. Buscar timezone do cliente antes do primeiro fetch (opcional, performance)**:

- Ao selecionar um cliente, fazer uma query rápida em `manager_meta_ad_accounts` para obter o `timezone_name` das contas atribuídas via `client_meta_ad_accounts` join
- Isso evita esperar o primeiro fetch-ads-data para saber o timezone

### Detalhes técnicos

- Usa `Intl.DateTimeFormat` nativo — zero dependências novas
- O timezone é extraído de `meta_timezones` (já retornado pelo Edge Function)
- Se não houver timezone disponível (cliente sem Meta), mantém o comportamento atual (timezone do navegador)
- O timezone ativo é persistido em memória (state) para evitar re-cálculos
- Todas as funções de `date-utils.ts` recebem `tz?: string` como último parâmetro — backward compatible

### Resultado
- "Hoje" no Adscape = "Hoje" na conta de anúncios do cliente
- Dados do dashboard sempre alinhados com o fuso da plataforma de anúncios
- Sem discrepâncias de data entre o que o Meta reporta e o que o Adscape mostra

