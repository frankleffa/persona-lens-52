
# Plano: Fazer o envio de relatorios WhatsApp funcionar

## Situacao Atual

A Edge Function `cron-whatsapp-reports` ja existe e contem toda a logica necessaria para o envio automatizado. Porem, existem lacunas que impedem o funcionamento real:

### O que ja funciona
- Edge Function `cron-whatsapp-reports` com logica completa (periodo, metricas, formatacao, envio via Meta Cloud API, logs)
- Tabela `whatsapp_report_logs` para rastreamento
- Tabela `whatsapp_report_settings` com configuracoes por cliente
- Tabela `whatsapp_connections` com credenciais da Meta
- UI de configuracao (metricas, frequencia, horario, telefone, periodo)

### O que falta para funcionar

---

## 1. Configurar o Cron Job (pg_cron)

A Edge Function existe mas **nao esta sendo executada automaticamente**. Precisamos criar um cron job no banco de dados para chamar a funcao a cada 5 minutos.

- Habilitar as extensoes `pg_cron` e `pg_net`
- Criar o schedule via SQL (usando a ferramenta de insert, nao migration, pois contem dados especificos do projeto como URL e anon key)

---

## 2. Implementar o botao "Enviar agora"

O botao existe na UI mas exibe apenas um toast de "sera implementado em breve". Precisamos fazer ele realmente disparar o envio:

- No `handleSendNow` do `WhatsAppSendConfig.tsx`:
  - Chamar a Edge Function `cron-whatsapp-reports` passando o `client_id` especifico (ou criar uma edge function dedicada `send-whatsapp-report` para envio individual)
  - Alternativa mais simples: invocar a propria `cron-whatsapp-reports` com um body `{ clientId: "..." }` que forca o envio para aquele cliente, ignorando validacoes de horario

---

## 3. Correcao no campo `report_period_type` do cron

A Edge Function faz `setting.report_period_type` mas o campo precisa estar sendo salvo corretamente. Verificar que o `handleSave` do `WhatsAppSendConfig` inclui `report_period_type` no payload (ja inclui).

---

## Detalhes Tecnicos

### Cron Job SQL
```text
-- Habilitar extensoes
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Agendar execucao a cada 5 minutos
SELECT cron.schedule(
  'whatsapp-reports-cron',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://uwvougccbsrnrtnsgert.supabase.co/functions/v1/cron-whatsapp-reports',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <ANON_KEY>"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

### Envio Manual - Modificacao na Edge Function
Adicionar suporte a body com `clientId` para envio individual:
- Se o request body contem `clientId`, filtrar apenas aquele cliente e pular validacao de horario/dia
- Se nao contem, executar o fluxo normal do cron

### Modificacao no Frontend (`WhatsAppSendConfig.tsx`)
- `handleSendNow`: Chamar `supabase.functions.invoke("cron-whatsapp-reports", { body: { clientId } })`
- Mostrar loading state durante o envio
- Exibir toast de sucesso/erro com base na resposta

### Sequencia de implementacao
1. Criar cron job via SQL (insert tool)
2. Atualizar Edge Function para aceitar `clientId` no body
3. Implementar `handleSendNow` real no frontend
