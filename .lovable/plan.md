

## Conversions Charts — Polymarket-style refinement

Pure visual changes to `HourlyConversionsChart.tsx` and `GeoConversionsChart.tsx`. No logic changes.

### HourlyConversionsChart.tsx

1. **Add `<defs>` with a `<linearGradient>`** inside the `<BarChart>` for the coral gradient fill (top `#FF5C3A` → bottom `rgba(255,92,58,0.4)`)
2. **Replace `TYPE_COLORS`** — all three types use `url(#coralGradient)` as fill instead of per-type HSL colors
3. **Bar radius**: `[4, 4, 0, 0]` (rounded top corners)
4. **Remove grid**: set `CartesianGrid` stroke to `transparent` (or remove it)
5. **Axis labels**: fill `rgba(240,236,230,0.3)`, fontFamily `'Geist Mono', monospace`, fontSize 10
6. **Tooltip**: background `#181818`, border `1px solid rgba(255,92,58,0.3)`, borderRadius `6px`, font 12px, color `#f0ece6`, padding `8px 12px`
7. **Animation**: `isAnimationActive={true}` on `<Bar>` (recharts default, but make explicit)

### GeoConversionsChart.tsx

Same treatment applied to the horizontal bar chart:
1. Add `<defs>` with horizontal coral gradient
2. Replace `COLORS` map — all metrics use `url(#coralGradient)`
3. Bar radius: `[0, 4, 4, 0]` (rounded right corners for horizontal layout)
4. Grid stroke → transparent
5. Axis labels: same `rgba(240,236,230,0.3)` color, Geist Mono
6. Tooltip: same Polymarket-style dark tooltip
7. Explicit `isAnimationActive={true}`

### Files touched
- `src/components/HourlyConversionsChart.tsx`
- `src/components/GeoConversionsChart.tsx`

