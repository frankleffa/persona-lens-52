export type PresetRange =
  | "LAST_7_DAYS"
  | "LAST_14_DAYS"
  | "LAST_30_DAYS";

export type CustomRange = {
  start: string;
  end: string;
};

export type DateRange = PresetRange | CustomRange;

function formatISO(date: Date): string {
  return date.toISOString().split("T")[0];
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function diffInDays(start: Date, end: Date): number {
  const startUtc = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const endUtc = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  return Math.floor((endUtc - startUtc) / (1000 * 60 * 60 * 24));
}

function resolvePresetRange(range: PresetRange): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date(end);

  switch (range) {
    case "LAST_7_DAYS":
      start.setDate(start.getDate() - 6);
      break;
    case "LAST_14_DAYS":
      start.setDate(start.getDate() - 13);
      break;
    case "LAST_30_DAYS":
      start.setDate(start.getDate() - 29);
      break;
    default: {
      const exhaustive: never = range;
      throw new Error(`Unsupported preset range: ${exhaustive}`);
    }
  }

  return { start, end };
}

function normalizeRange(range: DateRange): { start: Date; end: Date } {
  if (typeof range === "string") {
    return resolvePresetRange(range);
  }

  const start = new Date(range.start);
  const end = new Date(range.end);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("Invalid custom range: start/end must be valid dates");
  }

  if (start > end) {
    throw new Error("Invalid custom range: start must be before or equal to end");
  }

  return { start, end };
}

export function getComparisonPeriods(range: DateRange): {
  current: { start: string; end: string };
  previous: { start: string; end: string };
} {
  const currentRange = normalizeRange(range);
  const duration = diffInDays(currentRange.start, currentRange.end) + 1;

  const previousEnd = addDays(currentRange.start, -1);
  const previousStart = addDays(previousEnd, -(duration - 1));

  return {
    current: {
      start: formatISO(currentRange.start),
      end: formatISO(currentRange.end),
    },
    previous: {
      start: formatISO(previousStart),
      end: formatISO(previousEnd),
    },
  };
}
