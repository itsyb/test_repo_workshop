import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { Gem } from "@/components/Gem";
import { CountUp, Reveal, Spotlight, Stagger, StaggerItem } from "@/components/motion";
import { TimeAgo } from "@/components/TimeAgo";
import { requireAdmin } from "@/lib/auth";
import { currentSprint, formatDay, lastMoment } from "@/lib/context";
import { prisma } from "@/lib/db";
import { BANK_COLORS, GEM_META, type GemColor } from "@/lib/gems";
import { getBankBalance } from "@/lib/ledger";
import { ChallengeAdmin, NewChallenge, OrderActions, ProductEditor } from "./AdminPanels";

const TABS = [
  ["overview", "Overview"],
  ["orders", "Orders"],
  ["challenges", "Challenges"],
  ["store", "Store"],
  ["people", "People"],
] as const;

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireAdmin();
  const tab = (await searchParams).tab ?? "overview";
  const pendingOrders = await prisma.order.count({ where: { status: "PENDING" } });

  return (
    <div>
      <p className="eyebrow mb-3">Admin</p>
      <h1 className="display mb-8 text-5xl">Program control</h1>
      <nav className="no-scrollbar -mx-4 mb-10 flex gap-2 overflow-x-auto px-4">
        {TABS.map(([key, label]) => (
          <Link key={key} href={`/admin?tab=${key}`} className="chip shrink-0" data-active={tab === key}>
            {label}
            {key === "orders" && pendingOrders > 0 && (
              <span className="rounded-full bg-amber-400 px-1.5 text-[11px] font-bold text-black">{pendingOrders}</span>
            )}
          </Link>
        ))}
      </nav>
      {tab === "overview" && <Overview />}
      {tab === "orders" && <Orders />}
      {tab === "challenges" && <Challenges />}
      {tab === "store" && <Store />}
      {tab === "people" && <People />}
    </div>
  );
}

async function Overview() {
  const sprint = await currentSprint();
  const [bank, participants, recentSprints] = await Promise.all([
    getBankBalance(prisma),
    prisma.user.count({ where: { active: true } }),
    prisma.sprint.findMany({ orderBy: { number: "desc" }, take: 6, include: { bankEntries: { where: { kind: "MISSED" } } } }),
  ]);
  let stats: { allocated: number; given: number; givers: number; eligible: number } | null = null;
  let top: { name: string; id: string; avatarUrl: string | null; n: number }[] = [];
  if (sprint) {
    const [alloc, given, givers, eligible, topRows] = await Promise.all([
      prisma.allocation.aggregate({ where: { sprintId: sprint.id }, _sum: { transparent: true, yellow: true } }),
      prisma.transfer.count({ where: { sprintId: sprint.id } }),
      prisma.transfer.groupBy({ by: ["fromId"], where: { sprintId: sprint.id } }),
      prisma.allocation.count({ where: { sprintId: sprint.id } }),
      prisma.transfer.groupBy({ by: ["toId"], where: { sprintId: sprint.id }, _count: { _all: true }, orderBy: { _count: { toId: "desc" } }, take: 5 }),
    ]);
    stats = {
      allocated: (alloc._sum.transparent ?? 0) + (alloc._sum.yellow ?? 0),
      given,
      givers: givers.length,
      eligible,
    };
    const users = await prisma.user.findMany({ where: { id: { in: topRows.map((t) => t.toId) } }, select: { id: true, name: true, avatarUrl: true } });
    top = topRows.map((t) => ({ ...users.find((u) => u.id === t.toId)!, n: t._count._all }));
  }

  return (
    <div className="space-y-10">
      <Stagger className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Participants" value={participants} />
        <Stat label={sprint ? `Sprint ${sprint.number} · gems given` : "No active sprint"} value={stats?.given ?? 0} suffix={stats ? ` / ${stats.allocated}` : ""} />
        <Stat label="People who gave" value={stats?.givers ?? 0} suffix={stats ? ` / ${stats.eligible}` : ""} />
        <Stat label="Sprint ends" text={sprint ? formatDay(lastMoment(sprint.endsAt), { weekday: "short", day: "numeric", month: "short" }) : "—"} />
      </Stagger>

      <Reveal>
        <h2 className="mb-4 text-xl font-semibold">SFP Bank · Missed Opportunities</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {BANK_COLORS.map((c) => (
            <div key={c} className="card flex items-center gap-3 p-5">
              <Gem color={c} size={32} glow={bank[c] > 0} dim={bank[c] === 0} />
              <div>
                <div className="display text-2xl tabular-nums">{bank[c]}</div>
                <div className="text-xs text-ink-3">{GEM_META[c].name}</div>
              </div>
            </div>
          ))}
        </div>
      </Reveal>

      <div className="grid gap-6 lg:grid-cols-2">
        <Reveal>
          <h2 className="mb-4 text-xl font-semibold">Most recognised this sprint</h2>
          <div className="card divide-y divide-white/5">
            {top.length === 0 && <p className="p-5 text-ink-3">No gems yet.</p>}
            {top.map((t, i) => (
              <div key={t.id} className="flex items-center gap-3 p-4">
                <span className="w-5 text-sm text-ink-3">{i + 1}</span>
                <Avatar name={t.name} src={t.avatarUrl} size={32} />
                <span className="flex-1">{t.name}</span>
                <span className="font-semibold tabular-nums">{t.n}</span>
              </div>
            ))}
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <h2 className="mb-4 text-xl font-semibold">Sprints</h2>
          <div className="card divide-y divide-white/5">
            {recentSprints.map((s) => (
              <div key={s.id} className="flex items-center gap-3 p-4 text-sm">
                <span className="font-semibold">Sprint {s.number}</span>
                <span className="flex-1 text-ink-3">
                  {formatDay(s.startsAt)} – {formatDay(lastMoment(s.endsAt))}
                </span>
                {s.closedAt ? (
                  <span className="text-ink-2">{s.bankEntries.reduce((a, b) => a + b.amount, 0)} missed</span>
                ) : (
                  <span className="rounded-full bg-emerald-400/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">Live</span>
                )}
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </div>
  );
}

function Stat({ label, value, suffix, text }: { label: string; value?: number; suffix?: string; text?: string }) {
  return (
    <StaggerItem>
      <Spotlight className="p-6">
        <div className="display text-4xl tabular-nums">
          {text ?? <CountUp value={value ?? 0} />}
          {suffix && <span className="text-xl text-ink-3">{suffix}</span>}
        </div>
        <div className="mt-2 text-sm text-ink-3">{label}</div>
      </Spotlight>
    </StaggerItem>
  );
}

async function Orders() {
  const orders = await prisma.order.findMany({
    include: { user: { select: { name: true, email: true, avatarUrl: true } }, product: true },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
  });
  const pending = orders.filter((o) => o.status === "PENDING");
  const done = orders.filter((o) => o.status !== "PENDING");
  const row = (o: (typeof orders)[number]) => (
    <div key={o.id} className="flex flex-wrap items-center gap-4 p-5">
      <span className="text-2xl">{o.product.emoji ?? "🎁"}</span>
      <div className="min-w-0 flex-1">
        <div className="font-medium">{o.product.name}</div>
        <div className="text-sm text-ink-3">
          {o.user.name} · {o.user.email} · {o.price} gems · <TimeAgo iso={o.createdAt.toISOString()} />
        </div>
        {o.note && <div className="text-sm text-ink-2">Note: {o.note}</div>}
      </div>
      {o.status === "PENDING" ? (
        <OrderActions id={o.id} />
      ) : (
        <span className="text-sm text-ink-2">{o.status === "FULFILLED" ? "Delivered" : "Rejected & refunded"}</span>
      )}
    </div>
  );
  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-4 text-xl font-semibold">Waiting for you</h2>
        <div className="card divide-y divide-white/5">{pending.length ? pending.map(row) : <p className="p-5 text-ink-3">All caught up.</p>}</div>
      </section>
      <section>
        <h2 className="mb-4 text-xl font-semibold">History</h2>
        <div className="card divide-y divide-white/5">{done.length ? done.map(row) : <p className="p-5 text-ink-3">Nothing yet.</p>}</div>
      </section>
    </div>
  );
}

async function Challenges() {
  const [challenges, bank] = await Promise.all([
    prisma.challenge.findMany({
      include: { entries: { include: { user: { select: { name: true } } }, orderBy: { createdAt: "asc" } } },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    }),
    getBankBalance(prisma),
  ]);
  const order = { ACTIVE: 0, DRAFT: 1, CLOSED: 2 } as Record<string, number>;
  challenges.sort((a, b) => (order[a.status] ?? 3) - (order[b.status] ?? 3));
  return (
    <div className="space-y-6">
      <NewChallenge />
      <p className="text-sm text-ink-3">
        Bank: {BANK_COLORS.map((c) => `${GEM_META[c].name} ${bank[c]}`).join(" · ")}
      </p>
      {challenges.map((c) => (
        <ChallengeAdmin
          key={c.id}
          challenge={{ id: c.id, title: c.title, description: c.description, emoji: c.emoji, status: c.status }}
          entries={c.entries.map((e) => ({
            id: e.id,
            name: e.user.name,
            text: e.text,
            link: e.link,
            prizeAmount: e.prizeAmount,
            prizeColor: e.prizeColor as GemColor | null,
          }))}
          bank={bank}
        />
      ))}
    </div>
  );
}

async function Store() {
  const products = await prisma.product.findMany({ orderBy: [{ active: "desc" }, { sortOrder: "asc" }, { price: "asc" }] });
  return (
    <div className="space-y-4">
      <ProductEditor />
      {products.map((p) => (
        <ProductEditor
          key={p.id}
          product={{
            id: p.id,
            name: p.name,
            description: p.description,
            category: p.category,
            price: p.price,
            emoji: p.emoji ?? "",
            stock: p.stock,
            active: p.active,
          }}
        />
      ))}
    </div>
  );
}

async function People() {
  const users = await prisma.user.findMany({ include: { manager: { select: { name: true } }, _count: { select: { reports: true } } }, orderBy: { name: "asc" } });
  return (
    <div className="space-y-4">
      <div className="card p-5 text-sm leading-relaxed text-ink-2">
        Participants are managed directly in the database. Run <code className="rounded bg-white/10 px-1.5 py-0.5 text-ink">npm run db:studio</code>{" "}
        and edit the <code className="rounded bg-white/10 px-1.5 py-0.5 text-ink">User</code> table (email, name, role, managerId, team, isAdmin, active).
        New people receive gems from the next sprint.
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-ink-3">
            <tr className="border-b border-white/5">
              <th className="p-4 font-medium">Name</th>
              <th className="p-4 font-medium">Role</th>
              <th className="p-4 font-medium">Reports to</th>
              <th className="p-4 font-medium">Team</th>
              <th className="p-4 font-medium">Direct reports</th>
              <th className="p-4 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-white/5 last:border-0">
                <td className="p-4">
                  <div className="font-medium">{u.name}</div>
                  <div className="text-ink-3">{u.email}</div>
                </td>
                <td className="p-4">
                  {u.role}
                  {u.isAdmin && <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs">admin</span>}
                </td>
                <td className="p-4 text-ink-2">{u.manager?.name ?? "—"}</td>
                <td className="p-4 text-ink-2">{u.team ?? "—"}</td>
                <td className="p-4 tabular-nums">{u._count.reports}</td>
                <td className="p-4">{u.active ? "Active" : <span className="text-ink-3">Inactive</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
