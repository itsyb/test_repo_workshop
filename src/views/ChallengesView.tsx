import { Avatar } from "@/components/Avatar";
import { EntryForm } from "@/components/EntryForm";
import { Gem } from "@/components/Gem";
import { Reveal, SplitHeadline, Stagger, StaggerItem } from "@/components/motion";
import type { ActionResult } from "@/lib/errors";
import type { GemColor } from "@/lib/gems";
import { MAX_ACTIVE_CHALLENGES } from "@/lib/rules";

export type ChallengeCard = {
  id: string;
  title: string;
  description: string;
  emoji: string | null;
  entries: {
    id: string;
    userId: string;
    text: string;
    link: string | null;
    prizeAmount: number | null;
    prizeColor: string | null;
    user: { id: string; name: string; avatarUrl: string | null };
  }[];
};

export function ChallengesView({
  meId,
  active,
  closed,
  pool,
  submit,
}: {
  meId: string;
  active: ChallengeCard[];
  closed: ChallengeCard[];
  pool: number;
  submit: (challengeId: string, text: string, link: string) => Promise<ActionResult>;
}) {
  return (
    <div className="space-y-16">
      <header>
        <p className="eyebrow mb-3">Sprint challenges</p>
        <SplitHeadline text="Themed competitions. Real prizes." className="display text-5xl sm:text-6xl" />
        <Reveal delay={0.2}>
          <p className="mt-4 max-w-xl text-lg text-ink-2">
            Up to {MAX_ACTIVE_CHALLENGES} challenges run at a time. Prizes come from the SFP Bank — every gem left unshared
            becomes a missed opportunity someone else can win.
          </p>
          <div className="glass mt-6 inline-flex items-center gap-3 rounded-full px-5 py-2.5 text-sm">
            <Gem color="TRANSPARENT" size={18} glint />
            <span className="text-ink-2">Prize pool in the SFP Bank:</span>
            <span className="font-semibold tabular-nums">{pool} gems</span>
          </div>
        </Reveal>
      </header>

      {active.length === 0 ? (
        <Reveal>
          <div className="card p-12 text-center text-ink-2">No challenge is running right now. Stay tuned.</div>
        </Reveal>
      ) : (
        <Stagger className="grid gap-5 lg:grid-cols-2">
          {active.map((c) => {
            const mine = c.entries.find((e) => e.userId === meId);
            return (
              <StaggerItem key={c.id}>
                <article className="card flex h-full flex-col p-7">
                  <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#c36bff]/20 blur-3xl" aria-hidden />
                  <div className="text-5xl">{c.emoji ?? "✨"}</div>
                  <h2 className="display mt-5 text-3xl">{c.title}</h2>
                  <p className="mt-2 text-ink-2">{c.description}</p>
                  <EntryForm challengeId={c.id} initialText={mine?.text ?? ""} initialLink={mine?.link ?? ""} submit={submit} />
                  <div className="mt-7 border-t border-white/5 pt-5">
                    <p className="eyebrow mb-3">{c.entries.length} {c.entries.length === 1 ? "entry" : "entries"}</p>
                    <div className="space-y-3">
                      {c.entries.map((e) => (
                        <div key={e.id} className="flex gap-3">
                          <Avatar name={e.user.name} src={e.user.avatarUrl} size={30} />
                          <div className="min-w-0 text-sm">
                            <span className="font-semibold">{e.user.name}</span>
                            {e.prizeAmount && (
                              <span className="ml-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-300">
                                🏆 +{e.prizeAmount} <Gem color={e.prizeColor as GemColor} size={12} />
                              </span>
                            )}
                            <p className="text-ink-2">{e.text}</p>
                            {e.link && (
                              <a href={e.link} target="_blank" rel="noreferrer" className="text-xs text-[#2e8bff] hover:underline">
                                {e.link}
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </article>
              </StaggerItem>
            );
          })}
        </Stagger>
      )}

      {closed.length > 0 && (
        <section>
          <Reveal>
            <h2 className="display mb-5 text-3xl">Hall of fame</h2>
          </Reveal>
          <Stagger className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {closed.map((c) => {
              const winners = c.entries.filter((e) => e.prizeAmount);
              return (
                <StaggerItem key={c.id}>
                  <div className="card h-full p-6">
                    <div className="text-3xl">{c.emoji ?? "✨"}</div>
                    <h3 className="mt-3 font-semibold">{c.title}</h3>
                    <div className="mt-3 space-y-2">
                      {winners.length === 0 && <p className="text-sm text-ink-3">No winners announced.</p>}
                      {winners.map((w) => (
                        <div key={w.id} className="flex items-center gap-2 text-sm">
                          <Avatar name={w.user.name} src={w.user.avatarUrl} size={24} />
                          <span className="flex-1 truncate">{w.user.name}</span>
                          <span className="inline-flex items-center gap-1 font-semibold">
                            +{w.prizeAmount} <Gem color={w.prizeColor as GemColor} size={14} />
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </StaggerItem>
              );
            })}
          </Stagger>
        </section>
      )}
    </div>
  );
}
