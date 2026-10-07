import type { Sprint } from "@prisma/client";
import type { Db, Tx } from "./db";
import { TRANSPARENT_PER_SPRINT, YELLOW_GIVER_ROLES } from "./gems";
import { sprintNumberAt, sprintWindow } from "./time";

/**
 * Brings sprint state in line with the calendar. Called lazily on page loads,
 * so no cron is needed:
 *  - closes every sprint whose end has passed (unused quota → SFP Bank,
 *    sprint-1 sign-up bonus);
 *  - opens the current sprint and hands out allocations to every active
 *    participant that exists at that moment. People added later in the
 *    sprint start receiving gems from the next one.
 * Returns the current open sprint, or null before the program starts.
 */
export async function syncSprints(db: Db, now = new Date()): Promise<Sprint | null> {
  const expired = await db.sprint.findMany({
    where: { closedAt: null, endsAt: { lte: now } },
    orderBy: { number: "asc" },
  });
  for (const s of expired) await closeSprint(db, s.id, now);

  const n = sprintNumberAt(now);
  if (n === 0) return null;

  const existing = await db.sprint.findUnique({ where: { number: n } });
  if (existing) return existing;

  const w = sprintWindow(n);
  try {
    return await db.$transaction(async (tx) => {
      const sprint = await tx.sprint.create({
        data: { number: n, startsAt: w.startsAt, endsAt: w.endsAt },
      });
      await allocate(tx, sprint.id);
      return sprint;
    });
  } catch (e) {
    // Another request opened it concurrently.
    if ((e as { code?: string }).code === "P2002") {
      return db.sprint.findUnique({ where: { number: n } });
    }
    throw e;
  }
}

async function allocate(tx: Tx, sprintId: string) {
  const users = await tx.user.findMany({
    where: { active: true },
    select: { id: true, role: true, _count: { select: { reports: { where: { active: true } } } } },
  });
  await tx.allocation.createMany({
    data: users.map((u) => ({
      sprintId,
      userId: u.id,
      transparent: TRANSPARENT_PER_SPRINT,
      yellow: YELLOW_GIVER_ROLES.includes(u.role) ? u._count.reports : 0,
    })),
  });
}

export async function closeSprint(db: Db, sprintId: string, now = new Date()) {
  await db.$transaction(async (tx) => {
    // Claim the close so concurrent requests don't burn twice.
    const claimed = await tx.sprint.updateMany({
      where: { id: sprintId, closedAt: null },
      data: { closedAt: now },
    });
    if (claimed.count === 0) return;

    const sprint = await tx.sprint.findUniqueOrThrow({ where: { id: sprintId } });
    const allocations = await tx.allocation.findMany({ where: { sprintId } });
    const used = await tx.transfer.groupBy({
      by: ["fromId", "source"],
      where: { sprintId },
      _count: { _all: true },
    });
    const usedOf = (userId: string, source: string) =>
      used.find((u) => u.fromId === userId && u.source === source)?._count._all ?? 0;

    let missedTransparent = 0;
    let missedYellow = 0;
    const perfect: string[] = [];
    for (const a of allocations) {
      const t = Math.max(0, a.transparent - usedOf(a.userId, "TRANSPARENT"));
      const y = Math.max(0, a.yellow - usedOf(a.userId, "YELLOW"));
      missedTransparent += t;
      missedYellow += y;
      if (t === 0 && y === 0 && a.transparent + a.yellow > 0) perfect.push(a.userId);
    }

    const note = `Missed Opportunities · Sprint ${sprint.number}`;
    if (missedTransparent > 0) {
      await tx.bankEntry.create({
        data: { sprintId, color: "TRANSPARENT", amount: missedTransparent, kind: "MISSED", note },
      });
    }
    if (missedYellow > 0) {
      await tx.bankEntry.create({
        data: { sprintId, color: "YELLOW", amount: missedYellow, kind: "MISSED", note },
      });
    }

    // Sign-up bonus: +1 Purple for distributing every gem in the first sprint.
    if (sprint.number === 1 && perfect.length > 0) {
      await tx.gemEntry.createMany({
        data: perfect.map((userId) => ({
          userId,
          color: "PURPLE",
          amount: 1,
          kind: "SIGNUP_BONUS",
          refId: sprintId,
          note: "Sign-up bonus: every gem shared in the first sprint",
        })),
      });
    }
  });
}

export type Quota = {
  transparentLeft: number;
  transparentTotal: number;
  yellowLeft: number;
  yellowTotal: number;
  /** Recipients already given a Transparent-sourced gem by this user. */
  thankedIds: string[];
  /** Direct reports still waiting for their Yellow gem this sprint. */
  yellowPendingIds: string[];
};

export async function getQuota(db: Db | Tx, sprintId: string, userId: string): Promise<Quota> {
  const [alloc, sent, reports, yellowGiven] = await Promise.all([
    db.allocation.findUnique({ where: { sprintId_userId: { sprintId, userId } } }),
    db.transfer.findMany({ where: { sprintId, fromId: userId }, select: { toId: true, source: true } }),
    db.user.findMany({ where: { managerId: userId, active: true }, select: { id: true } }),
    db.transfer.findMany({
      where: { sprintId, source: "YELLOW", to: { managerId: userId } },
      select: { toId: true },
    }),
  ]);
  const tUsed = sent.filter((s) => s.source === "TRANSPARENT");
  const yUsed = sent.filter((s) => s.source === "YELLOW");
  const yellowTotal = alloc?.yellow ?? 0;
  const yellowLeft = Math.max(0, yellowTotal - yUsed.length);
  const got = new Set(yellowGiven.map((t) => t.toId));
  return {
    transparentTotal: alloc?.transparent ?? 0,
    transparentLeft: Math.max(0, (alloc?.transparent ?? 0) - tUsed.length),
    yellowTotal,
    yellowLeft,
    thankedIds: tUsed.map((s) => s.toId),
    yellowPendingIds: yellowLeft > 0 ? reports.map((r) => r.id).filter((id) => !got.has(id)) : [],
  };
}
