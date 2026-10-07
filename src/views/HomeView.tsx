import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { FeedCard } from "@/components/FeedCard";
import { Gem } from "@/components/Gem";
import { CountUp, Countdown, Reveal, Spotlight, SplitHeadline, Stagger, StaggerItem } from "@/components/motion";
import type { FeedItem } from "@/lib/feed";
import { formatDay, greeting, lastMoment } from "@/lib/format";
import { GEM_META, WALLET_COLORS, total, type Balance } from "@/lib/gems";
import type { Quota } from "@/lib/sprint";

export type HomeData = {
  name: string;
  sprint: { number: number; startsAt: Date; endsAt: Date } | null;
  programStartsAt: Date;
  quota: Quota | null;
  pending: { id: string; name: string; avatarUrl: string | null }[];
  balance: Balance;
  feed: FeedItem[];
  challenges: { id: string; title: string; description: string; emoji: string | null }[];
};

export function HomeView({ name, sprint, programStartsAt, quota, pending, balance, feed: feedItems, challenges }: HomeData) {
  const firstName = name.split(" ")[0];
  const left = (quota?.transparentLeft ?? 0) + (quota?.yellowLeft ?? 0);
  const feed = { items: feedItems };

  if (!sprint) {
    const starts = programStartsAt;
    const started = starts.getTime() <= Date.now();
    return (
      <section className="flex min-h-[70vh] flex-col items-center justify-center text-center">
        <p className="eyebrow mb-5">{started ? "Between sprints" : `Launching ${formatDay(starts, { weekday: "long", day: "numeric", month: "long" })}`}</p>
        <SplitHeadline text={`${greeting()}, ${firstName}.`} className="display text-5xl sm:text-7xl" />
        <p className="mt-5 max-w-lg text-lg text-ink-2">
          {started
            ? "The next sprint opens shortly. Fresh gems will be waiting for you."
            : "Your first gems arrive the moment Sprint 1 begins. Get ready to say thank you."}
        </p>
        {!started && (
          <Reveal delay={0.4} className="mt-12">
            <Countdown to={starts.toISOString()} />
          </Reveal>
        )}
      </section>
    );
  }

  const elapsed = Math.min(1, (Date.now() - sprint.startsAt.getTime()) / (sprint.endsAt.getTime() - sprint.startsAt.getTime()));

  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="pt-6 sm:pt-10">
        <Reveal>
          <p className="eyebrow mb-4">
            Sprint {sprint.number} · {formatDay(sprint.startsAt)} – {formatDay(lastMoment(sprint.endsAt))}
          </p>
        </Reveal>
        <SplitHeadline text={`${greeting()}, ${firstName}.`} className="display text-5xl sm:text-7xl" />
        <Reveal delay={0.25}>
          <p className="mt-5 max-w-xl text-xl leading-relaxed text-ink-2">
            {left > 0 ? (
              <>
                You have <span className="font-semibold text-ink">{left} {left === 1 ? "gem" : "gems"}</span> to share
                this sprint. Unshared gems go to the SFP Bank in{" "}
                <span className="font-semibold text-ink">
                  <Countdown to={sprint.endsAt.toISOString()} compact />
                </span>
                .
              </>
            ) : quota && quota.transparentTotal > 0 ? (
              "Every gem shared. Beautifully done — new ones arrive next sprint."
            ) : (
              "Your gems to share arrive at the start of the next sprint."
            )}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/give" className="btn btn-primary h-12 px-7 text-base">
              Say thanks
            </Link>
            <Link href="/feed" className="btn btn-ghost h-12 px-7 text-base">
              See what’s happening
            </Link>
          </div>
        </Reveal>
      </section>

      {/* Bento */}
      <Stagger className="grid gap-4 md:grid-cols-6">
        <StaggerItem className="md:col-span-4">
          <Spotlight className="h-full p-7">
            <p className="eyebrow">To give this sprint</p>
            <div className="mt-6 flex flex-wrap items-end gap-5">
              {Array.from({ length: quota?.transparentTotal ?? 0 }).map((_, i) => {
                const used = i >= (quota?.transparentLeft ?? 0);
                return (
                  <div key={`t${i}`} className="flex flex-col items-center gap-2">
                    <Gem color="TRANSPARENT" size={64} glow={!used} glint={!used} dim={used} className={used ? "" : "animate-float"} />
                    <span className="text-xs text-ink-3">{used ? "Shared" : "Chameleon"}</span>
                  </div>
                );
              })}
              {Array.from({ length: quota?.yellowTotal ?? 0 }).map((_, i) => {
                const used = i >= (quota?.yellowLeft ?? 0);
                return (
                  <div key={`y${i}`} className="flex flex-col items-center gap-2">
                    <Gem color="YELLOW" size={48} glow={!used} dim={used} />
                    <span className="text-xs text-ink-3">{used ? "Given" : "Excellence"}</span>
                  </div>
                );
              })}
              {!quota?.transparentTotal && <p className="text-ink-2">You joined mid-sprint — your gems arrive next sprint.</p>}
            </div>
            <p className="mt-6 max-w-lg text-sm leading-relaxed text-ink-2">
              Each Transparent gem becomes <span style={{ color: GEM_META.BLUE.hex }}>Blue</span>,{" "}
              <span style={{ color: GEM_META.PURPLE.hex }}>Purple</span> or{" "}
              <span style={{ color: GEM_META.GREEN.hex }}>Green</span> when you give it — one per person per sprint.
              {quota && quota.yellowTotal > 0 && " Yellow gems go to your direct reports for delivering the sprint scope."}
            </p>
            {pending.length > 0 && (
              <div className="mt-6 flex flex-wrap items-center gap-2">
                <span className="text-sm text-ink-3">Waiting for Yellow:</span>
                {pending.map((p) => (
                  <Link
                    key={p.id}
                    href={`/give?to=${p.id}&type=YELLOW`}
                    className="chip hover:border-[color:var(--color-gem-yellow)]"
                  >
                    <Avatar name={p.name} src={p.avatarUrl} size={20} />
                    {p.name}
                  </Link>
                ))}
              </div>
            )}
          </Spotlight>
        </StaggerItem>

        <StaggerItem className="md:col-span-2">
          <Spotlight className="flex h-full flex-col p-7">
            <p className="eyebrow">Sprint ends in</p>
            <div className="display mt-5 text-5xl">
              <Countdown to={sprint.endsAt.toISOString()} compact />
            </div>
            <p className="mt-2 text-sm text-ink-3">Sunday, {formatDay(lastMoment(sprint.endsAt))} · 23:59</p>
            <div className="mt-auto pt-8">
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.round(elapsed * 100)}%`,
                    background: "linear-gradient(90deg, #2e8bff, #c36bff, #3be07a)",
                  }}
                />
              </div>
              <p className="mt-2 text-xs text-ink-3">{Math.round(elapsed * 100)}% of the sprint behind us</p>
            </div>
          </Spotlight>
        </StaggerItem>

        <StaggerItem className="md:col-span-6">
          <Spotlight className="p-7">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="eyebrow">Your collection</p>
              <Link href="/store" className="text-sm text-ink-2 hover:text-ink">
                Spend in the DNA Store →
              </Link>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-5">
              {WALLET_COLORS.map((c) => (
                <div key={c} className="flex items-center gap-3">
                  <Gem color={c} size={40} glow={balance[c] > 0} dim={balance[c] === 0} />
                  <div>
                    <CountUp value={balance[c]} className="display text-3xl tabular-nums" />
                    <div className="text-xs text-ink-3">{GEM_META[c].value}</div>
                  </div>
                </div>
              ))}
              <div className="col-span-2 flex items-center gap-3 border-white/10 sm:col-span-1 sm:border-l sm:pl-6">
                <div>
                  <CountUp value={total(balance)} className="display text-prism text-4xl tabular-nums" />
                  <div className="text-xs text-ink-3">Total gems</div>
                </div>
              </div>
            </div>
          </Spotlight>
        </StaggerItem>
      </Stagger>

      {/* Challenges */}
      {challenges.length > 0 && (
        <section>
          <Reveal className="mb-5 flex items-baseline justify-between">
            <h2 className="display text-3xl">Sprint challenges</h2>
            <Link href="/challenges" className="text-sm text-ink-2 hover:text-ink">
              All challenges →
            </Link>
          </Reveal>
          <Stagger className="grid gap-4 sm:grid-cols-2">
            {challenges.map((c) => (
              <StaggerItem key={c.id}>
                <Link href="/challenges">
                  <Spotlight tilt className="h-full p-7">
                    <div className="text-4xl">{c.emoji ?? "✨"}</div>
                    <h3 className="mt-4 text-xl font-semibold">{c.title}</h3>
                    <p className="mt-2 text-ink-2">{c.description}</p>
                  </Spotlight>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        </section>
      )}

      {/* Feed preview */}
      <section>
        <Reveal className="mb-5 flex items-baseline justify-between">
          <h2 className="display text-3xl">Latest recognition</h2>
          <Link href="/feed" className="text-sm text-ink-2 hover:text-ink">
            Full feed →
          </Link>
        </Reveal>
        {feed.items.length === 0 ? (
          <Reveal>
            <div className="card p-10 text-center text-ink-2">No gems shared yet this sprint. Be the first.</div>
          </Reveal>
        ) : (
          <Stagger className="space-y-3">
            {feed.items.map((item) => (
              <StaggerItem key={item.id}>
                <FeedCard item={item} />
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </section>
    </div>
  );
}
