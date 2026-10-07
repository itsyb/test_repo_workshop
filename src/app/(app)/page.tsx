import { requireUser } from "@/lib/auth";
import { quotaFor } from "@/lib/context";
import { prisma } from "@/lib/db";
import { loadFeed } from "@/lib/feed";
import { getBalance } from "@/lib/ledger";
import { programStartsAt } from "@/lib/time";
import { HomeView } from "@/views/HomeView";

export default async function Home() {
  const user = await requireUser();
  const [{ sprint, quota }, balance, feed, challenges] = await Promise.all([
    quotaFor(user.id),
    getBalance(prisma, user.id),
    loadFeed(prisma, { take: 3 }),
    prisma.challenge.findMany({ where: { status: "ACTIVE" }, orderBy: { startsAt: "desc" } }),
  ]);
  const pending = quota?.yellowPendingIds.length
    ? await prisma.user.findMany({ where: { id: { in: quota.yellowPendingIds } }, select: { id: true, name: true, avatarUrl: true } })
    : [];
  return (
    <HomeView
      name={user.name}
      sprint={sprint}
      programStartsAt={programStartsAt()}
      quota={quota}
      pending={pending}
      balance={balance}
      feed={feed.items}
      challenges={challenges}
    />
  );
}
