

## Plano: Mapa branco com pontos azuis vibrantes + correção de erros de build

### Parte 1: Redesign do mapa (GeoMapChart.tsx)

Mudar o visual do mapa para:
- **Fundo branco/neutro** nos estados/países (sem preenchimento por intensidade)
- **Pontos circulares azuis vibrantes** posicionados no centróide de cada estado/país com dados
- Tamanho do ponto proporcional ao valor da métrica (min 4px, max 18px)
- Efeito de **glow/pulse** nos pontos com mais dados
- Usar `geoCentroid` do d3-geo para calcular o centro de cada geografia e posicionar `<circle>` sobre ela
- Manter tooltip ao hover nos pontos
- Atualizar legenda para refletir o novo visual (menor/maior = ponto menor/maior)

Cores:
- Geographies fill: `#f8f9fa` (branco suave), stroke: `#e2e8f0`
- Pontos: `#3b82f6` (blue-500) com opacidade e glow variável

### Parte 2: Correção dos erros de build

Os erros são porque `types.ts` (auto-gerado) não inclui tabelas como `analysis_reports`, `automation_rules`, `automation_log`, `client_analysis_config`. A correção é adicionar `as any` nos `.from()` dessas tabelas:

- **`src/hooks/useAnalysisHistory.ts`** - linhas 32, 56: `.from("analysis_reports" as any)`, `.from("automation_log" as any)`
- **`src/hooks/useAutomation.ts`** - linhas 51, 70, 87, 117, 139: `.from("automation_rules" as any)`, `.from("automation_log" as any)`
- **`src/hooks/useClientAnalysisConfig.ts`** - linhas 31, 52: `.from("client_analysis_config" as any)`
- **`src/hooks/useDeepAnalysis.ts`** - linha 60: `.from("analysis_reports" as any)`
- **`src/components/WhatsAppReportConfig.tsx`** - já usa `as any`, mas precisa cast no `data` (linha 113): `const d = data as any;`

### Arquivos modificados

1. `src/components/GeoMapChart.tsx` - redesign visual completo
2. `src/hooks/useAnalysisHistory.ts` - `as any` nos `.from()`
3. `src/hooks/useAutomation.ts` - `as any` nos `.from()`
4. `src/hooks/useClientAnalysisConfig.ts` - `as any` nos `.from()`
5. `src/hooks/useDeepAnalysis.ts` - `as any` no `.from()`
6. `src/components/WhatsAppReportConfig.tsx` - cast do `data`

