

## Plano: Padronizar fonte Geist em todo o app

### Problema
O componente `CampaignCard.tsx` usa fontes `Syne` e `DM Mono` em vez de Geist/Geist Mono, quebrando a consistência tipográfica.

### Mudanças

**`src/components/CampaignCard.tsx`** — 8 substituições:
- Linhas 135, 147, 165: `'Syne, sans-serif'` → `'var(--font-sans)'`
- Linhas 186, 198, 208, 218: `'DM Mono, monospace'` → `'var(--font-mono)'`

Nenhum outro arquivo precisa de alteração — o resto do app já usa as variáveis CSS `--font-sans` (Geist) e `--font-mono` (Geist Mono).

