

# Migração WhatsApp: Meta Cloud API para Evolution API

## Resumo

Substituir todo o fluxo de conexão e envio de mensagens do WhatsApp, saindo da Meta Cloud API (que exige verificação empresarial) para a Evolution API (conexão via QR Code). Cada gestor/agência conecta seu WhatsApp uma vez e envia relatórios a todos os seus clientes.

## Etapas

### 1. Configurar Secrets

Adicionar dois secrets no backend:
- **EVOLUTION_API_URL** -- URL base da sua instancia Evolution API
- **EVOLUTION_API_KEY** -- API Key global da Evolution API

### 2. Atualizar Banco de Dados

Migrar a tabela `whatsapp_connections` para suportar o novo provedor:
- Adicionar colunas: `instance_name` (text), `instance_id` (text), `provider` (text, default 'evolution')
- Tornar colunas Meta opcionais (nullable): `business_id`, `waba_id`, `phone_number_id`, `access_token`
- Remover tabela `whatsapp_pending_connections` (nao sera mais necessaria)

### 3. Criar Edge Function: `evolution-whatsapp`

Nova funcao backend com 3 acoes:

- **create-instance**: Cria uma instancia na Evolution API para o gestor, retorna o nome da instancia
- **get-qrcode**: Busca o QR Code da instancia para o gestor escanear no celular
- **check-status**: Verifica se a instancia ja esta conectada (polling do frontend)

Fluxo:
```text
Gestor clica "Conectar"
        |
        v
Backend cria instancia na Evolution API
        |
        v
Frontend exibe QR Code em um modal
        |
        v
Gestor escaneia com WhatsApp
        |
        v
Frontend faz polling do status ate conectar
        |
        v
Backend salva instance_name e instance_id na tabela
```

### 4. Atualizar Envio de Mensagens

**cron-whatsapp-reports** (relatorios automaticos):
- Em vez de chamar `graph.facebook.com`, enviar via Evolution API:
  `POST {EVOLUTION_API_URL}/message/sendText/{instance_name}`
- Usar header `apikey: {EVOLUTION_API_KEY}`

**check-balance-alerts** (alertas de saldo baixo):
- Mesma mudanca: substituir chamada da Graph API pela Evolution API
- Manter toda a logica de threshold e cooldown

### 5. Atualizar Frontend (Central de Conexoes)

Substituir o fluxo OAuth do WhatsApp por:
- Modal com QR Code gerado dinamicamente
- Polling automatico do status de conexao
- Feedback visual (escaneando, conectado, erro)
- Remover toda referencia a `whatsapp_pending_connections` e selecao de numero

### 6. Limpeza

- Deletar edge function `meta-whatsapp-callback` (callback OAuth da Meta)
- Deletar edge function `confirm-whatsapp-selection` (selecao de numero Meta)
- Remover config.toml entries dessas funcoes

---

## Detalhes Tecnicos

### Estrutura da tabela `whatsapp_connections` (apos migracao)

| Coluna | Tipo | Nullable | Descricao |
|---|---|---|---|
| id | uuid | NAO | PK |
| agency_id | uuid | NAO | FK para o gestor |
| provider | text | NAO | 'evolution' (default) |
| instance_name | text | SIM | Nome da instancia Evolution |
| instance_id | text | SIM | ID da instancia Evolution |
| business_id | text | SIM | Legacy Meta |
| waba_id | text | SIM | Legacy Meta |
| phone_number_id | text | SIM | Legacy Meta |
| access_token | text | SIM | Legacy Meta |
| status | text | NAO | 'connected' / 'disconnected' |
| connected_at | timestamptz | NAO | Data de conexao |
| updated_at | timestamptz | NAO | Ultima atualizacao |

### Endpoints Evolution API utilizados

- `POST /instance/create` -- Criar instancia
- `GET /instance/connect/{instance}` -- Obter QR Code
- `GET /instance/connectionState/{instance}` -- Verificar status
- `POST /message/sendText/{instance}` -- Enviar mensagem texto

### Formato de envio de mensagem (Evolution API)

```text
POST {EVOLUTION_API_URL}/message/sendText/{instance_name}
Headers: { "apikey": "{EVOLUTION_API_KEY}" }
Body: { "number": "5511999999999", "text": "mensagem aqui" }
```

