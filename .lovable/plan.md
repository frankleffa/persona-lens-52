
O usuário quer uma visualização **estilo "Tracking UTM Analítico"** da imagem — tabela limpa agrupada por campanha mostrando `utm_campaign`, `utm_medium`, `utm_source`, **Quantidade** (de pedidos/depósitos) e **Valor** (R$ somado).

A fonte de dados ideal já existe: tabela `meta_orders` (cruzada com `meta_customers` para `client_id`), que tem exatamente `utm_campaign/medium/source/amount`. Os dados de teste confirmam que funciona.

## Plano

### 1. Hook novo `useUtmTracking(clientId)`
- Consulta `meta_orders` JOIN `meta_customers` filtrando por `client_id`.
- Agrupa em memória por `(utm_campaign, utm_medium, utm_source)`.
- Retorna linhas com `{ campaign, medium, source, quantidade, valor }` ordenadas por valor desc.

### 2. Componente `UtmTrackingTable.tsx` (novo)
Tabela inspirada na imagem:
- Header: **Campanha · utm_campaign · utm_medium · utm_source · Quantidade · Valor**
- Estilo: card branco com borda suave, headers azuis em pílulas (como na referência), linhas com truncate na 1ª coluna (nome amigável da campanha) e tabulares nos números.
- Footer: contador "X linhas" + total geral em R$.
- Busca por campanha + filtros source/medium (reaproveita padrão de `UTMAnalyticsPanel`).
- Ordenação clicável por Quantidade e Valor.

### 3. Integração na nova aba do `UTMAnalyticsPanel`
Adicionar uma nova `TabsTrigger` chamada **"Tracking Analítico"** ao lado das abas existentes (Channels / Campanhas / Eventos). A aba renderiza `UtmTrackingTable` com os dados de `meta_orders` do cliente atual.

Alternativa: incluir também na página `/ltv-meta-ads` (Painel Cravei), já que o nicho de previsão/iGaming é onde isso faz mais sentido. **Default: incluir nos dois lugares**.

### 4. (Opcional, mesma estrutura) Suporte futuro a `leads`
Como `leads` tem o mesmo schema (`utm_*` + `ltv_total`), o hook pode aceitar `source: "orders" | "leads"` para alternar a fonte. Implementar agora só `orders`; deixar a porta aberta.

### Resultado esperado
Uma tabela analítica limpa, idêntica em conceito à imagem, mostrando para cada combinação de UTMs quantos pedidos vieram e quanto somam em receita — visível tanto no painel de UTMs do dashboard quanto no painel Cravei.
