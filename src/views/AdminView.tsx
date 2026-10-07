import Link from "next/link";
import { ChallengeAdmin, NewChallenge, OrderActions, ProductEditor, type AdminActions, type ProductInput } from "@/components/AdminPanels";
import { Avatar } from "@/components/Avatar";
import { Gem } from "@/components/Gem";
import { CountUp, Reveal, Spotlight, Stagger, StaggerItem } from "@/components/motion";
import { TimeAgo } from "@/components/TimeAgo";
import { formatDay, lastMoment } from "@/lib/format";
import { BANK_COLORS, GEM_META, type GemColor } from "@/lib/gems";

export const ADMIN_TABS = [
  ["overview", "Overview"],
  ["orders", "Orders"],
  ["challenges", "Challenges"],
  ["store", "Store"],
  ["people", "People"],
] as const;

export type Bank = Record<(typeof BANK_COLORS)[number], number>;

export type OverviewData = {
  participants: number;
  sprint: { number: number; endsAt: Date } | null;
  stats: { allocated: number; given: number; givers: number; eligible: number } | null;
  bank: Bank;
  top: { id: string; name: string; avatarUrl: string | null; n: number }[];
  sprints: { id: string; number: number; startsAt: Date; endsAt: Date; closed: boolean; missed: number }[];
};

export type AdminOrder = {
  id: string;
  status: string;
  price: number;
  note: string | null;
  createdAt: string;
  product: { name: string; emoji: string | null };
  user: { name: string; email: string };
};

export type AdminChallenge = {
  id: string;
  title: string;
  description: string;
  emoji: string | null;
  status: string;
  entries: { id: string; name: string; text: string; link: string | null; prizeAmount: number | null; prizeColor: GemColor | null }[];
};

export type AdminPerson = {
  id: string;
  name: string;
  email: string;
  role: string;
  isAdmin: boolean;
  active: boolean;
  team: string | null;
  managerName: string | null;
  reports: number;
};

export type AdminData = {
  tab: string;
  pendingOrders: number;
  overview?: OverviewData;
  orders?: AdminOrder[];
  challenges?: { list: AdminChallenge[]; bank: Bank };
  products?: ProductInput[];
  people?: AdminPerson[];
  /** Where participants are managed — differs between the server app and the demo. */
  peopleNote: React.ReactNode;
  actions: AdminActions;
};

export function AdminView(d: AdminData) {
  return (
    <div>
      <p className="eyebrow mb-3">Admin</p>
      <h1 className="display mb-8 text-5xl">Program control</h1>
      <nav className="no-scrollbar -mx-4 mb-10 flex gap-2 overflow-x-auto px-4">
        {ADMIN_TABS.map(([key, label]) => (
          <Link key={key} href={`/admin?tab=${key}`} className="chip shrink-0" data-active={d.tab === key}>
            {label}
            {key === "orders" && d.pendingOrders > 0 && (
              <span className="rounded-full bg-amber-400 px-1.5 text-[11px] font-bold text-black">{d.pendingOrders}</span>
            )}
          </Link>
        ))}
      </nav>
      {d.tab === "overview" && d.overview && <Overview {...d.overview} />}
      {d.tab === "orders" && d.orders && <Orders orders={d.orders} act={d.actions.order} />}
      {d.tab === "challenges" && d.challenges && <Challenges {...d.challenges} actions={d.actions} />}
      {d.tab === "store" && d.products && <Store products={d.products} save={d.actions.saveProduct} />}
      {d.tab === "people" && d.people && <People people={d.people} note={d.peopleNote} />}
    </div>
  );
}

function Overview({ participants, sprint, stats, bank, top, sprints }: OverviewData) {
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
            {sprints.map((s) => (
              <div key={s.id} className="flex items-center gap-3 p-4 text-sm">
                <span className="font-semibold">Sprint {s.number}</span>
                <span className="flex-1 text-ink-3">
                  {formatDay(s.startsAt)} – {formatDay(lastMoment(s.endsAt))}
                </span>
                {s.closed ? (
                  <span className="text-ink-2">{s.missed} missed</span>
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

function Orders({ orders, act }: { orders: AdminOrder[]; act: AdminActions["order"] }) {
  const pending = orders.filter((o) => o.status === "PENDING");
  const done = orders.filter((o) => o.status !== "PENDING");
  const row = (o: AdminOrder) => (
    <div key={o.id} className="flex flex-wrap items-center gap-4 p-5">
      <span className="text-2xl">{o.product.emoji ?? "🎁"}</span>
      <div className="min-w-0 flex-1">
        <div className="font-medium">{o.product.name}</div>
        <div className="text-sm text-ink-3">
          {o.user.name} · {o.user.email} · {o.price} gems · <TimeAgo iso={o.createdAt} />
        </div>
        {o.note && <div className="text-sm text-ink-2">Note: {o.note}</div>}
      </div>
      {o.status === "PENDING" ? (
        <OrderActions id={o.id} act={act} />
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

function Challenges({ list, bank, actions }: { list: AdminChallenge[]; bank: Bank; actions: AdminActions }) {
  const order: Record<string, number> = { ACTIVE: 0, DRAFT: 1, CLOSED: 2 };
  const sorted = [...list].sort((a, b) => (order[a.status] ?? 3) - (order[b.status] ?? 3));
  return (
    <div className="space-y-6">
      <NewChallenge create={actions.createChallenge} />
      <p className="text-sm text-ink-3">Bank: {BANK_COLORS.map((c) => `${GEM_META[c].name} ${bank[c]}`).join(" · ")}</p>
      {sorted.map((c) => (
        <ChallengeAdmin
          key={c.id}
          challenge={{ id: c.id, title: c.title, description: c.description, emoji: c.emoji, status: c.status }}
          entries={c.entries}
          bank={bank}
          setStatus={actions.challengeStatus}
          award={actions.award}
        />
      ))}
    </div>
  );
}

function Store({ products, save }: { products: ProductInput[]; save: AdminActions["saveProduct"] }) {
  return (
    <div className="space-y-4">
      <ProductEditor save={save} />
      {products.map((p) => (
        <ProductEditor key={p.id} product={p} save={save} />
      ))}
    </div>
  );
}

function People({ people, note }: { people: AdminPerson[]; note: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="card p-5 text-sm leading-relaxed text-ink-2">{note}</div>
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
            {people.map((u) => (
              <tr key={u.id} className="border-b border-white/5 last:border-0">
                <td className="p-4">
                  <div className="font-medium">{u.name}</div>
                  <div className="text-ink-3">{u.email}</div>
                </td>
                <td className="p-4">
                  {u.role}
                  {u.isAdmin && <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs">admin</span>}
                </td>
                <td className="p-4 text-ink-2">{u.managerName ?? "—"}</td>
                <td className="p-4 text-ink-2">{u.team ?? "—"}</td>
                <td className="p-4 tabular-nums">{u.reports}</td>
                <td className="p-4">{u.active ? "Active" : <span className="text-ink-3">Inactive</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
