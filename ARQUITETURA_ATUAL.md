# Arquitetura Atual - Persona Lens

**Data de Análise**: 2026-03-06
**Versão do Projeto**: Personas Lens v1
**Status**: Em desenvolvimento ativo

---

## 📋 Índice

1. [Estrutura Geral](#1-estrutura-geral)
2. [Integração Meta Ads](#2-integração-meta-ads)
3. [Integração Claude/IA](#3-integração-claudeia)
4. [Dashboard e UI de Métricas](#4-dashboard-e-ui-de-métricas)
5. [Banco de Dados (Supabase)](#5-banco-de-dados-supabase)
6. [Fluxo de Dados](#6-fluxo-de-dados)
7. [Dependências Principais](#7-dependências-principais)

---

## 1. ESTRUTURA GERAL

### 1.1 Páginas/Rotas Principais

Todas as páginas estão em `src/pages/`:

| Página | Arquivo | Função |
|--------|---------|--------|
| **Dashboard Principal** | `Index.tsx` | Página inicial com seleção de cliente para managers/admins |
| **Landing Page** | `LandingPage.tsx` | Página de marketing do produto |
| **Conexões (OAuth)** | `Connections.tsx` | Gerenciamento de conexões Meta Ads e Google Ads |
| **Permissões** | `Permissions.tsx` | Configuração de permissões de usuários |
| **Autenticação** | `Auth.tsx` | Login e registro de usuários |
| **Relatórios** | `Reports.tsx`, `ReportCreate.tsx`, `ReportPreview.tsx` | Criação e visualização de relatórios |
| **Execução** | `Execution.tsx` | Gerenciamento de tarefas/execuções |
| **Controle de Agência** | `AgencyControl.tsx` | Painel de administração da agência |
| **Admin Landing** | `AdminLandingEditor.tsx` | Editor da landing page para admins |
| **Preview** | `Preview.tsx` | Visualização de componentes |

### 1.2 Edge Functions (Supabase)

Localização: `supabase/functions/`

| Função | Arquivo | Propósito |
|--------|---------|----------|
| **analyze-client** | `analyze-client/index.ts` | Análise com IA (Claude) dos dados de campanhas |
| **fetch-ads-data** | `fetch-ads-data/index.ts` | Busca dados ao vivo da Meta Ads API e Google Ads API |
| **manage-clients** | `manage-clients/index.ts` | Gerenciamento CRUD de clientes |
| **manage-connections** | `manage-connections/index.ts` | Gerenciamento de conexões OAuth |
| **oauth-callback** | `oauth-callback/index.ts` | Callback do fluxo OAuth |
| **oauth-init** | `oauth-init/index.ts` | Inicialização do fluxo OAuth |
| **sync-daily-metrics** | `sync-daily-metrics/index.ts` | Sincronização diária de métricas (cron) |
| **cron-whatsapp-reports** | `cron-whatsapp-reports/index.ts` | Envio de relatórios via WhatsApp (cron) |
| **check-subscription** | `check-subscription/index.ts` | Verificação de status de subscrição |
| **create-checkout** | `create-checkout/index.ts` | Criação de checkout de pagamento |
| **customer-portal** | `customer-portal/index.ts` | Portal do cliente para gerenciar subscrição |
| **check-balance-alerts** | `check-balance-alerts/index.ts` | Verificação de alertas de saldo |
| **backfill-metrics** | `backfill-metrics/index.ts` | Preenchimento retroativo de métricas |
| **evolution-whatsapp** | `evolution-whatsapp/index.ts` | Integração Evolution WhatsApp API |

### 1.3 Tabelas do Banco de Dados

**Migrations criadas** (45 arquivos): `supabase/migrations/`

**Principais Tabelas** (inferido das queries e migrations):

#### Dados de Métricas
- **daily_metrics** - Métricas diárias por plataforma
  - Colunas: `client_id`, `date`, `platform`, `spend`, `impressions`, `clicks`, `conversions`, `revenue`, `ftd`, `cost_per_ftd`, `purchases`, `registrations`, `messages`, `leads`, `hourly_data` (JSON), `geo_data` (JSON)

- **daily_campaigns** - Campanhas diárias
  - Colunas: `client_id`, `date`, `campaign_name`, `platform`, `spend`, `clicks`, `conversions`, `revenue`, `ftd`, `leads`, `messages`, `purchases`, `campaign_status`, `external_campaign_id`, `adset_count`, `ad_count`

#### Gerenciamento de Clientes
- **client_manager_links** - Relação entre clientes e managers
- **client_meta_ad_accounts** - Contas Meta Ads do cliente
- **demo_clients** - Clientes de demonstração

#### Autenticação e Autorização
- **user_roles** - Papéis de usuários (client, manager, admin)
- **profiles** - Perfis de usuários

#### OAuth e Conexões
- **oauth_connections** - Tokens e conexões OAuth
- **safe_oauth_connections** - View segura (sem tokens)

#### Análises
- **optimization_tasks** - Tarefas de otimização geradas por IA

---

## 2. INTEGRAÇÃO META ADS

### 2.1 Arquivos Relacionados a Meta Ads

Total de **32 arquivos** mencionam Meta Ads, campaign, adset, ad_account, insights, graph.facebook.

#### Serviços de API (src/services/)

**`src/services/ads-api.ts`** (133 linhas)
- Cliente para chamadas ao Edge Function `fetch-ads-data`
- Funções principais:
  - `fetchLiveAdsData()` - Busca ao vivo
  - `fetchLiveAdsDataWithTimeout()` - Com timeout para background
  - `triggerLiveSync()` - Fire-and-forget sync

**`src/services/ads-data.ts`** (75 linhas)
- Queries Supabase para `daily_metrics` e `daily_campaigns`
- `fetchDailyMetrics()` - Métricas com deduplicação
- `fetchDailyCampaigns()` - Campanhas com deduplicação

#### Hooks (src/hooks/)

**`src/hooks/useAdsData.tsx`** (520 linhas)
- Hook principal com React Query
- Gerencia: DB data, live API fallback, previous period, enrichment
- Retorna: AdsDataResult com google_ads, meta_ads, ga4, consolidated

**`src/hooks/useClientAnalysis.ts`** (44 linhas)
- Hook para invocar `analyze-client` Edge Function
- Retorna: insights, isAnalyzing, error

#### Edge Function: fetch-ads-data

**`supabase/functions/fetch-ads-data/index.ts`** (300+ linhas)

**Meta Ads API Integration**:
- **Versão da API**: `v19.0`
- **Endpoint**: `https://graph.facebook.com/v19.0/{accountId}/insights`
- **Campos**: spend, impressions, clicks, actions, action_values
- **Action types**:
  - `offsite_conversion.fb_pixel_purchase` → purchases
  - `offsite_conversion.fb_pixel_complete_registration` → registrations
  - `onsite_conversion.messaging_*` → messages

**Limite**: 5 contas de anúncio, top 20 campanhas

### 2.2 Armazenamento de Token Meta

**Localização**: `supabase/oauth_connections` table
- Coluna: `access_token` (criptografada)
- Coluna: `provider` = "meta_ads"
- Coluna: `manager_id` - Gerente que gerou o token
- Coluna: `account_data` (JSON)

**Como é usado**:
1. Em `fetch-ads-data`: Recuperado por manager_id
2. Em `analyze-client`: Usado para buscar dados ao vivo

**Segurança**:
- View `safe_oauth_connections` exclui o token
- Tokens enviados via HTTPS

### 2.3 Componentes de UI - Meta Ads

**`src/components/CampaignTable.tsx`**
- Tabela de campanhas com colunas selecionáveis
- Colunas: investment, result, purchases, registrations, cpa, cpc, clicks, impressions, ctr, revenue, messages, etc
- Paginação (10 por página)

**Outros componentes**:
- `ClientAccountConfig.tsx` - Configuração de contas
- `CampaignDrawer.tsx` - Detalhes de campanha
- `BalanceAlertConfig.tsx` - Alertas de saldo

### 2.4 Fluxo de Dados Meta Ads

```
oauth_connections (token)
  ↓
fetch-ads-data (Edge Function)
  ├─ Busca client_meta_ad_accounts
  ├─ Chama graph.facebook.com API
  └─ Persiste em daily_metrics/daily_campaigns
  ↓
useAdsData Hook (React Query)
  ├─ fetchDailyMetrics/Campaigns
  └─ Fallback ao live API se sem dados
  ↓
Componentes UI (CampaignTable, Charts, etc)
```

---

## 3. INTEGRAÇÃO CLAUDE/IA

### 3.1 Arquivos Relacionados a IA

Total de **67 arquivos** mencionam IA/analysis/anthropic/claude.

#### Hook: useClientAnalysis

**`src/hooks/useClientAnalysis.ts`** (44 linhas)

```typescript
export interface AIInsight {
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  type: "optimization" | "alert" | "opportunity";
}

export function useClientAnalysis() {
  // Invoca analyze-client Edge Function
  // Retorna: insights, isAnalyzing, error, analyze()
}
```

#### Edge Function: analyze-client

**`supabase/functions/analyze-client/index.ts`** (514 linhas)

**Request**:
```json
{
  "client_id": "uuid",
  "days": 30
}
```

**Response**:
```json
{
  "insights": [
    {
      "title": "short action title",
      "description": "detailed explanation with metrics",
      "priority": "high|medium|low",
      "type": "optimization|alert|opportunity"
    }
  ]
}
```

### 3.2 Fluxo de Análise com Claude

```
1. useClientAnalysis() → supabase.functions.invoke("analyze-client")

2. analyze-client Edge Function:
   a) Role check: apenas managers/admins
   b) Resolve manager_id do cliente
   c) Tenta buscar dados ao VIVO da Meta API:
      - oauth_connections.access_token
      - client_meta_ad_accounts.ad_account_id
      - fetchMetaLiveData() → graph.facebook.com
   d) Fallback ao DB se falhar
   e) Monta prompt com:
      - metricsSummary (consolidadas)
      - campaignsSummary (top 10)

3. Prompt para Claude:
   - Contexto: Senior performance marketing analyst
   - Vertical: iGaming / betting
   - Objetivo: Reduzir Cost per FTD, aumentar volume FTDs
   - Dados: Últimos 30 dias
   - Formato: JSON array de insights

4. Claude responde com JSON

5. handleAIResponse():
   - Parse JSON
   - INSERT em optimization_tasks
   - Retorna insights

6. Frontend atualiza com insights
```

### 3.3 Modelo e Configuração Claude

**Modelo Principal**: `claude-sonnet-4-20250514`
**Modelo Fallback**: `claude-3-5-sonnet-20241022`

**Endpoint**: `https://api.anthropic.com/v1/messages`

**Parâmetros**:
- `max_tokens`: 1500
- `messages`: [{ role: "user", content: prompt }]

**Headers**:
```
Content-Type: application/json
x-api-key: ${ANTHROPIC_API_KEY}
anthropic-version: 2023-06-01
```

**Tratamento de Erro**:
- `not_found` → tenta fallback model
- `credit balance is too low` → mensagem específica
- Outros → erro genérico

### 3.4 Salvamento de Insights

**Tabela**: `optimization_tasks`

**Colunas**:
- `client_id` - ID do cliente
- `title` - Título da insight
- `description` - Descrição
- `status` - "TODO" (padrão)
- `auto_generated` - true
- `created_at` - timestamp

---

## 4. DASHBOARD E UI DE MÉTRICAS

### 4.1 Componentes Principais

**`src/components/ClientDashboard.tsx`**
- Exibe métricas via `useAdsData`
- Suporta troca de período
- Comparação com período anterior
- KPIs principais

**`src/components/CampaignTable.tsx`**
- Tabela de campanhas com colunas selecionáveis
- Paginação (10 por página)

**Gráficos**:
- `AttributionChart.tsx` - Atribuição multi-toque
- `FunnelChart.tsx` - Funil de conversão
- `JourneyFunnelChart.tsx` - Jornada de cliente
- `HourlyConversionsChart.tsx` - Conversões por hora
- `GeoConversionsChart.tsx` - Conversões geográficas
- `GeoMapChart.tsx` - Mapa de conversões
- `TrendChart.tsx` - Tendência ao longo do tempo

**Páginas de Relatórios**:
- `Reports.tsx` - Lista de relatórios
- `ReportCreate.tsx` - Criar novo
- `ReportPreview.tsx` - Visualizar

---

## 5. BANCO DE DADOS (SUPABASE)

### 5.1 Configuração

**Arquivo: `.env`**

```env
VITE_SUPABASE_PROJECT_ID="uwvougccbsrnrtnsgert"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
VITE_SUPABASE_URL="https://uwvougccbsrnrtnsgert.supabase.co"
VITE_EVOLUTION_API_URL="http://187.77.45.58:57317"
VITE_EVOLUTION_API_KEY="w0QOijagErFGDo8J9ii4ZimtMripREWD"
```

**Variáveis (sem valores)**:
- `SUPABASE_PROJECT_ID`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_DEVELOPER_TOKEN`
- `EVOLUTION_API_URL`
- `EVOLUTION_API_KEY`

### 5.2 Tabelas Principais

**`daily_metrics`**
```
- id, client_id, date, platform
- spend, impressions, clicks, conversions, revenue
- ftd, cost_per_ftd (FTD = First Time Deposit)
- purchases, registrations, messages, leads
- hourly_data (JSON), geo_data (JSON)
```

**`daily_campaigns`**
```
- id, client_id, date, campaign_name, platform
- spend, clicks, conversions, revenue, ftd
- leads, messages, purchases
- campaign_status, external_campaign_id
- adset_count, ad_count
```

**`client_manager_links`**
```
- id, manager_id, client_user_id, created_at
```

**`client_meta_ad_accounts`**
```
- client_user_id, ad_account_id (e.g., "act_123456789")
```

**`oauth_connections`** (RLS)
```
- id, manager_id, provider ("meta_ads", "google_ads")
- access_token, refresh_token
- account_data (JSON), connected, created_at, updated_at
```

**`optimization_tasks`**
```
- id, client_id, title, description
- status ("TODO", "IN_PROGRESS", "DONE")
- auto_generated, created_at, updated_at
```

**`user_roles`** (RLS)
```
- user_id, role ("client", "manager", "admin")
```

**`profiles`**
```
- id (FK → auth.users), full_name, email, avatar_url
```

### 5.3 Políticas de RLS

- `user_roles`: Usuários veem apenas seus roles
- `oauth_connections`: Managers veem apenas suas conexões
- `daily_metrics`: Clientes veem suas métricas; managers veem clientes
- `client_manager_links`: Apenas managers/admins leem

---

## 6. FLUXO DE DADOS

### 6.1 Fluxo Geral

```
FONTES EXTERNAS
  ├─ Meta Ads API (graph.facebook.com)
  ├─ Google Ads API
  ├─ Google Analytics 4
  └─ Evolution WhatsApp API
      ↓
SUPABASE EDGE FUNCTIONS
  ├─ fetch-ads-data (Live API)
  ├─ sync-daily-metrics (Cron)
  ├─ analyze-client (Claude)
  └─ oauth-init/callback
      ↓
SUPABASE DATABASE
  ├─ daily_metrics, daily_campaigns
  ├─ oauth_connections
  ├─ optimization_tasks
  └─ user_roles, profiles
      ↓
FRONTEND REACT
  ├─ useAdsData Hook (React Query)
  ├─ useClientAnalysis Hook
  └─ Components
      ↓
USER INTERFACE
  ├─ Dashboard
  ├─ Relatórios
  └─ Análises com IA
```

### 6.2 Ciclo de Atualização

```
1. PULL (Cron Job)
   └─ sync-daily-metrics → Meta/Google APIs → DB

2. LIVE (On-demand)
   └─ fetch-ads-data → APIs → Frontend
      (Fallback se DB vazio)

3. ANÁLISE (On-demand)
   └─ analyze-client → Live/DB → Claude → optimization_tasks

4. UI UPDATES
   └─ React Query cache + background refetch
```

---

## 7. DEPENDÊNCIAS PRINCIPAIS

### Frontend

```json
{
  "react": "^18.3.1",
  "react-router-dom": "^6.30.1",
  "typescript": "^5.8.3",
  "@tanstack/react-query": "^5.83.0",
  "@supabase/supabase-js": "^2.95.3",
  "tailwindcss": "^3.4.17",
  "recharts": "^2.15.4",
  "lucide-react": "latest",
  "react-hook-form": "^7.61.1",
  "zod": "^3.25.76",
  "date-fns": "^3.6.0",
  "sonner": "toast"
}
```

### APIs Externas

| API | Endpoint | Uso | Auth |
|-----|----------|-----|------|
| Meta Ads | graph.facebook.com/v19.0 | Insights | Bearer token |
| Google Ads | googleads.googleapis.com/v16 | Métricas | Bearer + Dev Token |
| Claude | api.anthropic.com/v1/messages | Análise IA | API Key |
| Evolution WA | 187.77.45.58:57317 | WhatsApp | API Key |

---

## 8. RESUMO EXECUTIVO

### Arquitetura em Camadas

```
Frontend (React)
    ↓
Backend (Supabase)
    ↓
APIs (Meta, Google, Claude, WA)
```

### Fluxo Principal

1. Manager conecta Meta/Google via OAuth
2. Edge functions sincronizam métricas
3. Frontend solicita análise com IA
4. Dashboard visualiza em tempo real
5. Insights automáticas geradas
6. Relatórios para WhatsApp

### Dados Críticos

- **FTD (First Time Deposit)**: Métrica primária em iGaming
- **Campanhas**: Agregadas por nome/platform
- **Insights**: Salvas para auditoria e tracking

### Segurança

✅ RLS em tabelas sensíveis
✅ OAuth 2.0
✅ Tokens criptografados
✅ Role-based access control
✅ HTTPS para APIs

---

**Gerado em**: 2026-03-06
**Status**: Análise completa concluída
