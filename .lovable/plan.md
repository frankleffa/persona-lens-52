

## Plano: Exibir fuso horário da conta Meta no dashboard

### Contexto
A API do Meta Ads retorna o campo `timezone_name` ao consultar dados da ad account (ex: `America/Sao_Paulo`, `America/New_York`). Hoje o sistema não captura nem exibe essa informação.

### Mudanças

**1. `supabase/functions/fetch-ads-data/index.ts`**
- Na função `fetchMetaAdsData`, para cada `accountId`, fazer uma chamada adicional (ou incluir no existente) ao endpoint `GET /{accountId}?fields=timezone_name` para obter o fuso da conta
- Retornar `timezone_name` no objeto `per_account` e no resultado geral de `meta_ads`

**2. Tabela `manager_meta_ad_accounts`** (migração)
- Adicionar coluna `timezone_name text` (nullable) para persistir o fuso de cada conta

**3. `supabase/functions/oauth-callback/index.ts`**
- Ao listar ad accounts no OAuth, incluir `timezone_name` nos fields da chamada `me/adaccounts?fields=id,name,account_status,timezone_name`
- Salvar `timezone_name` no upsert de `manager_meta_ad_accounts`

**4. `src/hooks/useAdsData.tsx`**
- Expor `meta_timezones` (mapa account_id → timezone) no retorno do hook, vindo do response da edge function

**5. `src/components/ClientDashboard.tsx`**
- No header ou na seção Meta Ads, exibir um badge/alerta quando o fuso da conta Meta for diferente do fuso local do navegador (ex: "⚠️ Conta Meta em fuso America/New_York — dados podem divergir do horário local")

**6. `src/components/ClientAccountConfig.tsx`**
- Exibir o fuso horário ao lado de cada conta Meta na lista de seleção

### Resultado
O gestor saberá imediatamente quando uma conta Meta opera em fuso diferente, explicando possíveis divergências nos dados diários.

