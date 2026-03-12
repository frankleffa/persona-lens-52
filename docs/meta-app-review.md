# Guia de Configuração e Aprovação — Meta App Review

Este guia detalha os passos para criar o app no Meta for Developers e submetê-lo para revisão, necessária para uso em produção com os escopos `ads_read`, `ads_management` e `business_management`.

---

## 1. Pré-requisitos

- Conta pessoal no Facebook com acesso a um **Meta Business Manager**
- Domínio próprio verificado (ex: `personalens.com.br`)
- Política de Privacidade em URL pública: `https://personalens.com.br/politica-de-privacidade`
- Termos de Uso em URL pública: `https://personalens.com.br/termos-de-uso`
- Certificado SSL ativo no domínio

---

## 2. Criar App no Meta for Developers

1. Acesse [developers.facebook.com](https://developers.facebook.com)
2. Clique em **"Meus Apps"** → **"Criar App"**
3. Selecione o tipo: **"Business"** (gerenciar integrações B2B)
4. Preencha:
   - **Nome do app:** `Persona Lens`
   - **E-mail de contato:** `contato@personalens.com.br`
   - **Business Manager:** selecione seu portfólio de negócios

---

## 3. Configurações Básicas do App

Em **Configurações → Básico**:

| Campo | Valor |
|-------|-------|
| Nome de exibição | `Persona Lens` |
| Namespace | `personalens` (ou disponível) |
| Ícone do app | Logo do Persona Lens (1024x1024px) |
| Categoria | `Business` |
| URL da Política de Privacidade | `https://personalens.com.br/politica-de-privacidade` |
| URL dos Termos de Serviço | `https://personalens.com.br/termos-de-uso` |
| Domínios do app | `personalens.com.br` |

Em **"URI de Redirecionamento do OAuth"**, adicione:
```
https://SEU_PROJECT_ID.supabase.co/functions/v1/oauth-callback
```

Salve as credenciais em variáveis de ambiente do Supabase:

```bash
supabase secrets set META_APP_ID="seu-app-id"
supabase secrets set META_APP_SECRET="seu-app-secret"
```

---

## 4. Adicionar Produtos ao App

Em **"Painel"**, clique em **"+"** para adicionar:
- **Facebook Login** (necessário para o fluxo OAuth)

Em **Facebook Login → Configurações**:
- Ative **"Login OAuth pelo cliente"** e **"Login OAuth pela Web"**
- URI de Redirecionamento OAuth válidos:
  ```
  https://SEU_PROJECT_ID.supabase.co/functions/v1/oauth-callback
  ```

---

## 5. Permissões Necessárias e Justificativas

### Permissões a solicitar na Meta App Review:

| Permissão | Nível | Finalidade |
|-----------|-------|-----------|
| `ads_read` | Avançado | Leitura de métricas de campanhas (impressões, cliques, conversões, gasto) |
| `ads_management` | Avançado | Acesso à lista de contas de anúncios disponíveis |
| `business_management` | Avançado | Listar contas de anúncios vinculadas ao Business Manager |

> **Todas são permissões avançadas** que exigem revisão pela Meta antes de uso em produção.

---

## 6. Fase de Desenvolvimento (antes da revisão)

Em modo de desenvolvimento:
- Apenas usuários com função no app (Admin, Desenvolvedor, Testador) podem autorizá-lo
- Adicione testadores em **Funções → Testadores**
- Use essa fase para desenvolver e testar o fluxo completo

---

## 7. Submeter para Meta App Review

### a) Materiais necessários

#### Vídeo demonstrativo
Grave um vídeo de **2–5 minutos** mostrando (em inglês ou português):
1. Login na plataforma Persona Lens
2. Fluxo de conexão: clique em "Conectar Meta Ads"
3. Tela de autorização do Facebook com as permissões
4. Dashboard exibindo métricas reais de campanhas Meta
5. Controle de acesso por cliente

**Hospedagem:** YouTube (não listado) ou Google Drive (link público)

#### Justificativas por permissão (em inglês)

**`ads_read`**
> "Persona Lens is a SaaS dashboard platform for digital marketing agencies. We use ads_read to retrieve campaign performance metrics (impressions, clicks, conversions, and spend) from Meta Ads accounts that users explicitly authorize. This data is displayed in real-time dashboards shared with agency clients. We never store sensitive financial data beyond what's needed for dashboard display, and we do not sell or share this data with third parties."

**`ads_management`**
> "We use ads_management to list all Ad Accounts available within the authorized user's Meta Business account, allowing them to select which accounts to include in their Persona Lens dashboard. We do not create, modify, or delete any ads — the permission is used solely for account discovery and metric retrieval."

**`business_management`**
> "We use business_management to access the Business Manager structure and enumerate the ad accounts associated with a business portfolio. This enables agencies to connect multiple client ad accounts under a single dashboard workspace. No business configuration data is modified."

---

### b) Como submeter

1. No painel do app, acesse **"Revisão do App"**
2. Clique em **"Solicitar Permissões Avançadas"**
3. Para cada permissão, adicione:
   - Finalidade (use as justificativas acima)
   - Link do vídeo demonstrativo
4. Submeta — processo leva **5 a 10 dias úteis** em média

---

## 8. Verificação de Domínio

A Meta exige verificação do domínio antes da revisão:

1. Em **"Business Manager"** → **"Configurações do Business"** → **"Domínios"**
2. Adicione `personalens.com.br`
3. Escolha o método de verificação:
   - **Meta-tag HTML** (adicionar no `<head>` da landing page), ou
   - **Arquivo DNS TXT**
4. Confirme a verificação

### Adicionar Meta-tag de verificação (método mais simples)

No arquivo `index.html` do projeto, adicione dentro de `<head>`:
```html
<meta name="facebook-domain-verification" content="SEU_CODIGO_DE_VERIFICACAO" />
```

---

## 9. Checklist antes de submeter

- [ ] App criado no Meta for Developers como tipo "Business"
- [ ] Política de Privacidade em URL pública
- [ ] Termos de Uso em URL pública
- [ ] Logo do app enviado (1024x1024px)
- [ ] Facebook Login configurado com URI de redirecionamento correto
- [ ] Domínio `personalens.com.br` verificado no Business Manager
- [ ] Vídeo demonstrativo gravado e disponível por link
- [ ] Justificativas escritas em inglês para cada permissão
- [ ] `META_APP_ID` e `META_APP_SECRET` configurados no Supabase
- [ ] Testado com pelo menos 3 contas de teste reais

---

## 10. Após a aprovação

- O app sai do modo de desenvolvimento
- Qualquer usuário com conta Meta pode autorizar o app
- Monitore os limites de rate na [Meta API Dashboard](https://developers.facebook.com/tools/explorer/)
- Versão da API em uso: `v19.0` (atualize conforme novas versões da Graph API)
