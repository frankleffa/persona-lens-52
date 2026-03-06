

## Plan: Complete the new dark theme across all components

The new dark theme (blue accent `#1c9cf0`, black bg `#000000`) was applied to `index.css` and charts, but several components still have hardcoded colors from the old coral theme or don't adapt properly. Here's what needs fixing:

### 1. CampaignTable.tsx — hardcoded `rgba(255,...)` colors

- **Line 132**: `rgba(255,255,255,0.08)` border — replace with `var(--border)` via className
- **Line 151**: `hover:bg-[rgba(255,92,58,0.04)]` (coral hover) — change to `hover:bg-primary/5`  
- **Line 151**: `border-[rgba(255,255,255,0.04)]` — change to `border-border/30`

### 2. GeoConversionsChart.tsx — hardcoded dark-only colors

- **Line 99**: `border-[rgba(255,255,255,0.08)]` — change to `border-border`
- **Line 100**: `text-[rgba(240,236,230,0.25)]` — change to `text-muted-foreground/25`
- Add the same `isLight` MutationObserver pattern from HourlyConversionsChart to make the gradient, axis, and tooltip colors theme-aware

### 3. JourneyFunnelChart.tsx — `hsl(var(--chart-*))` won't work

- **Lines 74-80**: `STAGE_COLORS` uses `hsl(var(--chart-1))` etc., but the CSS variables are already full hex colors (e.g., `--chart-1: #1e9df1`), not HSL channels. Change to `var(--chart-1)` etc.

### 4. index.css — nav-item active gradient uses hardcoded blue

- **Line 323**: `.nav-item.active` gradient uses `rgba(28, 156, 240, 0.08)` — change to use `color-mix` or keep as-is since it matches the new blue accent. This is actually correct now.

### 5. Light mode `.light` section — missing `--chart-1` through `--chart-5`

- The `.light` block doesn't define `--chart-1` through `--chart-5`, so it falls back to dark mode values. Add light-appropriate chart colors.

### 6. AttributionChart.tsx — tooltip boxShadow hardcoded

- **Line 37**: `rgba(0,0,0,0.3)` shadow — works in both modes, acceptable.

### Summary of files to edit

| File | Changes |
|------|---------|
| `src/components/CampaignTable.tsx` | Replace 3 hardcoded rgba values with theme-aware classes |
| `src/components/GeoConversionsChart.tsx` | Add isLight detection, theme-aware chart colors, fix hardcoded rgba classes |
| `src/components/JourneyFunnelChart.tsx` | Fix `hsl(var(--chart-*))` → `var(--chart-*)` |
| `src/index.css` | Add `--chart-1` through `--chart-5` to `.light` block |

