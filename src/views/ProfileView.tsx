import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { FeedList } from "@/components/FeedList";
import { Gem } from "@/components/Gem";
import { CountUp, Reveal, Spotlight, Stagger, StaggerItem } from "@/components/motion";
import { TimeAgo } from "@/components/TimeAgo";
import type { FeedFilter, FeedItem } from "@/lib/feed";
import { GEM_META, WALLET_COLORS, type Balance } from "@/lib/gems";

const STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Processing", cls: "bg-amber-400/15 text-amber-300" },
  FULFILLED: { label: "Delivered", cls: "bg-emerald-400/15 text-emerald-300" },
  REJECTED: { label: "Refunded", cls: "bg-white/10 text-ink-2" },
};

export type ProfileData = {
  person: {
    id: string;
    name: string;
    title: string | null;
    team: string | null;
    avatarUrl: string | null;
    manager: { id: string; name: string } | null;
  };
  isMe: boolean;
  collection: Balance;
  given: number;
  balance: Balance | null;
  orders: { id: string; status: string; price: number; note: string | null; createdAt: string; product: { name: string; emoji: string | null } }[];
  feed: { items: FeedItem[]; nextCursor: string | null };
  load: (filter: FeedFilter) => Promise<{ items: FeedItem[]; nextCursor: string | null }>;
};

export function ProfileView({ person, isMe, collection, given, balance, orders, feed, load }: ProfileData) {
  return (
    <div className="space-y-14">
      <section className="flex flex-col items-center pt-6 text-center">
        <Reveal>
          <Avatar name={person.name} src={person.avatarUrl} size={112} className="shadow-2xl shadow-black/60" />
        </Reveal>
        <Reveal delay={0.1}>
          <h1 className="display mt-6 text-5xl">{person.name}</h1>
          <p className="mt-2 text-lg text-ink-2">{[person.title, person.team].filter(Boolean).join(" · ")}</p>
          {person.manager && (
            <p className="mt-1 text-sm text-ink-3">
              Reports to{" "}
              <Link href={`/people/${person.manager.id}`} className="hover:text-ink">
                {person.manager.name}
              </Link>
            </p>
          )}
        </Reveal>
        {!isMe && (
          <Reveal delay={0.2}>
            <Link href={`/give?to=${person.id}`} className="btn btn-primary mt-7 h-12 px-7">
              <Gem color="TRANSPARENT" size={18} /> Thank {person.name.split(" ")[0]}
            </Link>
          </Reveal>
        )}
      </section>

      <Stagger className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {WALLET_COLORS.map((c) => (
          <StaggerItem key={c}>
            <Spotlight className="flex flex-col items-center p-6 text-center">
              <Gem color={c} size={48} glow={collection[c] > 0} dim={collection[c] === 0} glint={collection[c] > 0} />
              <CountUp value={collection[c]} className="display mt-4 text-4xl tabular-nums" />
              <div className="mt-1 text-xs" style={{ color: GEM_META[c].hex }}>
                {GEM_META[c].value}
              </div>
            </Spotlight>
          </StaggerItem>
        ))}
        <StaggerItem className="col-span-2 sm:col-span-1">
          <Spotlight className="flex h-full flex-col items-center justify-center p-6 text-center">
            <CountUp value={given} className="display text-4xl tabular-nums" />
            <div className="mt-1 text-xs text-ink-3">Gems given</div>
          </Spotlight>
        </StaggerItem>
      </Stagger>

      {isMe && balance && (
        <Reveal>
          <h2 className="display mb-5 text-3xl">My orders</h2>
          <div className="card divide-y divide-white/5">
            <div className="flex flex-wrap items-center gap-4 p-5 text-sm text-ink-2">
              Spendable balance:
              {WALLET_COLORS.map((c) => (
                <span key={c} className="inline-flex items-center gap-1.5 font-semibold text-ink tabular-nums">
                  <Gem color={c} size={16} /> {balance[c]}
                </span>
              ))}
              <Link href="/store" className="ml-auto text-ink-2 hover:text-ink">
                DNA Store →
              </Link>
            </div>
            {orders.length === 0 && <p className="p-5 text-ink-3">No orders yet.</p>}
            {orders.map((o) => (
              <div key={o.id} className="flex items-center gap-4 p-5">
                <span className="text-2xl">{o.product.emoji ?? "🎁"}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{o.product.name}</div>
                  <div className="text-sm text-ink-3">
                    {o.price} gems · <TimeAgo iso={o.createdAt} />
                    {o.note && <> · {o.note}</>}
                  </div>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS[o.status]?.cls}`}>
                  {STATUS[o.status]?.label ?? o.status}
                </span>
              </div>
            ))}
          </div>
        </Reveal>
      )}

      <section>
        <Reveal>
          <h2 className="display mb-5 text-3xl">Activity</h2>
        </Reveal>
        <FeedList key={person.id} initial={feed} userId={person.id} load={load} />
      </section>
    </div>
  );
}
