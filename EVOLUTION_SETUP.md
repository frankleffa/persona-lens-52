# Configuração da Evolution API no Supabase

## Credenciais da Evolution API
- **URL**: http://187.77.45.58:57317
- **API Key**: w0QOijagErFGDo8J9ii4ZimtMripREWD

## Passos para Configurar

### 1. Acessar o Dashboard do Supabase
1. Acesse: https://supabase.com/dashboard
2. Entre no projeto: **uwvougccbsrnrtnsgert**

### 2. Configurar Secrets (Variáveis de Ambiente)
1. No menu lateral, vá em **Edge Functions**
2. Clique em **Manage secrets** ou **Settings**
3. Adicione os seguintes secrets:

```
EVOLUTION_API_URL = http://187.77.45.58:57317
EVOLUTION_API_KEY = w0QOijagErFGDo8J9ii4ZimtMripREWD
```

### 3. Deploy da Função Atualizada
Como o npx está com problemas de permissão, você tem duas opções:

#### Opção A: Via Dashboard (Recomendado)
1. Acesse **Edge Functions** > **evolution-whatsapp**
2. Cole o código atualizado de `supabase/functions/evolution-whatsapp/index.ts`
3. Clique em **Deploy**

#### Opção B: Via PowerShell (se resolver permissões)
```powershell
# Habilitar scripts (executar como Administrador)
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned

# Deploy
npx supabase functions deploy evolution-whatsapp --project-ref uwvougccbsrnrtnsgert
```

### 4. Testar a Integração
1. Acesse: http://localhost:8080/conexoes
2. Conecte um WhatsApp via QR Code
3. Depois acesse: http://localhost:8080/whatsapp-demo
4. Teste o envio de mensagens

## Troubleshooting

### Erro de CORS
Se aparecer erro de CORS ao testar, verifique se os headers estão corretos na Edge Function.

### Instância não encontrada
Certifique-se de ter conectado um WhatsApp em **/conexoes** antes de tentar enviar mensagens.

### Timeout na Evolution API
Verifique se o IP `187.77.45.58:57317` está acessível e se o firewall permite conexões.
