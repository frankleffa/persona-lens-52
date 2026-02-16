
# Atualizar Connections.tsx -- Fluxo de Selecao WhatsApp

## O que muda

Adicionar um modal leve dentro da pagina de Conexoes que aparece automaticamente quando o usuario retorna do OAuth do WhatsApp (com `?whatsapp_select=1` na URL). O modal lista os numeros disponiveis e permite selecionar com um clique.

## Alteracoes no arquivo `src/pages/Connections.tsx`

### 1. Novos imports
- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle` de `@/components/ui/dialog`
- `useNavigate` de `react-router-dom` (para limpar query params)
- `Phone` de `lucide-react`

### 2. Nova interface para contas pendentes
```text
WhatsAppAccount {
  business_id: string
  business_name: string
  waba_id: string
  waba_name: string
  phone_number_id: string
  display_phone_number: string
}
```

### 3. Novos estados
- `waModalOpen` (boolean) -- controla abertura do modal
- `waAccounts` (WhatsAppAccount[]) -- lista de numeros pendentes
- `waLoading` (boolean) -- loading ao buscar contas pendentes
- `waConfirming` (string | null) -- ID do numero sendo confirmado

### 4. Detectar query params (useEffect)

Atualizar o `useEffect` existente que ja trata `connected` e `error`:

- Se `whatsapp_select=1`:
  - Buscar `whatsapp_pending_connections` do usuario autenticado via Supabase client
  - Extrair array `accounts` do registro pendente
  - Setar `waAccounts` e abrir `waModalOpen = true`
  - Limpar o query param da URL com `navigate("/conexoes", { replace: true })`

- Se `connected=whatsapp`:
  - Toast: "WhatsApp ativado com sucesso."
  - Limpar query param
  - Chamar `fetchConnections()`

### 5. Funcao `handleSelectWhatsApp(account)`

- Setar `waConfirming = account.phone_number_id`
- POST para `confirm-whatsapp-selection` com `{ waba_id, phone_number_id }`
- Em caso de sucesso: fechar modal, toast de sucesso, `fetchConnections()`
- Em caso de erro: toast de erro
- Limpar `waConfirming`

### 6. Modal (Dialog) no JSX

Renderizado no final do return, fora do loop de providers:

- Titulo: "Qual numero enviara os relatorios?"
- Lista de cards, um por numero, mostrando:
  - Nome da empresa (`business_name`)
  - Numero formatado (`display_phone_number`)
- Cada card tem um botao verde "Usar este numero"
- Loading spinner no botao ao confirmar
- Se lista vazia ou erro: mensagem orientando reconectar

### 7. Sem mudancas no backend

O endpoint `confirm-whatsapp-selection` ja esta pronto e trata tudo: validacao, upsert em `whatsapp_connections`, limpeza de pendentes.

## Resultado

O usuario volta do OAuth, ve um modal limpo com seus numeros, clica em um, e esta conectado. Sem redirecionamentos, sem telas extras.
