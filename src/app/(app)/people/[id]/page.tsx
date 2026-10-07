import { notFound } from "next/navigation";
import { feedPage } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { loadFeed } from "@/lib/feed";
import { emptyBalance, isWalletColor } from "@/lib/gems";
import { getBalance } from "@/lib/ledger";
import { ProfileView } from "@/views/ProfileView";

export default async function Profile({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser();
  const { id } = await params;
  const person = await prisma.user.findUnique({ where: { id }, include: { manager: { select: { id: true, name: true } } } });
  if (!person) notFound();
  const isMe = person.id === me.id;

  const [earned, given, balance, orders, feed] = await Promise.all([
    prisma.gemEntry.groupBy({
      by: ["color"],
      where: { userId: id, amount: { gt: 0 }, kind: { notIn: ["REFUND", "ADJUSTMENT"] } },
      _sum: { amount: true },
    }),
    prisma.transfer.count({ where: { fromId: id } }),
    isMe ? getBalance(prisma, id) : null,
    isMe ? prisma.order.findMany({ where: { userId: id }, include: { product: true }, orderBy: { createdAt: "desc" } }) : [],
    loadFeed(prisma, { userId: id }),
  ]);
  const collection = emptyBalance();
  for (const r of earned) if (isWalletColor(r.color)) collection[r.color] = r._sum.amount ?? 0;

  return (
    <ProfileView
      person={person}
      isMe={isMe}
      collection={collection}
      given={given}
      balance={balance}
      orders={orders.map((o) => ({ ...o, createdAt: o.createdAt.toISOString() }))}
      feed={feed}
      load={feedPage}
    />
  );
}
