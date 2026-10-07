"use client";

const UNITS: [number, Intl.RelativeTimeFormatUnit][] = [
  [60, "second"],
  [60, "minute"],
  [24, "hour"],
  [7, "day"],
  [4.35, "week"],
  [12, "month"],
  [Infinity, "year"],
];
const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto", style: "short" });

export function timeAgo(iso: string, now = Date.now()) {
  let v = (new Date(iso).getTime() - now) / 1000;
  for (const [step, unit] of UNITS) {
    if (Math.abs(v) < step) return unit === "second" ? "just now" : rtf.format(Math.round(v), unit);
    v /= step;
  }
  return "";
}

export function TimeAgo({ iso, className }: { iso: string; className?: string }) {
  return (
    <time dateTime={iso} title={new Date(iso).toLocaleString("en-GB")} className={className} suppressHydrationWarning>
      {timeAgo(iso)}
    </time>
  );
}
