// Sprint calendar. Sprints run Monday 00:00 → Sunday 23:59:59 (two weeks) in
// the program time zone, starting from PROGRAM_START. DST is handled by
// resolving local midnights through Intl rather than fixed offsets.

export const PROGRAM_TZ = process.env.PROGRAM_TZ || "Europe/Kyiv";
export const PROGRAM_START = process.env.PROGRAM_START || "2026-10-12";
export const SPRINT_DAYS = 14;

const DAY_MS = 86_400_000;

type YMD = { y: number; m: number; d: number };

function parseYmd(s: string): YMD {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!match) throw new Error(`Invalid date "${s}", expected YYYY-MM-DD`);
  return { y: +match[1], m: +match[2], d: +match[3] };
}

/** Offset (ms) of `tz` from UTC at the given instant. */
function tzOffset(at: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

/** The UTC instant of local midnight on the given calendar date in `tz`. */
export function localMidnight({ y, m, d }: YMD, tz = PROGRAM_TZ): Date {
  const guess = Date.UTC(y, m - 1, d);
  let instant = guess - tzOffset(new Date(guess), tz);
  // Re-check once: the offset can differ across a DST boundary.
  instant = guess - tzOffset(new Date(instant), tz);
  return new Date(instant);
}

/** Calendar date of an instant in `tz`. */
export function localDate(at: Date, tz = PROGRAM_TZ): YMD {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  return { y: get("year"), m: get("month"), d: get("day") };
}

function addDays({ y, m, d }: YMD, days: number): YMD {
  const t = new Date(Date.UTC(y, m - 1, d) + days * DAY_MS);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

function dayIndex({ y, m, d }: YMD): number {
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
}

export type SprintWindow = { number: number; startsAt: Date; endsAt: Date };

/** Start/end of sprint `n` (1-based). `endsAt` is exclusive. */
export function sprintWindow(n: number, start = PROGRAM_START, tz = PROGRAM_TZ): SprintWindow {
  const first = parseYmd(start);
  return {
    number: n,
    startsAt: localMidnight(addDays(first, (n - 1) * SPRINT_DAYS), tz),
    endsAt: localMidnight(addDays(first, n * SPRINT_DAYS), tz),
  };
}

/** Sprint number running at `now`, or 0 before the program starts. */
export function sprintNumberAt(now: Date, start = PROGRAM_START, tz = PROGRAM_TZ): number {
  const days = dayIndex(localDate(now, tz)) - dayIndex(parseYmd(start));
  if (days < 0) return 0;
  return Math.floor(days / SPRINT_DAYS) + 1;
}

export function programStartsAt(start = PROGRAM_START, tz = PROGRAM_TZ): Date {
  return localMidnight(parseYmd(start), tz);
}
