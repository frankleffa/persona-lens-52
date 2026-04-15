

## Plano: Alinhar busca de eventos GA4 com o tracking real do cliente (Previsão WL)

### Problema

A edge function `fetch-ads-data` busca eventos genéricos (`purchase`, `generate_lead`, `sign_up`, `begin_checkout`, `add_to_cart`) que não correspondem aos eventos reais do GTM deste cliente. O GTM envia para o GA4 os eventos: `sign_up`, `initiate_checkout`, `purchase` e `first_deposit`. Os eventos `initiate_checkout` e `first_deposit` não estão na lista de busca do sistema, e por isso não aparecem no breakdown.

### Alterações

**1. `supabase/functions/fetch-ads-data/index.ts`** — Atualizar a lista de eventos buscados no event breakdown:

- Lista atual (hardcoded): `["purchase", "generate_lead", "sign_up", "begin_checkout", "add_to_cart"]`
- Nova lista: incluir `first_deposit`, `initiate_checkout`, `deposit_confirmed`, `ftd`, `signup_confirmed` além dos existentes
- Idealmente, tornar essa lista dinâmica, lendo da configuração do cliente (`client_config`) se existir um campo de eventos customizados

**2. `src/components/utm/UTMAnalyticsPanel.tsx`** — Atualizar o `EVENT_NAME_MAP` para traduzir os novos eventos:

```
sign_up → Cadastro
initiate_checkout → Início de Depósito
purchase → Depósito Confirmado
first_deposit → FTD (Primeiro Depósito)
```

**3. Considerar buscar eventos por `eventCount` em vez de `keyEvents`** — Isso captura TODOS os disparos, mesmo que o evento não esteja marcado como "key event" no GA4. A query já existe mas pode não estar sendo usada como fallback principal.

**4. Adicionar campo `custom_ga4_events` na tabela `client_config`** (opcional/futuro) — Para que cada cliente possa definir quais eventos do GA4 são relevantes para ele, em vez de depender de uma lista genérica.

### Resultado
- O breakdown mostrará os 4 eventos reais: Cadastro, Início de Depósito, Depósito Confirmado e FTD
- O número de conversões no GA4 vai bater com a soma desses eventos
- A discrepância com o Meta ficará explicada (Meta conta Purchase = deposit_confirmed + ftd juntos)

