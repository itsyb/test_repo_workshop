import {
  adminAwardAction,
  adminChallengeStatusAction,
  adminCreateChallengeAction,
  adminOrderAction,
  adminProductAction,
} from "@/app/actions";
import { requireAdmin } from "@/lib/auth";
import { currentSprint } from "@/lib/context";
import { prisma } from "@/lib/db";
import type { GemColor } from "@/lib/gems";
import { getBankBalance } from "@/lib/ledger";
import { AdminView, type AdminData, type OverviewData } from "@/views/AdminView";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireAdmin();
  const tab = (await searchParams).tab ?? "overview";
  const data: Omit<AdminData, "actions" | "peopleNote"> = {
    tab,
    pendingOrders: await prisma.order.count({ where: { status: "PENDING" } }),
  };

  if (tab === "overview") data.overview = await overview();
  if (tab === "orders") {
    const orders = await prisma.order.findMany({
      include: { user: { select: { name: true, email: true } }, product: { select: { name: true, emoji: true } } },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 100,
    });
    data.orders = orders.map((o) => ({ ...o, createdAt: o.createdAt.toISOString() }));
  }
  if (tab === "challenges") {
    const [list, bank] = await Promise.all([
      prisma.challenge.findMany({
        include: { entries: { include: { user: { select: { name: true } } }, orderBy: { createdAt: "asc" } } },
        orderBy: { createdAt: "desc" },
      }),
      getBankBalance(prisma),
    ]);
    data.challenges = {
      bank,
      list: list.map((c) => ({
        ...c,
        entries: c.entries.map((e) => ({ ...e, name: e.user.name, prizeColor: e.prizeColor as GemColor | null })),
      })),
    };
  }
  if (tab === "store") {
    const products = await prisma.product.findMany({ orderBy: [{ active: "desc" }, { sortOrder: "asc" }, { price: "asc" }] });
    data.products = products.map((p) => ({ ...p, emoji: p.emoji ?? "" }));
  }
  if (tab === "people") {
    const users = await prisma.user.findMany({
      include: { manager: { select: { name: true } }, _count: { select: { reports: true } } },
      orderBy: { name: "asc" },
    });
    data.people = users.map((u) => ({ ...u, managerName: u.manager?.name ?? null, reports: u._count.reports }));
  }

  return (
    <AdminView
      {...data}
      actions={{
        order: adminOrderAction,
        challengeStatus: adminChallengeStatusAction,
        createChallenge: adminCreateChallengeAction,
        award: adminAwardAction,
        saveProduct: adminProductAction,
      }}
      peopleNote={
        <>
          Participants are managed directly in the database. Run{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5 text-ink">npm run db:studio</code> and edit the{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5 text-ink">User</code> table (email, name, role, managerId, team, isAdmin,
          active). New people receive gems from the next sprint.
        </>
      }
    />
  );
}

async function overview(): Promise<OverviewData> {
  const sprint = await currentSprint();
  const [bank, participants, recent] = await Promise.all([
    getBankBalance(prisma),
    prisma.user.count({ where: { active: true } }),
    prisma.sprint.findMany({ orderBy: { number: "desc" }, take: 6, include: { bankEntries: { where: { kind: "MISSED" } } } }),
  ]);
  const sprints = recent.map((s) => ({
    ...s,
    closed: !!s.closedAt,
    missed: s.bankEntries.reduce((a, b) => a + b.amount, 0),
  }));
  if (!sprint) return { participants, sprint: null, stats: null, bank, top: [], sprints };

  const [alloc, given, givers, eligible, topRows] = await Promise.all([
    prisma.allocation.aggregate({ where: { sprintId: sprint.id }, _sum: { transparent: true, yellow: true } }),
    prisma.transfer.count({ where: { sprintId: sprint.id } }),
    prisma.transfer.groupBy({ by: ["fromId"], where: { sprintId: sprint.id } }),
    prisma.allocation.count({ where: { sprintId: sprint.id } }),
    prisma.transfer.groupBy({
      by: ["toId"],
      where: { sprintId: sprint.id },
      _count: { _all: true },
      orderBy: { _count: { toId: "desc" } },
      take: 5,
    }),
  ]);
  const users = await prisma.user.findMany({
    where: { id: { in: topRows.map((t) => t.toId) } },
    select: { id: true, name: true, avatarUrl: true },
  });
  return {
    participants,
    sprint,
    bank,
    sprints,
    stats: {
      allocated: (alloc._sum.transparent ?? 0) + (alloc._sum.yellow ?? 0),
      given,
      givers: givers.length,
      eligible,
    },
    top: topRows.map((t) => ({ ...users.find((u) => u.id === t.toId)!, n: t._count._all })),
  };
}
