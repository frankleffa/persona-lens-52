

## Plano: Filtrar UTMs do GA4 para mostrar apenas tráfego pago

### Problema
A tabela de UTMs do GA4 mostra todas as fontes de tráfego (orgânico, direto, referral, etc.). O usuário quer ver apenas tráfego pago.

### Alteração

**`supabase/functions/fetch-ads-data/index.ts`** (linhas ~636-650) — Adicionar filtro no momento de popular o `utm_breakdown`, aceitando apenas rows onde o `medium` indica tráfego pago:

Mediums pagos aceitos: `cpc`, `cpm`, `cpv`, `ppc`, `paid`, `paidsocial`, `paid_social`, `display`, `retargeting`, `remarketing`, ou qualquer medium que contenha "paid" ou "cpc".

```typescript
const PAID_MEDIUMS = new Set(["cpc", "cpm", "cpv", "ppc", "paid", "paidsocial", "paid_social", "display", "retargeting", "remarketing"]);

function isPaidMedium(medium: string): boolean {
  const m = (medium || "").toLowerCase().trim();
  if (PAID_MEDIUMS.has(m)) return true;
  if (m.includes("paid") || m.includes("cpc")) return true;
  return false;
}
```

Aplicar o filtro antes do `push`:
```typescript
if (sessions === 0) continue;
const medium = dims[1]?.value || "(not set)";
if (!isPaidMedium(medium)) continue; // ← novo filtro
```

### Resultado
- A tabela de UTMs mostrará apenas sessões vindas de campanhas pagas (Google Ads, Meta Ads, etc.)
- Tráfego orgânico, direto e referral será excluído automaticamente

