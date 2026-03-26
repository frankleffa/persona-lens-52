
Diagnóstico
- O número do topo e o painel de conversões não usam a mesma fonte de verdade.
- O topo de “Compras” vem de `meta_ads` / `consolidated`.
- O painel de conversões vem de `hourly_conversions` e `geo_conversions`, que são calculados em chamadas separadas com breakdowns.
- Pelo retorno live atual, o total canônico está em **44 compras**, mas os breakdowns podem voltar parciais/inconsistentes. Isso já aparece no GEO: país tem compras, enquanto várias regiões vêm zeradas.

O que vou corrigir
1. Unificar a lógica do painel de conversões
- Fazer o `ConversionsPanel` receber também os totais consolidados de compras/cadastros/mensagens.
- Exibir no painel um total derivado da fonte canônica, não apenas da soma dos breakdowns.

2. Parar de usar o breakdown como “fonte de verdade” do total
- Em `src/hooks/useAdsData.tsx`, manter `hourly_conversions` e `geo_conversions` apenas como distribuição visual.
- Adicionar um campo derivado com os totais canônicos do Meta (`purchases`, `registrations`, `messages`) para o painel comparar e exibir corretamente.

3. Ajustar o `HourlyConversionsChart`
- Hoje ele calcula o ticker somando o mapa por hora.
- Vou mudar para priorizar o total canônico recebido por prop.
- Se a soma por hora divergir do total oficial, o gráfico continua mostrando a distribuição disponível, mas o número principal mostrado no card passa a bater com o topo.

4. Ajustar o GEO
- Hoje o GEO pode mostrar buckets zerados/parciais mesmo quando o total existe.
- Vou manter os buckets para ranking/mapa, mas acrescentar validação para não sugerir que o total geral do painel é o somatório GEO.
- Se o breakdown GEO vier incompleto, o painel continua útil sem contradizer o KPI principal.

5. Revisar a montagem no dashboard
- Em `src/components/ClientDashboard.tsx`, passar para `ConversionsPanel` os totais consolidados do Meta.
- Assim o painel e os KPIs passam a refletir o mesmo período e a mesma contagem base.

Arquivos a alterar
- `src/hooks/useAdsData.tsx`
- `src/components/ClientDashboard.tsx`
- `src/components/ConversionsPanel.tsx`
- `src/components/HourlyConversionsChart.tsx`
- opcionalmente `src/components/GeoConversionsChart.tsx`

Resultado esperado
- Se o topo mostrar **44 compras**, o painel de conversões também passa a assumir **44 como total oficial**.
- O gráfico por hora/GEO deixa de “parecer errado” por depender sozinho de breakdown parcial.
- KPI e painel ficam coerentes entre si, mesmo quando a API de breakdown do Meta vier inconsistente.
