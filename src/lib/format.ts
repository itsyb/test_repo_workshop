import { PROGRAM_TZ } from "./time";

export function formatDay(d: Date, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: PROGRAM_TZ, ...opts }).format(d);
}

export function greeting(now = new Date()) {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: PROGRAM_TZ, hour: "numeric", hourCycle: "h23" }).format(now));
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** Last instant of a sprint for display ("Sunday 23:59"). */
export const lastMoment = (endsAt: Date) => new Date(endsAt.getTime() - 60_000);
