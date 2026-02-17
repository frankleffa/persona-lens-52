# Configuração da Evolution API no Lovable Cloud

## ⚠️ Importante
O Lovable gerencia o Supabase automaticamente. Para adicionar as credenciais da Evolution API, você precisa fazer via interface do Lovable.

## Credenciais da Evolution API
- **URL**: http://187.77.45.58:57317
- **API Key**: w0QOijagErFGDo8J9ii4ZimtMripREWD

## Passos para Configurar no Lovable

### 1. Acessar o Projeto no Lovable
1. Acesse: https://lovable.dev
2. Entre no projeto **persona-lens-52**

### 2. Adicionar Secrets/Environment Variables
No Lovable, você pode configurar secrets de duas formas:

#### Opção A: Via Chat do Lovable (Recomendado)
Cole esta mensagem no chat do Lovable:

```
Preciso configurar as seguintes variáveis de ambiente para a Edge Function evolution-whatsapp:

EVOLUTION_API_URL=http://187.77.45.58:57317
EVOLUTION_API_KEY=w0QOijagErFGDo8J9ii4ZimtMripREWD

Por favor, adicione esses secrets ao projeto.
```

#### Opção B: Via Configurações do Projeto
1. No Lovable, vá em **Settings** ou **Integrations**
2. Procure por **Supabase Settings** ou **Environment Variables**
3. Adicione os secrets:
   - `EVOLUTION_API_URL` = `http://187.77.45.58:57317`
   - `EVOLUTION_API_KEY` = `w0QOijagErFGDo8J9ii4ZimtMripREWD`

### 3. Deploy Automático
O Lovable faz deploy automático quando você:
1. Faz push para o GitHub (já fizemos isso ✅)
2. Ou usa o comando no chat: "Deploy the latest changes"

### 4. Testar a Integração

#### Conectar WhatsApp:
1. Acesse: https://seu-app.lovable.app/conexoes
2. Clique em **Conectar** no card do WhatsApp
3. Escaneie o QR Code com seu WhatsApp

#### Testar Envio:
1. Acesse: https://seu-app.lovable.app/whatsapp-demo
2. Digite um número (formato: 5511999999999)
3. Clique em **Enviar Mensagem**

## 🔧 Troubleshooting

### "No connected WhatsApp instance found"
- Certifique-se de ter conectado um WhatsApp em **/conexoes** primeiro

### "Evolution API URL not configured"
- Verifique se os secrets foram adicionados corretamente no Lovable
- Aguarde alguns minutos após adicionar os secrets (o Lovable precisa fazer redeploy)

### Erro de CORS
- Isso é normal em desenvolvimento local
- Teste no ambiente de produção do Lovable (https://seu-app.lovable.app)

## 📝 Notas Importantes

1. **Desenvolvimento Local vs Produção**:
   - Local (localhost:8080): Usa as variáveis do `.env`
   - Produção (Lovable): Usa os secrets configurados no Lovable

2. **Segurança**:
   - Nunca commite o `.env` com credenciais reais
   - O `.gitignore` já está configurado para ignorar o `.env`

3. **Próximos Passos**:
   - Após configurar os secrets no Lovable, peça para fazer deploy
   - Teste primeiro em produção (Lovable) antes de testar localmente
