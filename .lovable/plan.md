

## Plano: Melhorias na Central de Conexões

Após analisar o código completo (`Connections.tsx`, `manage-connections`, `oauth-callback`, `oauth-init`, `evolution-whatsapp`), identifiquei problemas e oportunidades de melhoria organizados por prioridade.

---

### Problemas Encontrados

**1. Botão "Sincronizar Contas" só sincroniza Meta**
O `handleSync` chama apenas `sync_meta_accounts`. Google Ads e GA4 não são re-sincronizados — se o gestor adicionar novas contas nessas plataformas, elas nunca aparecem sem reconectar via OAuth.

**Correção:** Adicionar ações `sync_google_accounts` e `sync_ga4_properties` na edge function `manage-connections`, e chamar todas no botão Sincronizar.

**2. Token expirado do Google não é renovado automaticamente**
O `refresh_token` do Google é salvo, mas nunca é usado para renovar o `access_token`. Após ~1h, chamadas à API do Google falham silenciosamente. A sincronização de contas e o fetch de dados param de funcionar.

**Correção:** Criar uma função `refreshGoogleToken()` na edge function que usa o `refresh_token` para obter um novo `access_token` quando o token atual estiver expirado.

**3. Desconexão do Google/Meta não limpa contas associadas**
O `handleDisconnect` deleta o registro em `oauth_connections`, mas as contas em `manager_ad_accounts` / `manager_meta_ad_accounts` / `manager_ga4_properties` permanecem no banco. Isso pode causar dados fantasma se o gestor reconectar com outra conta.

**Correção:** Ao desconectar, deletar também as contas associadas nas tabelas dedicadas.

**4. WhatsApp sempre mostra como "conectado" no card principal**
Linha 78: `{ id: "", provider: "whatsapp", connected: true, expanded: true }` — está hardcoded como `true`, independente de haver instâncias reais.

**Correção:** Basear o status no número de instâncias conectadas no banco.

**5. Falta feedback de erro detalhado**
Quando a conexão OAuth falha, o toast mostra apenas "Erro ao conectar" sem detalhes. O mesmo para falhas de sincronização.

---

### Melhorias de UX

**6. Exibir data da última sincronização**
Adicionar um campo `last_synced_at` ou extrair de `updated_at` das contas para mostrar "Última sincronização: há 2h" ao lado do botão.

**7. Indicador de token expirado**
Para Google Ads e GA4, verificar `token_expires_at` e mostrar um badge "Token expirado — Reconectar" quando aplicável.

**8. Busca/filtro de contas**
Para gestores com dezenas de contas Meta, adicionar um campo de busca dentro da lista expandida para filtrar rapidamente.

---

### Resumo das Correções

| # | Tipo | Mudança |
|---|------|---------|
| 1 | Bug | Sincronizar Google + GA4 além de Meta |
| 2 | Bug | Auto-refresh de token Google via refresh_token |
| 3 | Bug | Limpar contas ao desconectar |
| 4 | Bug | Status WhatsApp baseado em dados reais |
| 5 | UX | Mensagens de erro detalhadas |
| 6 | UX | Data da última sincronização |
| 7 | UX | Indicador de token expirado |
| 8 | UX | Busca/filtro de contas |

Recomendo implementar os itens 1-4 (bugs) primeiro, seguidos dos itens de UX. Posso implementar todos de uma vez ou em etapas.

