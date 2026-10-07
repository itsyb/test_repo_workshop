import { submitEntryAction } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getBankBalance } from "@/lib/ledger";
import { ChallengesView } from "@/views/ChallengesView";

const entryInclude = {
  entries: { include: { user: { select: { id: true, name: true, avatarUrl: true } } }, orderBy: { createdAt: "asc" as const } },
};

export default async function ChallengesPage() {
  const user = await requireUser();
  const [active, closed, bank] = await Promise.all([
    prisma.challenge.findMany({ where: { status: "ACTIVE" }, include: entryInclude, orderBy: { startsAt: "asc" } }),
    prisma.challenge.findMany({ where: { status: "CLOSED" }, include: entryInclude, orderBy: { endsAt: "desc" }, take: 6 }),
    getBankBalance(prisma),
  ]);
  const pool = Object.values(bank).reduce((a, b) => a + b, 0);
  return <ChallengesView meId={user.id} active={active} closed={closed} pool={pool} submit={submitEntryAction} />;
}
