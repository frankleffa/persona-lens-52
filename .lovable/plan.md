

## Two Chart Modes: Bar + Trading-Style Area Chart

The user wants **both** chart styles available — the existing bar chart AND a new trading-style area chart — togglable.

### Plan

#### 1. HourlyConversionsChart.tsx — Add chart mode toggle + area chart

**Add state**: `chartMode: "bar" | "area"` (default `"area"` for the new trading look).

**Add ticker summary** (above chart, visible in both modes):
- Total for selected type: Geist Mono 700, 28px, `#f0ece6`
- Label: Geist 500, 11px, muted, uppercase
- No change % (no previous period data available in this component)

**Add area chart variant** using `AreaChart` + `Area` from recharts:
- `type="monotone"`, stroke `#FF5C3A`, strokeWidth 2
- Fill gradient `url(#colorConv)`: coral 0.4 → 0.1 → 0 opacity
- `dot={false}`, `activeDot={{ r:4, fill:'#FF5C3A', strokeWidth:0 }}`
- Tooltip background `#1c2333`
- CartesianGrid `rgba(255,255,255,0.04)`, axisLine/tickLine false

**Add chart mode toggle buttons** (📊 / 📈 icons or "Barras" / "Linha") next to the type buttons.

**Keep existing bar chart** intact — render conditionally based on `chartMode`.

#### 2. Import changes

Add: `AreaChart`, `Area` from recharts (already available, same library).
Keep: `BarChart`, `Bar` — used when mode is "bar".

#### 3. Files touched
- `src/components/HourlyConversionsChart.tsx` only

