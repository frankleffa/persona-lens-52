
# Nova Pagina "Relatorios" na Navegacao

## Objetivo
Criar uma nova rota `/relatorios` com item dedicado na sidebar, centralizando as funcionalidades de relatorios WhatsApp e PDF em uma unica pagina com abas.

## O que muda

### 1. Sidebar (`AppSidebar.tsx`)
- Adicionar novo item de navegacao: `{ path: "/relatorios", label: "Relatorios", icon: FileText, roles: ["admin", "manager"] }`
- Posicionar entre "Agency Control" e "Central de Conexoes"

### 2. Nova pagina `src/pages/Reports.tsx`
Pagina com seletor de cliente no topo e duas abas (usando Tabs do shadcn):

**Aba "WhatsApp"**
- Reutiliza o componente `WhatsAppReportConfig` existente, passando o `clientId` selecionado
- Reutiliza o componente `BalanceAlertConfig` existente para alertas de saldo

**Aba "PDF"**
- Reutiliza toda a logica ja existente em `ReportCreate` (selecao de template, periodo, secoes, metricas, notas)
- O formulario de criacao de relatorio PDF fica embutido diretamente nesta aba

### 3. Rotas (`App.tsx`)
- Adicionar rota `/relatorios` para managers dentro do `ProtectedLayout`
- Manter a rota `/clients/:clientId/reports/new` existente para acesso direto (compatibilidade)

### 4. O que NAO muda
- Nenhuma funcionalidade existente sera removida
- `AgencyControl.tsx` continua com WhatsAppReportConfig e BalanceAlertConfig na area expandida do cliente
- A rota de preview de relatorio (`/reports/:reportId/preview`) permanece inalterada
- Nenhuma tabela do banco de dados sera alterada
- Nenhuma edge function sera alterada

## Detalhes Tecnicos

### Estrutura da pagina Reports
```text
/relatorios
  +-- Seletor de cliente (dropdown, reutiliza useManagerClients)
  +-- Tabs
       +-- "WhatsApp"
       |     +-- WhatsAppReportConfig (metricas do resumo)
       |     +-- BalanceAlertConfig (alertas de saldo)
       +-- "PDF"
             +-- Formulario completo de criacao (periodo, template, secoes, metricas, notas, botao gerar)
```

### Arquivos modificados
- `src/components/AppSidebar.tsx` - novo item na navegacao
- `src/App.tsx` - nova rota protegida
- `src/pages/Reports.tsx` - nova pagina (criada)

### Arquivos reutilizados (sem modificacao)
- `src/components/WhatsAppReportConfig.tsx`
- `src/components/BalanceAlertConfig.tsx`
- `src/components/ReportMetricsSelector.tsx`
- `src/hooks/useManagerClients.ts`
