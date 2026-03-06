

## Campaigns Table + Meta Ads Badge Fix

### 1. CampaignTable.tsx — Cleaner rows

**Line 132**: Change header border from `border-b border-border` to `border-b` with inline style `borderBottom: '1px solid rgba(255,255,255,0.08)'`

**Line 151**: Replace row className:
- Remove `border-b border-border/30 last:border-0`
- Remove `[&:nth-child(even)>td]:bg-[rgba(255,255,255,0.015)]`
- Add `last:border-0 hover:bg-[rgba(255,92,58,0.04)] transition-colors [&:not(:last-child)>td]:border-b [&:not(:last-child)>td]:border-[rgba(255,255,255,0.04)]`

**Lines 163-164**: Replace Meta Ads purple badge with coral:
- `bg-chart-purple/15 text-chart-purple` → `bg-[rgba(255,92,58,0.12)] text-[#FF5C3A]`

### 2. index.css — Change `--chart-purple` variable

**Line 54**: `--chart-purple: #8B5CF6` → `--chart-purple: #FF5C3A`

This single CSS variable change fixes all other `chart-purple` references across the app (Connections.tsx, ClientDashboard.tsx, ClientAccountConfig.tsx, AgencyControl.tsx, AgencyControlCenter.tsx) without touching those files.

### 3. Files touched
- `src/components/CampaignTable.tsx` (row styles + inline badge)
- `src/index.css` (one variable)

