
# Corrigir Fluxo de Conexao WhatsApp

## Problemas Identificados

### 1. Race condition no useEffect (bug principal)
O codigo atual chama `navigate("/conexoes", { replace: true })` **antes** da fetch async terminar. Isso muda o `searchParams`, que re-dispara o `useEffect`. O segundo disparo nao tem `whatsapp_select=1`, entao nao faz nada -- mas o primeiro async pode ser interrompido pelo re-render.

### 2. Expiracao muito curta (15 minutos)
A tabela `whatsapp_pending_connections` tem um default de `now() + 15 min` no `expires_at`. Se o usuario demora um pouco para selecionar, ja expirou. 17 contas para escolher requer mais tempo.

### 3. Frontend nao valida expiracao
O frontend busca o pending sem verificar `expires_at`. O usuario pode ver numeros expirados, clicar para confirmar, e receber erro 410 do backend.

## Correcoes

### Arquivo: `src/pages/Connections.tsx`

**a) Substituir `navigate()` por `window.history.replaceState`**
Em vez de usar `navigate("/conexoes", { replace: true })` que re-dispara o useEffect via React Router, usar `window.history.replaceState(null, "", "/conexoes")` que limpa a URL sem disparar re-render.

**b) Usar um ref para evitar execucao dupla**
Adicionar `useRef(false)` para garantir que o bloco `whatsapp_select=1` execute apenas uma vez.

**c) Verificar `expires_at` no fetch**
Buscar a coluna `expires_at` junto com `accounts`, e verificar se ainda e valido antes de abrir o modal. Se expirado, mostrar toast pedindo para reconectar.

### Migracao SQL: Aumentar tempo de expiracao

Alterar o default de `expires_at` de 15 minutos para 1 hora:

```text
ALTER TABLE whatsapp_pending_connections
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '1 hour');
```

### Migracao SQL: Renovar pending existente

Atualizar o registro atual para que nao esteja expirado na proxima tentativa:

```text
UPDATE whatsapp_pending_connections
  SET expires_at = now() + interval '1 hour'
  WHERE agency_id = '1265e051-4950-45e1-96dc-cab602412461';
```

## Resultado Esperado

1. Usuario clica "Conectar" no WhatsApp
2. Completa OAuth no Meta
3. Retorna para `/conexoes?whatsapp_select=1`
4. Modal abre com os 17 numeros disponiveis (sem race condition)
5. Usuario seleciona um numero
6. Conexao salva, modal fecha, status "Conectado"
