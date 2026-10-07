import type { Db } from "./db";

export type FeedFilter = { color?: string; userId?: string; cursor?: string; take?: number };

export type FeedItem = {
  id: string;
  kind: "TRANSFER" | "PRIZE";
  color: string;
  amount: number;
  comment: string;
  createdAt: string;
  from: { id: string; name: string; avatarUrl: string | null } | null;
  to: { id: string; name: string; avatarUrl: string | null };
  challenge?: string;
};

const person = { select: { id: true, name: true, avatarUrl: true } } as const;

/**
 * Public newsfeed: every gem transfer plus challenge prizes, newest first.
 * The cursor is the ISO timestamp of the last item shown.
 */
export async function loadFeed(db: Db, { color, userId, cursor, take = 20 }: FeedFilter) {
  const before = cursor ? { lt: new Date(cursor) } : undefined;
  const [transfers, prizes] = await Promise.all([
    db.transfer.findMany({
      where: {
        ...(color ? { color } : {}),
        ...(userId ? { OR: [{ fromId: userId }, { toId: userId }] } : {}),
        ...(before ? { createdAt: before } : {}),
      },
      include: { from: person, to: person },
      orderBy: { createdAt: "desc" },
      take,
    }),
    db.gemEntry.findMany({
      where: {
        kind: "CHALLENGE_PRIZE",
        ...(color ? { color } : {}),
        ...(userId ? { userId } : {}),
        ...(before ? { createdAt: before } : {}),
      },
      include: { user: person },
      orderBy: { createdAt: "desc" },
      take,
    }),
  ]);

  const items: FeedItem[] = [
    ...transfers.map((t) => ({
      id: t.id,
      kind: "TRANSFER" as const,
      color: t.color,
      amount: 1,
      comment: t.comment,
      createdAt: t.createdAt.toISOString(),
      from: t.from,
      to: t.to,
    })),
    ...prizes.map((p) => ({
      id: p.id,
      kind: "PRIZE" as const,
      color: p.color,
      amount: p.amount,
      comment: p.note ?? "",
      createdAt: p.createdAt.toISOString(),
      from: null,
      to: p.user,
      challenge: p.note ?? undefined,
    })),
  ]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, take);

  return { items, nextCursor: items.length === take ? items[items.length - 1]!.createdAt : null };
}
