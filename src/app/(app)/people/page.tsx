import { PeopleGrid } from "./PeopleGrid";
import { SplitHeadline } from "@/components/motion";
import { prisma } from "@/lib/db";
import { receivedTotals } from "@/lib/ledger";

export default async function PeoplePage() {
  const [people, totals] = await Promise.all([
    prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true, title: true, team: true, avatarUrl: true },
      orderBy: { name: "asc" },
    }),
    receivedTotals(prisma),
  ]);
  return (
    <div>
      <p className="eyebrow mb-3">People</p>
      <SplitHeadline text="The team behind the gems." className="display mb-10 text-5xl sm:text-6xl" />
      <PeopleGrid people={people.map((p) => ({ ...p, received: totals.get(p.id) ?? 0 }))} />
    </div>
  );
}
