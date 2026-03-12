# Guia de Configuração e Aprovação — Google OAuth

Este guia detalha os passos para configurar o app no Google Cloud Console e submeter para verificação, necessária para uso em produção com o escopo `https://www.googleapis.com/auth/adwords` e `https://www.googleapis.com/auth/analytics.readonly`.

---

## 1. Pré-requisitos

- Conta Google com acesso ao [Google Cloud Console](https://console.cloud.google.com)
- Domínio próprio (ex: `personalens.com.br`) **verificado** no Google Search Console
- Política de Privacidade publicada em URL pública (ex: `https://personalens.com.br/politica-de-privacidade`)
- Termos de Uso publicados (ex: `https://personalens.com.br/termos-de-uso`)

---

## 2. Criar Projeto no Google Cloud Console

1. Acesse [console.cloud.google.com](https://console.cloud.google.com)
2. Clique em **"Selecionar projeto"** → **"Novo Projeto"**
3. Nome sugerido: `Persona Lens`
4. Organização: deixe vazio se não tiver uma organização Google Workspace

---

## 3. Ativar as APIs necessárias

Em **APIs e Serviços → Biblioteca**, ative:

| API | Finalidade |
|-----|-----------|
| **Google Ads API** | Buscar métricas de campanhas (impressões, cliques, conversões, investimento) |
| **Google Analytics Data API** | Buscar dados do GA4 |
| **Google Analytics Admin API** | Listar propriedades GA4 disponíveis |

---

## 4. Configurar a Tela de Consentimento OAuth

Vá em **APIs e Serviços → Tela de consentimento OAuth**.

### Tipo de usuário
- Selecione **"Externo"** (para usuários fora da sua organização Google Workspace)

### Informações do App
| Campo | Valor |
|-------|-------|
| Nome do aplicativo | `Persona Lens` |
| E-mail de suporte | `contato@personalens.com.br` |
| Logotipo | Upload do logo do Persona Lens |
| Página inicial do aplicativo | `https://personalens.com.br/landing` |
| Política de privacidade | `https://personalens.com.br/politica-de-privacidade` |
| Termos de serviço | `https://personalens.com.br/termos-de-uso` |

### Domínios autorizados
Adicione: `personalens.com.br`

### Escopos solicitados

Clique em **"Adicionar ou remover escopos"** e adicione:

| Escopo | Motivo |
|--------|--------|
| `https://www.googleapis.com/auth/adwords` | Leitura de métricas de campanhas do Google Ads (impressões, cliques, conversões, investimento) para exibição no dashboard |
| `https://www.googleapis.com/auth/analytics.readonly` | Leitura somente de dados do Google Analytics 4 para exibição no dashboard |

> **Atenção:** Esses são escopos **sensíveis/restritos** que exigem verificação do app.

---

## 5. Criar Credenciais OAuth 2.0

Em **APIs e Serviços → Credenciais** → **"Criar credenciais"** → **"ID do cliente OAuth 2.0"**:

| Campo | Valor |
|-------|-------|
| Tipo de aplicativo | **Aplicativo da Web** |
| Nome | `Persona Lens Web` |
| URIs de redirecionamento autorizados | `https://SEU_PROJECT_ID.supabase.co/functions/v1/oauth-callback` |

Após criar, salve o **Client ID** e o **Client Secret**. Configure no Supabase Edge Functions:

```bash
supabase secrets set GOOGLE_CLIENT_ID="seu-client-id"
supabase secrets set GOOGLE_CLIENT_SECRET="seu-client-secret"
```

---

## 6. Fase de Testes (antes da verificação)

Enquanto o app está em modo **Teste**:
- Adicione e-mails de teste em **"Usuários de teste"** (máximo 100)
- Esses usuários conseguem autorizar o app normalmente
- Usuários fora dessa lista verão aviso de "app não verificado"

Use essa fase para preparar os materiais da verificação.

---

## 7. Submeter para Verificação do Google

### Materiais necessários para a submissão

#### a) Vídeo demonstrativo (obrigatório)
Grave um vídeo de **2–5 minutos** mostrando:
1. Login na plataforma Persona Lens
2. Clique em "Conectar Google Ads"
3. Tela de consentimento OAuth com os escopos
4. Dashboard exibindo métricas reais do Google Ads
5. Clique em "Conectar GA4"
6. Dashboard exibindo métricas do GA4

**Formato:** MP4, disponível publicamente (pode ser link do YouTube não listado)

#### b) Justificativa dos escopos
Para cada escopo, prepare uma explicação curta (em inglês, pois o Google analisa em inglês):

**`https://www.googleapis.com/auth/adwords`**
> "Persona Lens is a SaaS dashboard platform for digital marketing agencies. We request read access to Google Ads data to display campaign metrics (impressions, clicks, conversions, spend) in real-time dashboards shared with agency clients. The data is never sold or shared with third parties and is used exclusively for dashboard visualization."

**`https://www.googleapis.com/auth/analytics.readonly`**
> "We request read-only access to Google Analytics 4 data to display website traffic and conversion metrics alongside Google Ads data in unified client dashboards. Access is granted per user and can be revoked at any time from Google Account settings."

#### c) URL da Política de Privacidade
`https://personalens.com.br/politica-de-privacidade`

#### d) Domínio verificado
O domínio `personalens.com.br` deve estar verificado no Google Search Console antes da submissão.

### Como submeter
1. Na Tela de Consentimento OAuth, clique em **"Enviar para verificação"**
2. Preencha o formulário com os materiais acima
3. Aguarde: processo leva de **4 a 6 semanas** em média

---

## 8. Checklist antes de submeter

- [ ] Domínio `personalens.com.br` verificado no Google Search Console
- [ ] Política de Privacidade acessível publicamente
- [ ] Termos de Uso acessíveis publicamente
- [ ] Logo do app enviado na tela de consentimento
- [ ] Vídeo demonstrativo gravado e disponível por link
- [ ] Justificativa dos escopos escrita em inglês
- [ ] Testado com usuários de teste (pelo menos 5 usuários reais)
- [ ] URIs de redirecionamento configurados corretamente
- [ ] `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` configurados no Supabase

---

## 9. Após a aprovação

- O app sai do modo "Não verificado"
- Qualquer usuário com conta Google pode autorizar o acesso
- O limite de 100 usuários de teste é removido
- Monitore o [Google API Console](https://console.cloud.google.com/apis/dashboard) para quotas de uso da API
