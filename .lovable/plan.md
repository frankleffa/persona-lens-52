

## Problema: FTD não aparece no consolidated da Edge Function

### Diagnóstico

A descoberta de eventos **já funciona** — os logs confirmam 3 conversões personalizadas encontradas (ftd, ftd2, FTD). O `extractMetaCustomAction` também está correto.

O problema está em **duas lacunas**:

### 1. `result.consolidated` não inclui `ftd`

No `fetch-ads-data/index.ts` (linha 882-898), o objeto `consolidated` retornado pela Edge Function **não tem `ftd` nem `cost_per_ftd`**:

```typescript
result.consolidated = {
  investment, revenue, roas, leads, messages, cpa, ctr, cpc,
  conversion_rate, sessions, events, all_campaigns,
  // ← ftd e cost_per_ftd FALTAM aqui
};
```

Quando o frontend usa o caminho do banco de dados (daily_metrics), o FTD funciona porque o hook `useAdsData` calcula FTD das rows. Mas no **caminho live** (fallback sem dados no DB), o FTD fica sempre 0.

**Fix**: Adicionar `ftd` e `cost_per_ftd` ao `result.consolidated`:

```typescript
const totalFtd = mAds?.per_account?.reduce((s, a) => s + (a.ftd || 0), 0) || 0;
const costPerFtd = totalFtd > 0 ? totalInvestment / totalFtd : 0;

result.consolidated = {
  ...existingFields,
  ftd: totalFtd,
  cost_per_ftd: costPerFtd,
};
```

### 2. Log de diagnóstico para confirmar extração

Adicionar um log temporário para confirmar que o `ftdEventName` está sendo lido corretamente e que a API do Meta retorna o action_type correto:

```typescript
console.log(`[fetch-ads-data] FTD config: eventName=${ftdEventName}, googleConv=${ftdGoogleConvName}`);
```

E após a extração Meta:
```typescript
if (ftdEventName) {
  console.log(`[fetch-ads-data] Meta FTD total: ${mAds?.per_account?.reduce((s, a) => s + a.ftd, 0)}`);
}
```

### Arquivos a editar

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/fetch-ads-data/index.ts` | Adicionar `ftd` e `cost_per_ftd` ao `result.consolidated` + logs de diagnóstico |

### Resultado esperado

Após salvar o `ftd_event_name` na configuração do cliente e recarregar o dashboard:
- O KPI "FTD" mostra o total de conversões personalizadas
- O KPI "Custo/FTD" mostra investimento ÷ FTD
- Funciona tanto no caminho live quanto no caminho DB

