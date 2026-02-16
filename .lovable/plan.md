

# Sistema de Alerta de Saldo Baixo via WhatsApp

## Problema
O gestor nao tem como ser avisado automaticamente quando o saldo de uma conta de anuncio esta baixo, podendo perder campanhas por falta de credito.

## Solucao
Criar um sistema desacoplado com: tabela de configuracao de alertas, UI para definir limite por conta, e Edge Function que consulta o saldo via Meta Ads API e dispara alerta via WhatsApp.

## Mudancas

### 1. Banco de Dados
Criar tabela `account_balance_alerts` com:
- `id`, `agency_id`, `client_id`, `ad_account_id` (text), `threshold_value` (numeric), `is_active` (boolean, default true), `last_triggered_at` (timestamp nullable), `created_at`
- Indices em `agency_id`, `client_id`, `ad_account_id`
- Constraint unique em `(agency_id, ad_account_id)` para permitir upsert
- RLS: managers podem gerenciar alertas da propria agencia

### 2. Frontend - Componente `BalanceAlertConfig`
Novo componente renderizado dentro da area expandida do cliente em `AgencyControl.tsx`, abaixo do `WhatsAppReportConfig`.

- Titulo: "Alerta de saldo minimo"
- Descricao: "Receba aviso quando o saldo da conta estiver abaixo do limite definido."
- Lista as contas Meta vinculadas ao cliente (obtidas de `client_meta_ad_accounts`)
- Para cada conta: input numerico (R$) para threshold + toggle ativar/desativar
- Botao "Salvar alerta" faz upsert na tabela `account_balance_alerts`
- Carrega configuracao existente ao abrir

### 3. Edge Function `check-balance-alerts`
- Busca todos os alertas ativos em `account_balance_alerts`
- Para cada alerta, consulta o saldo da conta via Meta Ads API (`/act_{id}?fields=balance,amount_spent`)
- Se saldo <= threshold E (`last_triggered_at` e null OU mais de 24h atras):
  - Envia mensagem WhatsApp via `whatsapp_connections` existente
  - Atualiza `last_triggered_at`
- Formato da mensagem:
  ```
  Alerta Adscape - Saldo Baixo
  Conta: {ad_account_id}
  Saldo atual: R$ {saldo}
  Limite configurado: R$ {threshold}
  Acao necessaria para manter campanhas ativas.
  ```

### 4. Registro no `config.toml`
Adicionar entrada `[functions.check-balance-alerts]` com `verify_jwt = false`

## Detalhes Tecnicos

### Estrutura de arquivos
- `src/components/BalanceAlertConfig.tsx` - componente de UI
- `supabase/functions/check-balance-alerts/index.ts` - edge function
- Migracao SQL para criar a tabela

### Fluxo de dados

```text
AgencyControl (expand client)
  -> BalanceAlertConfig
    -> Carrega alertas existentes (SELECT account_balance_alerts)
    -> Carrega contas Meta do cliente (SELECT client_meta_ad_accounts)
    -> Salva config (UPSERT account_balance_alerts)

check-balance-alerts (cron ou manual)
  -> SELECT alertas ativos
  -> Para cada: GET Meta API balance
  -> Se saldo <= threshold: envia WhatsApp + UPDATE last_triggered_at
```

### Obtenção do saldo Meta
A API do Meta retorna o campo `balance` no endpoint `/act_{account_id}?fields=balance,amount_spent`. O access_token sera obtido da tabela `oauth_connections` do manager vinculado ao client.

### Cooldown de 24h
Para evitar spam, o alerta so dispara novamente se `last_triggered_at` for null ou tiver mais de 24 horas.

### Compatibilidade
- Nenhuma tabela existente sera alterada
- Nenhuma funcionalidade existente sera modificada
- O componente e adicionado ao lado do WhatsAppReportConfig ja existente

