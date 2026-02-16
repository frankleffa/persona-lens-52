import { subDays, differenceInDays, format, parseISO } from "date-fns";

export type PresetRange = "LAST_7_DAYS" | "LAST_14_DAYS" | "LAST_30_DAYS";
export type CustomRange = { start: string; end: string };
export type DateRange = PresetRange | CustomRange;

const PRESET_DAYS: Record<PresetRange, number> = {
  LAST_7_DAYS: 7,
  LAST_14_DAYS: 14,
  LAST_30_DAYS: 30,
};

function isPreset(range: DateRange): range is PresetRange {
  return typeof range === "string";
}

export function getComparisonPeriods(range: DateRange): {
  current: { start: string; end: string };
  previous: { start: string; end: string };
} {
  const today = new Date();
  const fmt = (d: Date) => format(d, "yyyy-MM-dd");

  if (isPreset(range)) {
    const days = PRESET_DAYS[range];
    const currentEnd = subDays(today, 1);
    const currentStart = subDays(currentEnd, days - 1);
    const previousEnd = subDays(currentStart, 1);
    const previousStart = subDays(previousEnd, days - 1);

    return {
      current: { start: fmt(currentStart), end: fmt(currentEnd) },
      previous: { start: fmt(previousStart), end: fmt(previousEnd) },
    };
  }

  const start = parseISO(range.start);
  const end = parseISO(range.end);
  const days = differenceInDays(end, start) + 1;
  const previousEnd = subDays(start, 1);
  const previousStart = subDays(previousEnd, days - 1);

  return {
    current: { start: fmt(start), end: fmt(end) },
    previous: { start: fmt(previousStart), end: fmt(previousEnd) },
  };
}
