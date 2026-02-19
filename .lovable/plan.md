
# Diagnóstico: "Cadastro" vs "Concluir Inscrição" no Meta Ads

## O que foi verificado

O `previsao.io` usa o evento **"Concluir inscrição"** no Meta (que na API do Facebook é o `action_type = "offsite_conversion.fb_pixel_complete_registration"`). Esse evento deve ser mapeado como "Cadastro" no dashboard.

---

## Inconsistência 1 — `fetch-ads-data`: usa `.find()` em vez de `.filter()` — pega só UM evento de cadastro

**Localização:** `fetch-ads-data/index.ts`, linhas 170-176

O código atual para cadastros (nível de conta) é:

```ts
const leadAction = d.actions?.find((a) => 
  a.action_type === "lead" || 
  a.action_type === "offsite_conversion.fb_pixel_lead" ||
  a.action_type === "offsite_conversion.fb_pixel_complete_registration" ||
  a.action_type === "complete_registration"
);
if (leadAction) result.registrations += parseInt(leadAction.value || "0");
```

**Problema:** `.find()` retorna o **primeiro** `action_type` que bater. Se a conta tiver tanto `lead` quanto `offsite_conversion.fb_pixel_complete_registration` nas actions, apenas o **primeiro** será contado. Para o `previsao.io` que usa "Concluir Inscrição", o `offsite_conversion.fb_pixel_complete_registration` provavelmente aparece depois de `lead` na lista — sendo ignorado.

**O mesmo problema ocorre em:**
- Linhas 232-238 (campanhas, nível de campanha)
- Linhas 606-612 (conversões por hora)
- Linhas 651-655 (conversões por GEO)

---

## Inconsistência 2 — `backfill-metrics`: NÃO inclui `fb_pixel_complete_registration` — ignora "Concluir Inscrição" completamente

**Localização:** `backfill-metrics/index.ts`, linhas 233-236

```ts
// fetch-ads-data INCLUI complete_registration:
a.action_type === "offsite_conversion.fb_pixel_complete_registration" ||
a.action_type === "complete_registration"

// backfill-metrics NÃO INCLUI — apenas:
const leadAction = d.actions?.find((a) =>
  a.action_type === "lead" || 
  a.action_type === "offsite_conversion.fb_pixel_lead"
  // ← FALTAM os dois tipos de complete_registration
);
```

Isso significa que o histórico importado via "Importar Histórico" **nunca contou os cadastros via "Concluir Inscrição"** — os dados históricos estão zerados para esse evento.

O mesmo problema existe nas campanhas do backfill (linhas 267-268), que também não incluem `fb_pixel_complete_registration`.

---

## Inconsistência 3 — `fetch-ads-data`: prioridade errada ao escolher o evento de cadastro

No código atual, a ordem de prioridade é:
1. `lead` (evento de geração de lead do próprio Facebook)
2. `offsite_conversion.fb_pixel_lead` (pixel de lead)
3. `offsite_conversion.fb_pixel_complete_registration` (pixel de cadastro/inscrição)
4. `complete_registration`

Para clientes que usam **"Concluir Inscrição"** como conversão principal (como o `previsao.io`), o evento correto está em 3º lugar na fila — e como `.find()` retorna o primeiro match, se existir qualquer evento `lead` com valor, o `complete_registration` é ignorado.

**Correção:** usar `.filter()` + soma de todos os eventos relevantes, ou priorizar o evento com maior valor.

---

## Resumo dos problemas encontrados

| Problema | Localização | Impacto |
|----------|-------------|---------|
| `.find()` pega só o primeiro evento — ignora `complete_registration` se `lead` existe | `fetch-ads-data` linhas 170-176, 232-238, 606-612, 651-655 | Cadastros subcontados quando há múltiplos action_types |
| `backfill-metrics` não inclui `fb_pixel_complete_registration` | `backfill-metrics` linhas 233-236, 267-268 | Histórico de cadastros zerado para quem usa "Concluir Inscrição" |
| Prioridade errada na ordem dos action_types | Ambos os arquivos | `complete_registration` nunca "ganha" se `lead` existir |

---

## Correções a implementar

### Arquivo 1: `supabase/functions/fetch-ads-data/index.ts`

**4 locais** — trocar `.find()` por `.filter()` com soma de todos os eventos de cadastro:

```ts
// ANTES (pega apenas o primeiro match):
const leadAction = d.actions?.find((a) => 
  a.action_type === "lead" || 
  a.action_type === "offsite_conversion.fb_pixel_lead" ||
  a.action_type === "offsite_conversion.fb_pixel_complete_registration" ||
  a.action_type === "complete_registration"
);
if (leadAction) result.registrations += parseInt(leadAction.value || "0");

// DEPOIS (soma todos os tipos de cadastro encontrados):
const registrationActions = d.actions?.filter((a) => 
  a.action_type === "offsite_conversion.fb_pixel_complete_registration" ||
  a.action_type === "complete_registration" ||
  a.action_type === "lead" || 
  a.action_type === "offsite_conversion.fb_pixel_lead"
) || [];
const regTotal = registrationActions.reduce((sum, a) => sum + parseInt(a.value || "0"), 0);
if (regTotal > 0) result.registrations += regTotal;
```

**Importante:** Usar `reduce()` em vez de `find()` garante que **todos** os eventos de cadastro são somados — seja `complete_registration`, `lead`, ou ambos.

### Arquivo 2: `supabase/functions/backfill-metrics/index.ts`

**2 locais** — adicionar os tipos faltantes:

```ts
// Nível de conta (linha 233):
const registrationActions = d.actions?.filter((a) =>
  a.action_type === "offsite_conversion.fb_pixel_complete_registration" ||
  a.action_type === "complete_registration" ||
  a.action_type === "lead" ||
  a.action_type === "offsite_conversion.fb_pixel_lead"
) || [];
const conversions = registrationActions.reduce((sum, a) => sum + parseInt(a.value || "0"), 0);

// Nível de campanha (linha 267):
const registrationActs = actions.filter((a) =>
  a.action_type === "offsite_conversion.fb_pixel_complete_registration" ||
  a.action_type === "complete_registration" ||
  a.action_type === "lead" ||
  a.action_type === "offsite_conversion.fb_pixel_lead"
);
const leads = registrationActs.reduce((sum, a) => sum + parseInt(a.value || "0"), 0);
```

---

## Arquivos modificados

| Arquivo | Mudanças |
|---------|---------|
| `supabase/functions/fetch-ads-data/index.ts` | 4 blocos: `.find()` → `.filter()` + `reduce()` para cadastros |
| `supabase/functions/backfill-metrics/index.ts` | 2 blocos: adicionar `fb_pixel_complete_registration` e usar `reduce()` |

**Após a correção:** Reimportar histórico clicando em "Importar Histórico" para repopular os dados históricos com os cadastros corretos.
