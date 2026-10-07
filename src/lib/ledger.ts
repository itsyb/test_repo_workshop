import type { Db, Tx } from "./db";
import { BANK_COLORS, emptyBalance, isWalletColor, type Balance } from "./gems";

export async function getBalance(db: Db | Tx, userId: string): Promise<Balance> {
  const rows = await db.gemEntry.groupBy({ by: ["color"], where: { userId }, _sum: { amount: true } });
  const b = emptyBalance();
  for (const r of rows) if (isWalletColor(r.color)) b[r.color] = r._sum.amount ?? 0;
  return b;
}

export async function getBankBalance(db: Db | Tx) {
  const rows = await db.bankEntry.groupBy({ by: ["color"], _sum: { amount: true } });
  const b = Object.fromEntries(BANK_COLORS.map((c) => [c, 0])) as Record<(typeof BANK_COLORS)[number], number>;
  for (const r of rows) if (r.color in b) b[r.color as keyof typeof b] = r._sum.amount ?? 0;
  return b;
}

/** Lifetime gems received per user, for leaderboards and people cards. */
export async function receivedTotals(db: Db | Tx, since?: Date) {
  const rows = await db.gemEntry.groupBy({
    by: ["userId"],
    where: { amount: { gt: 0 }, kind: { not: "REFUND" }, ...(since ? { createdAt: { gte: since } } : {}) },
    _sum: { amount: true },
  });
  return new Map(rows.map((r) => [r.userId, r._sum.amount ?? 0]));
}
