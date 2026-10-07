import { requireUser } from "@/lib/auth";
import { quotaFor } from "@/lib/context";
import { prisma } from "@/lib/db";
import { GiveFlow } from "./GiveFlow";

export default async function GivePage({ searchParams }: { searchParams: Promise<{ to?: string; type?: string }> }) {
  const user = await requireUser();
  const { sprint, quota } = await quotaFor(user.id);
  const people = await prisma.user.findMany({
    where: { active: true, id: { not: user.id } },
    select: { id: true, name: true, title: true, team: true, avatarUrl: true, managerId: true },
    orderBy: { name: "asc" },
  });
  const params = await searchParams;
  const thanked = new Set(quota?.thankedIds ?? []);
  const pendingYellow = new Set(quota?.yellowPendingIds ?? []);

  return (
    <GiveFlow
      sprintOpen={!!sprint}
      transparentLeft={quota?.transparentLeft ?? 0}
      transparentTotal={quota?.transparentTotal ?? 0}
      yellowLeft={quota?.yellowLeft ?? 0}
      yellowTotal={quota?.yellowTotal ?? 0}
      people={people.map((p) => ({
        id: p.id,
        name: p.name,
        subtitle: [p.title, p.team].filter(Boolean).join(" · "),
        avatarUrl: p.avatarUrl,
        thanked: thanked.has(p.id),
        isReport: p.managerId === user.id,
        yellowPending: pendingYellow.has(p.id),
      }))}
      initialTo={params.to}
      initialSource={params.type === "YELLOW" ? "YELLOW" : undefined}
    />
  );
}
