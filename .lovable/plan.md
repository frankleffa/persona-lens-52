

# Agency Control - Painel de Gestao de Clientes

## Contexto

Atualmente, a gestao de clientes (criar, listar, deletar, atribuir contas) esta embutida na pagina de Permissoes (`/permissoes`). O Agency Control sera uma pagina dedicada e completa para gestao de clientes da agencia.

## O que sera criado

### 1. Nova pagina: `src/pages/AgencyControl.tsx`

Painel completo com as seguintes secoes:

- **Cabecalho** com titulo "Agency Control" e botao "Novo Cliente"
- **Cards de resumo**: total de clientes, clientes com contas vinculadas, total de contas ativas
- **Lista de clientes** em formato de cards expandiveis, cada um mostrando:
  - Nome, email, label/empresa
  - Numero de contas vinculadas (Google, Meta, GA4)
  - Botoes de acao: editar label, configurar contas, ver dashboard, criar relatorio, remover
- **Formulario de criacao de cliente** (dialog/modal) com campos: nome, email, senha, label
- **Configuracao de contas** integrada (reutilizando `ClientAccountConfig`)

### 2. Atualizacoes no sidebar: `src/components/AppSidebar.tsx`

- Adicionar item "Agency Control" com icone `Building2` para roles `admin` e `manager`
- Rota: `/agency`

### 3. Atualizacoes no roteamento: `src/App.tsx`

- Adicionar rota `/agency` protegida para managers e admins

### 4. Refatorar pagina de Permissoes: `src/pages/Permissions.tsx`

- Remover a secao de gestao de clientes (criar, listar, deletar)
- Manter apenas a selecao de cliente e configuracao de permissoes de metricas
- Usar o mesmo hook/dados de clientes para o seletor

## Detalhes tecnicos

### Estrutura do AgencyControl.tsx

- Reutiliza `callManageClients()` existente (edge function `manage-clients`)
- Reutiliza o componente `ClientAccountConfig` para atribuicao de contas
- Usa Dialog do Radix para o formulario de criacao
- Cards com layout responsivo (grid 1 col mobile, 2-3 cols desktop)
- Usa os mesmos padroes de estilo do projeto (card-executive, animate-fade-in, etc.)

### Secao de resumo (KPIs)

```text
+------------------+  +------------------+  +------------------+
|  Total Clientes  |  | Com Contas Ativas|  |  Contas Totais   |
|       5          |  |       3          |  |       12         |
+------------------+  +------------------+  +------------------+
```

### Sidebar - novo item

```text
{ path: "/agency", label: "Agency Control", icon: Building2, roles: ["admin", "manager"] }
```

Posicionado entre "Dashboard" e "Central de Conexoes".

### Arquivos modificados

1. `src/pages/AgencyControl.tsx` - NOVO
2. `src/components/AppSidebar.tsx` - adicionar nav item
3. `src/App.tsx` - adicionar rota
4. `src/pages/Permissions.tsx` - remover secao de gestao de clientes (manter so permissoes)

### Nenhuma alteracao no banco de dados

Toda a infraestrutura de backend (tabelas, edge functions, RLS) ja existe e sera reutilizada.

