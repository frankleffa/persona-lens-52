---
name: Timezone-aware date calculations
description: Dashboard dates align with Meta Ad account timezone via Intl.DateTimeFormat
type: feature
---
All date functions in `date-utils.ts` accept an optional `tz?: string` parameter.

- `getBrazilToday(tz?)` uses `Intl.DateTimeFormat` with `timeZone` option to resolve the current date in the ad account's timezone.
- `getDateRange`, `getPreviousDateRange`, `getComparisonDateRange`, `getExpectedDays` all propagate the tz param.
- The timezone is extracted from `meta_timezones` (returned by `fetch-ads-data` edge function) — first value from the map.
- Stored in `accountTimezone` state in `useAdsData` hook; reset on client change.
- If no timezone available (no Meta account), falls back to browser local time.
- A small `Globe` badge in ClientDashboard shows the active timezone (e.g. "America/Noronha").
- Zero external dependencies — uses native `Intl.DateTimeFormat("en-CA", { timeZone })`.
