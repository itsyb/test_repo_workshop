import { prisma } from "@/lib/db";
import { receivedTotals } from "@/lib/ledger";
import { PeopleView } from "@/views/SimpleViews";

export default async function PeoplePage() {
  const [people, totals] = await Promise.all([
    prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true, title: true, team: true, avatarUrl: true },
      orderBy: { name: "asc" },
    }),
    receivedTotals(prisma),
  ]);
  return <PeopleView people={people.map((p) => ({ ...p, received: totals.get(p.id) ?? 0 }))} />;
}
