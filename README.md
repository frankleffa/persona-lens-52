# AdScape — Dashboard de Ads Profissional

Apresente resultados de tráfego pago (Google Ads, Meta Ads e GA4) em um dashboard
visual e profissional, com relatórios, automações de WhatsApp e análises com IA.

## Stack

- **Vite** + **React 18** + **TypeScript**
- **Tailwind CSS** + **shadcn/ui** (Radix)
- **TanStack Query** (data fetching/cache)
- **React Router** (SPA)
- **Supabase** (auth, banco, Edge Functions)

## Rodando localmente

Requisitos: Node.js 18+ e npm.

```sh
# 1. Instale as dependências
npm install

# 2. Configure as variáveis de ambiente
cp .env.example .env
# edite o .env com suas chaves

# 3. Suba o servidor de desenvolvimento
npm run dev
```

Outros scripts:

```sh
npm run build      # build de produção (gera ./dist)
npm run preview    # serve o build localmente
npm run lint       # ESLint
npm run test       # Vitest
```

## Variáveis de ambiente

Veja `.env.example`. Variáveis com prefixo `VITE_` são embarcadas no bundle do
cliente — use apenas chaves públicas (ex.: anon key do Supabase).

| Variável | Descrição |
| --- | --- |
| `VITE_SUPABASE_URL` | URL do projeto Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Anon key (pública) do Supabase |
| `VITE_SUPABASE_PROJECT_ID` | ID do projeto Supabase |
| `VITE_EVOLUTION_API_URL` | URL da Evolution API (WhatsApp) — use HTTPS |
| `VITE_EVOLUTION_API_KEY` | Chave da Evolution API |

## Deploy no Vercel

O projeto já vem com `vercel.json` configurado (framework Vite, output `dist` e
rewrites de SPA para o React Router funcionar em rotas profundas).

1. Importe o repositório em [vercel.com/new](https://vercel.com/new).
2. O Vercel detecta o framework Vite automaticamente (build: `npm run build`,
   output: `dist`).
3. Em **Settings → Environment Variables**, adicione as variáveis listadas acima.
4. Faça o deploy.

> Pelo CLI: `npm i -g vercel && vercel` (preview) ou `vercel --prod` (produção).

## Supabase

As Edge Functions ficam em `supabase/functions/` e as migrações em
`supabase/migrations/`. Para fazer deploy delas use a
[CLI do Supabase](https://supabase.com/docs/guides/cli).
