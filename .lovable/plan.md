

# Corrigir Acesso OAuth no Google e Meta

## Problema

Quando o fluxo OAuth abre a tela do Google ou Meta, aparece um erro. Isso acontece porque a **URL de redirecionamento** (callback) do app precisa estar cadastrada nos painéis de desenvolvedor do Google e do Meta.

A URL que precisa ser autorizada e:

```text
https://uwvougccbsrnrtnsgert.supabase.co/functions/v1/oauth-callback
```

---

## O que voce precisa fazer (configuracao externa)

### 1. Google Cloud Console (para Google Ads e GA4)

1. Acesse [console.cloud.google.com](https://console.cloud.google.com)
2. Va em **APIs e Servicos > Credenciais**
3. Clique na sua credencial OAuth 2.0
4. Em **URIs de redirecionamento autorizados**, adicione:
   ```
   https://uwvougccbsrnrtnsgert.supabase.co/functions/v1/oauth-callback
   ```
5. Em **Tela de consentimento OAuth**:
   - Se o app esta em modo **Teste**, adicione seu email como usuario de teste
   - OU publique o app para producao
6. Salve as alteracoes

### 2. Meta Developer Console (para Meta Ads)

1. Acesse [developers.facebook.com](https://developers.facebook.com)
2. Va no seu app > **Configuracoes > Basico**
3. Em **Login do Facebook > Configuracoes**:
   - Adicione em **URIs de redirecionamento OAuth validos**:
     ```
     https://uwvougccbsrnrtnsgert.supabase.co/functions/v1/oauth-callback
     ```
4. Certifique-se de que o app esta em modo **Ativo** (nao em desenvolvimento)
5. Salve

---

## O que eu vou fazer no codigo

Apos voce configurar os consoles acima, vou adicionar **logs detalhados** nas funcoes de backend para facilitar a depuracao caso ainda ocorram erros:

1. **oauth-init**: Adicionar log do URL gerado para confirmar que os parametros estao corretos
2. **oauth-callback**: Adicionar logs em cada etapa (recebimento do code, troca de token, salvamento) para identificar onde falha

---

## Secao Tecnica

### Arquivos a modificar
- `supabase/functions/oauth-init/index.ts` - Adicionar console.log para debug
- `supabase/functions/oauth-callback/index.ts` - Adicionar console.log para debug

### Fluxo OAuth atual

```text
App -> oauth-init (gera URL) -> Google/Meta (usuario autoriza) -> oauth-callback (troca code por token) -> salva no banco -> redireciona para o app
```

O erro esta acontecendo no passo do Google/Meta, o que indica que a configuracao das credenciais OAuth (redirect URI ou status do app) precisa ser ajustada nos consoles externos.

