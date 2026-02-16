

# Migrar envio de WhatsApp para Evolution API

## Resumo

Substituir a Meta Cloud API pela **Evolution API** como provedor de envio de mensagens WhatsApp. A conexão passa a ser via **QR Code** (sem necessidade de verificação empresarial no Meta Business), mantendo toda a lógica de relatórios, agendamento e alertas de saldo.

## O que muda para o usuário

- Na Central de Conexoes, ao clicar em "Conectar" no WhatsApp, em vez de redirecionar para o OAuth da Meta, o sistema exibe um **QR Code** direto na interface.
- O cliente escaneia com o WhatsApp pessoal ou Business do celular e pronto -- sem verificar numeros, sem token Meta, sem Business Manager.
- O restante (configuracao de relatorios, metricas, agendamento, preview) permanece identico.

## O que e necessario antes de comecar

A Evolution API precisa de uma instancia hospedada (self-hosted ou servico terceiro como evo.ai). Voce precisara fornecer:
1. **URL da instancia** (ex: `https://evo.seudominio.com`)
2. **API Key global** da instancia

Esses valores serao armazenados como secrets do backend.

---

## Plano tecnico

### 1. Adicionar secrets do backend

Solicitar ao usuario dois secrets:
- `EVOLUTION_API_URL` -- URL base da instancia
- `EVOLUTION_API_KEY` -- chave global de acesso

### 2. Alterar tabela `whatsapp_connections`

Migracao SQL para adaptar a tabela ao novo provedor:

```text
ALTER TABLE whatsapp_connections
  ADD COLUMN instance_name TEXT,
  ADD COLUMN instance_id TEXT,
  ADD COLUMN provider TEXT DEFAULT 'evolution';

-- Colunas Meta deixam de ser obrigatorias
ALTER TABLE whatsapp_connections
  ALTER COLUMN business_id DROP NOT NULL,
  ALTER COLUMN waba_id DROP NOT NULL,
  ALTER COLUMN phone_number_id DROP NOT NULL,
  ALTER COLUMN access_token DROP NOT NULL;
```

### 3. Criar Edge Function `evolution-whatsapp` (nova)

Funcao unica que gerencia a instancia Evolution API:

- **POST** `{ action: "create_instance" }` -- Cria uma instancia na Evolution API e retorna o QR Code (base64).
- **POST** `{ action: "check_status" }` -- Verifica se o QR Code ja foi escaneado e a instancia esta conectada.
- **POST** `{ action: "send_message", to, text }` -- Envia mensagem de texto para um numero.
- **POST** `{ action: "disconnect" }` -- Desconecta e remove a instancia.

Fluxo de conexao:
1. Frontend chama `create_instance` -> recebe QR Code base64.
2. Frontend exibe QR Code no modal e faz polling em `check_status` a cada 3s.
3. Quando `status === "open"`, salva em `whatsapp_connections` com `provider = 'evolution'` e fecha o modal.

### 4. Atualizar `cron-whatsapp-reports` (Edge Function existente)

Na secao de envio (passo 11), substituir a chamada a `graph.facebook.com` por uma chamada a instancia Evolution API:

**Antes (Meta Cloud API):**
```text
fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
  headers: { Authorization: `Bearer ${accessToken}` },
  body: { messaging_product: "whatsapp", to, type: "text", text: { body } }
})
```

**Depois (Evolution API):**
```text
fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
  headers: { apikey: EVOLUTION_API_KEY },
  body: { number: to, text: message }
})
```

A funcao busca `instance_name` da tabela `whatsapp_connections` em vez de `phone_number_id` e `access_token`.

### 5. Atualizar `check-balance-alerts` (Edge Function existente)

Mesma alteracao do passo 4 -- substituir envio Meta por Evolution API na secao de envio de alertas de saldo (linhas 121-136).

### 6. Atualizar frontend -- Pagina de Conexoes

Modificar `src/pages/Connections.tsx`:

- **Botao "Conectar" do WhatsApp**: em vez de redirecionar para OAuth, abre um modal com QR Code.
- **Modal QR Code**: Exibe imagem base64, mensagem "Escaneie com seu WhatsApp", indicador de carregamento e polling automatico de status.
- **Botao "Desconectar"**: chama `evolution-whatsapp` com `action: "disconnect"` e limpa a tabela.

### 7. Remover/depreciar Edge Functions da Meta

As funcoes abaixo deixam de ser necessarias para o fluxo WhatsApp (mas podem ser mantidas para nao quebrar outros fluxos OAuth):
- `meta-whatsapp-callback/index.ts` -- pode ser removida
- `confirm-whatsapp-selection/index.ts` -- pode ser removida
- Trecho do `oauth-init` que gera URL para WhatsApp -- pode ser removido

A tabela `whatsapp_pending_connections` tambem pode ser removida ou deixada como legado.

### 8. Resumo dos arquivos afetados

| Arquivo | Acao |
|---|---|
| `supabase/functions/evolution-whatsapp/index.ts` | Criar (nova) |
| `supabase/functions/cron-whatsapp-reports/index.ts` | Editar envio |
| `supabase/functions/check-balance-alerts/index.ts` | Editar envio |
| `src/pages/Connections.tsx` | Editar modal WhatsApp |
| `supabase/functions/meta-whatsapp-callback/index.ts` | Remover |
| `supabase/functions/confirm-whatsapp-selection/index.ts` | Remover |
| Migracao SQL | Alterar `whatsapp_connections` |

