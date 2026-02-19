
# Corrigir: Vinculação de Contas a Clientes na página /agency

## Diagnóstico completo

O problema tem duas causas:

**Causa 1 — Double-click de expansão confuso**
O fluxo atual exige dois cliques:
1. Clicar no chevron da linha do cliente para expandir o painel
2. Dentro do painel expandido, clicar em outro botão interno do `ClientAccountConfig` para ver os checkboxes

O `ClientAccountConfig` é um componente colapsável dentro de outro colapsável — o usuário clica para expandir o cliente e vê apenas "0 contas vinculadas" com um chevron minúsculo que precisa ser clicado novamente. É completamente invisível.

**Causa 2 — Componente some sem aviso**
Em `ClientAccountConfig.tsx`:
```ts
if (!hasAccounts) return null; // some silenciosamente
```
Se o gestor não tem contas ativas na Central de Conexões (`manager_ad_accounts` ou `manager_meta_ad_accounts` com `is_active = true`), o componente inteiro desaparece. O usuário não sabe por quê.

**Causa 3 — Dados atuais do gestor**
Verificando a network request do `manage-clients`, a resposta mostra:
```json
"available_accounts": {
  "google": [],
  "meta": [
    { "ad_account_id": "act_137308989291035", "account_name": "CA - Posturologia Integrada" },
    { "ad_account_id": "act_851246943070454", "account_name": "CA - Principal PodoStore" }
  ],
  "ga4": []
}
```
O gestor TEM 2 contas Meta ativas disponíveis. Portanto o problema é que o usuário não encontra a interface de seleção (dupla expansão).

## Solução

### Parte 1 — Remover a dupla expansão do `ClientAccountConfig`

Reescrever `ClientAccountConfig` para mostrar as contas diretamente sem o segundo botão de expansão:
- Remover o estado `expanded` e o botão de toggle interno
- Mostrar as contas imediatamente quando o painel do cliente está aberto
- Manter a lógica de checkboxes e o botão Salvar

### Parte 2 — Melhorar mensagem quando não há contas disponíveis

Em vez de `return null`, mostrar:
```
Nenhuma conta de anúncios ativa encontrada.
Ative suas contas na → Central de Conexões
```
Com link navegável para `/connections`.

### Parte 3 — Melhorar o título da seção expandida

No `AgencyControl.tsx`, quando o painel expande, adicionar um título claro "Contas de Anúncios Vinculadas" para o usuário entender imediatamente o que pode fazer ali.

## Arquivos modificados

| Arquivo | Ação |
|---------|------|
| `src/components/ClientAccountConfig.tsx` | Remover expansão interna, mostrar contas diretamente, melhorar mensagem de empty state |
| `src/pages/AgencyControl.tsx` | Adicionar título e descrição na área expandida para orientar o usuário |

## Detalhes técnicos

**`ClientAccountConfig.tsx` — novo comportamento:**
- Remover `useState(expanded)` e o `<button onClick={setExpanded}>` 
- Renderizar diretamente o conteúdo (checkboxes + botão Salvar)
- `if (!hasAccounts)` → mostrar empty state com link, não `return null`
- Manter toda a lógica de `toggleGoogle`, `toggleMeta`, `toggleGA4`, `handleSave`

**`AgencyControl.tsx` — área expandida:**
- Adicionar um cabeçalho "Contas Vinculadas" com ícone `Link2` antes do `ClientAccountConfig`
- Opcional: mostrar badge com número de contas já vinculadas
