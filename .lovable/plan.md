

## Aviso de dados incompletos no dashboard

### O que muda
Quando o usuario selecionar um periodo (ex: 30 dias) mas o banco de dados nao tiver dados para todos os dias daquele intervalo, um banner de aviso aparecera no topo do dashboard informando quantos dias de dados estao disponiveis e sugerindo o uso do botao "Importar Historico".

### Como funciona

**1. Detectar dias com dados (`src/hooks/useAdsData.tsx`)**
- Apos buscar os registros de `daily_metrics`, contar os dias unicos retornados.
- Calcular quantos dias o periodo selecionado deveria ter (1, 7, 14 ou 30).
- Retornar dois novos campos no hook: `availableDays` (dias com dados) e `expectedDays` (dias esperados pelo periodo).

**2. Exibir banner de aviso (`src/components/ClientDashboard.tsx`)**
- Quando `availableDays < expectedDays`, mostrar um banner amarelo logo abaixo do seletor de periodo.
- Texto: "Dados disponiveis para X de Y dias. Clique em 'Importar Historico' para completar."
- O banner some automaticamente quando os dados cobrem o periodo completo.
- Visivel para todos os usuarios (clientes e gestores), mas a sugestao de importar historico so aparece para gestores.

### Arquivos afetados
- `src/hooks/useAdsData.tsx` -- adicionar contagem de dias unicos e retornar `availableDays`/`expectedDays`
- `src/components/ClientDashboard.tsx` -- consumir os novos campos e renderizar o banner condicional

### Detalhes tecnicos

No hook `useAdsData.tsx`:
```typescript
// Contar dias unicos nos dados retornados
const uniqueDates = new Set(metricRows.map(r => r.date));
const availableDays = uniqueDates.size;
const expectedDays = { TODAY: 1, LAST_7_DAYS: 7, LAST_14_DAYS: 14, LAST_30_DAYS: 30 }[range];
```

No dashboard, o banner usa o componente `Alert` ja existente no projeto com icone de alerta e estilo amarelo/amber.
