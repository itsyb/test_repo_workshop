"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Avatar } from "@/components/Avatar";
import { Gem } from "@/components/Gem";
import { EASE } from "@/components/motion";
import { Portal } from "@/components/Portal";
import type { ActionResult } from "@/lib/errors";
import { COMMENT_MAX, COMMENT_MIN, DNA_COLORS, GEM_META, type DnaColor, type GemColor, type GemSource } from "@/lib/gems";

type Person = {
  id: string;
  name: string;
  subtitle: string;
  avatarUrl: string | null;
  thanked: boolean;
  isReport: boolean;
  yellowPending: boolean;
};

type Props = {
  sprintOpen: boolean;
  transparentLeft: number;
  transparentTotal: number;
  yellowLeft: number;
  yellowTotal: number;
  people: Person[];
  initialTo?: string;
  initialSource?: GemSource;
  give: (input: { toId: string; source: GemSource; color: string; comment: string }) => Promise<ActionResult>;
};

export function GiveFlow(props: Props) {
  const router = useRouter();
  const canTransparent = props.transparentLeft > 0;
  const canYellow = props.yellowLeft > 0;
  const [source, setSource] = useState<GemSource | null>(
    props.initialSource === "YELLOW" && canYellow ? "YELLOW" : canTransparent ? "TRANSPARENT" : canYellow ? "YELLOW" : null,
  );
  const [color, setColor] = useState<DnaColor | null>(null);
  const [toId, setToId] = useState<string | null>(props.initialTo ?? null);
  const [query, setQuery] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ name: string; color: GemColor; comment: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const gemColor: GemColor = source === "YELLOW" ? "YELLOW" : (color ?? "TRANSPARENT");
  const meta = GEM_META[gemColor];

  const eligible = (p: Person) => (source === "YELLOW" ? p.yellowPending : !p.thanked);
  const recipient = props.people.find((p) => p.id === toId) ?? null;
  const recipientOk = recipient ? eligible(recipient) : false;

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return props.people
      .filter((p) => (source === "YELLOW" ? p.isReport : true))
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.subtitle.toLowerCase().includes(q))
      .sort((a, b) => Number(eligible(b)) - Number(eligible(a)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.people, query, source]);

  const commentLen = comment.trim().replace(/\s+/g, " ").length;
  const ready = !!source && (source === "YELLOW" || !!color) && recipientOk && commentLen >= COMMENT_MIN && commentLen <= COMMENT_MAX;

  function send() {
    if (!ready || !source || !recipient) return;
    setError(null);
    startTransition(async () => {
      const res = await props.give({ toId: recipient.id, source, color: gemColor, comment });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSent({ name: recipient.name, color: gemColor, comment: comment.trim() });
      router.refresh();
    });
  }

  function reset() {
    setSent(null);
    setColor(null);
    setToId(null);
    setComment("");
    setQuery("");
    // props already reflect the refreshed quota after the gift.
    setSource(props.transparentLeft > 0 ? "TRANSPARENT" : props.yellowLeft > 0 ? "YELLOW" : null);
  }

  if (!props.sprintOpen || (!canTransparent && !canYellow && !sent)) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="flex gap-3">
          <Gem color="TRANSPARENT" size={56} dim />
          <Gem color="TRANSPARENT" size={56} dim />
        </div>
        <h1 className="display mt-8 text-4xl sm:text-5xl">
          {props.sprintOpen ? (props.transparentTotal ? "All gems shared." : "Gems arrive next sprint.") : "No sprint running."}
        </h1>
        <p className="mt-4 max-w-md text-lg text-ink-2">
          {props.sprintOpen
            ? props.transparentTotal
              ? "You’ve given every gem this sprint. Fresh ones arrive on Monday when the next sprint starts."
              : "You joined mid-sprint. Your first gems to share arrive when the next sprint begins."
            : "Gems to share are handed out when the next sprint begins."}
        </p>
        <Link href="/feed" className="btn btn-ghost mt-8">
          Browse the feed
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
        <div className="space-y-12">
          <header>
            <p className="eyebrow mb-3">Give a gem</p>
            <h1 className="display text-5xl sm:text-6xl">Who made a difference?</h1>
          </header>

          {/* 1 · Gem type */}
          <Step n={1} title="Choose a gem">
            <div className="grid gap-3 sm:grid-cols-2">
              <Tile
                active={source === "TRANSPARENT"}
                disabled={!canTransparent}
                onClick={() => {
                  setSource("TRANSPARENT");
                }}
              >
                <Gem color="TRANSPARENT" size={44} glow={source === "TRANSPARENT"} />
                <div>
                  <div className="font-semibold">Transparent · DNA Chameleon</div>
                  <div className="text-sm text-ink-2">
                    {props.transparentLeft} of {props.transparentTotal} left · for any colleague
                  </div>
                </div>
              </Tile>
              {props.yellowTotal > 0 && (
                <Tile
                  active={source === "YELLOW"}
                  disabled={!canYellow}
                  onClick={() => {
                    setSource("YELLOW");
                    if (recipient && !recipient.yellowPending) setToId(null);
                  }}
                >
                  <Gem color="YELLOW" size={44} glow={source === "YELLOW"} />
                  <div>
                    <div className="font-semibold">Yellow · Sprint Excellence</div>
                    <div className="text-sm text-ink-2">
                      {props.yellowLeft} of {props.yellowTotal} left · for your direct reports
                    </div>
                  </div>
                </Tile>
              )}
            </div>
          </Step>

          {/* 2 · DNA colour */}
          <AnimatePresence initial={false}>
            {source === "TRANSPARENT" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.5, ease: EASE }}
                className="overflow-hidden"
              >
                <Step n={2} title="What does it stand for?">
                  <div className="grid gap-3 sm:grid-cols-3">
                    {DNA_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setColor(c)}
                        className="card card-hover p-5 text-left transition-transform active:scale-[0.98]"
                        style={
                          color === c
                            ? { borderColor: GEM_META[c].hex, boxShadow: `0 0 0 1px ${GEM_META[c].hex}, 0 20px 60px -20px ${GEM_META[c].hex}88` }
                            : undefined
                        }
                      >
                        <Gem color={c} size={40} glow={color === c} />
                        <div className="mt-4 font-semibold" style={{ color: GEM_META[c].hex }}>
                          {GEM_META[c].value}
                        </div>
                        <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{GEM_META[c].blurb}</p>
                      </button>
                    ))}
                  </div>
                </Step>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 3 · Recipient */}
          <Step n={source === "TRANSPARENT" ? 3 : 2} title={source === "YELLOW" ? "Which report delivered?" : "Who are you thanking?"}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or team"
              className="field mb-3"
              aria-label="Search people"
            />
            <div className="no-scrollbar max-h-[380px] space-y-1.5 overflow-y-auto pr-1">
              {list.length === 0 && <p className="p-4 text-sm text-ink-3">No one matches.</p>}
              {list.map((p) => {
                const ok = eligible(p);
                const selected = p.id === toId;
                return (
                  <button
                    key={p.id}
                    disabled={!ok}
                    onClick={() => setToId(p.id)}
                    className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-all ${
                      selected ? "border-white/30 bg-white/10" : "border-transparent hover:bg-white/5"
                    } disabled:cursor-not-allowed disabled:opacity-40`}
                  >
                    <Avatar name={p.name} src={p.avatarUrl} size={38} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{p.name}</div>
                      <div className="truncate text-sm text-ink-3">
                        {!ok
                          ? source === "YELLOW"
                            ? "Already has a Yellow gem this sprint"
                            : "Already thanked by you this sprint"
                          : p.subtitle || " "}
                      </div>
                    </div>
                    <AnimatePresence>
                      {selected && (
                        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 500, damping: 26 }}>
                          <Gem color={gemColor} size={24} glow />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </button>
                );
              })}
            </div>
          </Step>

          {/* 4 · Comment */}
          <Step n={source === "TRANSPARENT" ? 4 : 3} title="Tell them why">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={COMMENT_MAX + 50}
              rows={4}
              placeholder="Amazing collaboration on the eCRM sendouts refactoring…"
              className="field resize-none text-[17px] leading-relaxed"
              aria-label="Public comment"
            />
            <div className="mt-2 flex justify-between text-xs">
              <span className="text-ink-3">Shown publicly in the feed.</span>
              <span className={commentLen >= COMMENT_MIN ? "text-ink-3" : "text-amber-300/80"}>
                {commentLen < COMMENT_MIN ? `${COMMENT_MIN - commentLen} more characters` : `${commentLen}/${COMMENT_MAX}`}
              </span>
            </div>
          </Step>
        </div>

        {/* Summary */}
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="card p-7">
            <div
              className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-56 w-56 rounded-full opacity-40 blur-3xl transition-colors duration-700"
              style={{ background: meta.hex }}
              aria-hidden
            />
            <div className="flex justify-center py-6">
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={gemColor}
                  initial={{ scale: 0.6, rotate: -20, opacity: 0, filter: "blur(8px)" }}
                  animate={{ scale: 1, rotate: 0, opacity: 1, filter: "blur(0px)" }}
                  exit={{ scale: 1.2, opacity: 0, filter: "blur(8px)" }}
                  transition={{ duration: 0.6, ease: EASE }}
                  className="animate-float"
                >
                  <Gem color={gemColor} size={120} glow glint />
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold" style={{ color: meta.hex }}>
                {meta.value}
              </div>
              <div className="mt-1 min-h-6 text-ink-2">{recipient ? <>to {recipient.name}</> : "Pick a colleague"}</div>
            </div>
            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-4 rounded-2xl bg-rose-500/10 px-4 py-3 text-center text-sm text-rose-300"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
            <button className="btn btn-primary mt-6 h-12 w-full text-base" disabled={!ready || pending} onClick={send}>
              {pending ? "Sending…" : "Send gem"}
            </button>
            <p className="mt-3 text-center text-xs text-ink-3">Gifts are final and appear in the public feed.</p>
          </div>
        </aside>
      </div>

      <Portal>
        <AnimatePresence>{sent && <Celebration {...sent} onAgain={reset} canAgain={props.transparentLeft + props.yellowLeft > 0} />}</AnimatePresence>
      </Portal>
    </>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-xs font-semibold">{n}</span>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Tile({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`card card-hover flex items-center gap-4 p-5 text-left transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${
        active ? "!border-white/40 bg-white/[0.06]" : ""
      }`}
    >
      {children}
    </button>
  );
}

const PARTICLES = Array.from({ length: 28 }, (_, i) => {
  const angle = (i / 28) * Math.PI * 2 + (i % 3) * 0.2;
  const dist = 140 + ((i * 37) % 120);
  return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, size: 4 + (i % 4) * 2, delay: (i % 5) * 0.03 };
});

function Celebration({
  name,
  color,
  comment,
  onAgain,
  canAgain,
}: {
  name: string;
  color: GemColor;
  comment: string;
  onAgain: () => void;
  canAgain: boolean;
}) {
  const meta = GEM_META[color];
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6 backdrop-blur-2xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      role="dialog"
      aria-modal="true"
      aria-label="Gem sent"
    >
      <div className="relative flex max-w-lg flex-col items-center text-center">
        <div className="relative flex h-56 w-56 items-center justify-center">
          {PARTICLES.map((p, i) => (
            <motion.span
              key={i}
              className="absolute rounded-full"
              style={{ width: p.size, height: p.size, background: i % 4 === 0 ? "#fff" : meta.hex, boxShadow: `0 0 12px ${meta.hex}` }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
              animate={{ x: p.x, y: p.y, opacity: 0, scale: 1 }}
              transition={{ duration: 1.4, delay: 0.25 + p.delay, ease: [0.1, 0.8, 0.3, 1] }}
            />
          ))}
          <motion.div
            className="absolute h-40 w-40 rounded-full"
            style={{ border: `2px solid ${meta.hex}` }}
            initial={{ scale: 0.4, opacity: 0.9 }}
            animate={{ scale: 2.4, opacity: 0 }}
            transition={{ duration: 1.1, delay: 0.2, ease: EASE }}
          />
          <motion.div
            initial={{ scale: 0, rotate: -120, y: 60 }}
            animate={{ scale: 1, rotate: 0, y: 0 }}
            transition={{ type: "spring", stiffness: 180, damping: 14 }}
          >
            <Gem color={color} size={150} glow glint />
          </motion.div>
        </div>
        <motion.h2
          className="display mt-6 text-5xl"
          initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ delay: 0.45, duration: 0.8, ease: EASE }}
        >
          Sent to {name.split(" ")[0]}.
        </motion.h2>
        <motion.p
          className="mt-4 text-lg text-ink-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8, ease: EASE }}
        >
          “{comment}”
        </motion.p>
        <motion.div
          className="mt-10 flex flex-wrap justify-center gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8, ease: EASE }}
        >
          {canAgain && (
            <button onClick={onAgain} className="btn btn-primary h-12 px-7">
              Give another
            </button>
          )}
          <Link href="/feed" className="btn btn-ghost h-12 px-7">
            See it in the feed
          </Link>
        </motion.div>
      </div>
    </motion.div>
  );
}
