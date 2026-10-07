import { test } from "node:test";
import assert from "node:assert/strict";
import { sprintNumberAt, sprintWindow } from "../src/lib/time";

test("sprint 1 runs Monday 12 Oct 00:00 → Sunday 25 Oct 23:59 Kyiv, across the DST switch", () => {
  const w = sprintWindow(1, "2026-10-12", "Europe/Kyiv");
  assert.equal(w.startsAt.toISOString(), "2026-10-11T21:00:00.000Z"); // UTC+3
  assert.equal(w.endsAt.toISOString(), "2026-10-25T22:00:00.000Z"); // UTC+2 after DST ends
  const w2 = sprintWindow(2, "2026-10-12", "Europe/Kyiv");
  assert.equal(w2.startsAt.toISOString(), w.endsAt.toISOString());
});

test("sprintNumberAt follows Kyiv calendar days", () => {
  const n = (iso: string) => sprintNumberAt(new Date(iso), "2026-10-12", "Europe/Kyiv");
  assert.equal(n("2026-10-07T08:00:00Z"), 0);
  assert.equal(n("2026-10-11T20:59:59Z"), 0); // Sunday 23:59:59 Kyiv
  assert.equal(n("2026-10-11T21:00:00Z"), 1); // Monday 00:00 Kyiv
  assert.equal(n("2026-10-25T21:59:59Z"), 1); // last second of sprint 1
  assert.equal(n("2026-10-25T22:00:00Z"), 2);
  assert.equal(n("2026-11-08T22:00:00Z"), 3);
});
