

# Cada cliente conecta seu proprio WhatsApp

## Situacao Atual

Hoje a conexao WhatsApp eh feita no nivel de **agencia/gestor**. Uma unica instancia da Evolution API serve para enviar relatorios a todos os clientes. O modelo atual usa a coluna `agency_id` na tabela `whatsapp_connections`.

## O que muda

Cada cliente tera sua propria instancia WhatsApp (com QR Code proprio). O gestor continua gerenciando, mas cada cliente pode ter uma conexao independente.

## Plano de Implementacao

### 1. Alterar a tabela `whatsapp_connections`

Adicionar coluna `client_id` (nullable, referenciando `client_manager_links.client_user_id`) para identificar a qual cliente a conexao pertence. Quando `client_id` eh null, a conexao eh da agencia (compatibilidade retroativa).

```sql
ALTER TABLE whatsapp_connections ADD COLUMN client_id uuid REFERENCES auth.users(id);
-- Permitir multiplas conexoes por agencia (uma por cliente)
DROP INDEX IF EXISTS whatsapp_connections_agency_id_key;
CREATE UNIQUE INDEX whatsapp_connections_agency_client 
  ON whatsapp_connections(agency_id, COALESCE(client_id, '00000000-0000-0000-0000-000000000000'));
```

### 2. Atualizar a Edge Function `evolution-whatsapp`

- Aceitar parametro opcional `client_id` em todas as acoes
- No `create-instance`, gerar nome da instancia com base no client_id (ex: `adscape_{clientId_prefix}`)
- No `check-status` e `send-message`, filtrar por `client_id` quando fornecido
- Manter retrocompatibilidade: se `client_id` nao for enviado, usa a conexao de agencia

### 3. Atualizar a pagina de Conexoes (`Connections.tsx`)

- Na secao WhatsApp, mostrar apenas a conexao da agencia (para envio de relatorios pelo gestor)
- OU remover a conexao de agencia e deixar apenas por cliente

### 4. Adicionar botao de conexao WhatsApp por cliente no Agency Control

Na pagina `/agency` (AgencyControl.tsx), dentro de cada card de cliente:
- Adicionar um botao "Conectar WhatsApp" que abre o modal de QR Code
- Mostrar status de conexao WhatsApp (conectado/desconectado) no card
- Permitir desconectar individualmente

### 5. Atualizar `cron-whatsapp-reports` e `check-balance-alerts`

Quando for enviar mensagem para um cliente, buscar a conexao WhatsApp especifica daquele cliente (por `client_id`). Se nao existir, usar a conexao da agencia como fallback.

## Fluxo do Usuario

```text
Gestor acessa /agency
  -> Ve lista de clientes
  -> Cada cliente tem botao "WhatsApp" 
  -> Clica no botao -> Modal com QR Code aparece
  -> Cliente escaneia com seu celular
  -> Status muda para "Conectado"
  -> Relatorios automaticos usam o WhatsApp do proprio cliente
```

## Secao Tecnica

### Arquivos a criar/modificar:

| Arquivo | Acao |
|---------|------|
| `supabase/migrations/` | Nova migration adicionando `client_id` |
| `supabase/functions/evolution-whatsapp/index.ts` | Aceitar `client_id`, gerar instancias por cliente |
| `src/pages/AgencyControl.tsx` | Adicionar botao + modal QR Code por cliente |
| `supabase/functions/cron-whatsapp-reports/index.ts` | Buscar conexao do cliente antes de enviar |
| `supabase/functions/check-balance-alerts/index.ts` | Buscar conexao do cliente antes de enviar |

### Logica de instance_name

Cada instancia sera nomeada assim:
- Agencia: `adscape_{agencyId_prefix}`  
- Cliente: `adscape_c_{clientId_prefix}`

Isso evita conflitos e facilita a identificacao no painel da Evolution API.
