"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState, useTransition } from "react";
import { feedPage } from "@/app/actions";
import { FeedCard } from "@/components/FeedCard";
import { Gem } from "@/components/Gem";
import { EASE } from "@/components/motion";
import type { FeedItem } from "@/lib/feed";
import { GEM_META, WALLET_COLORS } from "@/lib/gems";

type Page = { items: FeedItem[]; nextCursor: string | null };

export function FeedList({ initial, userId }: { initial: Page; userId?: string }) {
  const [color, setColor] = useState<string | undefined>();
  const [page, setPage] = useState<Page>(initial);
  const [pending, start] = useTransition();

  const filter = (c?: string) => {
    setColor(c);
    start(async () => setPage(await feedPage({ color: c, userId })));
  };
  const more = () =>
    start(async () => {
      const next = await feedPage({ color, userId, cursor: page.nextCursor ?? undefined });
      setPage((p) => ({ items: [...p.items, ...next.items], nextCursor: next.nextCursor }));
    });

  return (
    <div>
      <div className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4">
        <button className="chip" data-active={!color} onClick={() => filter(undefined)}>
          All
        </button>
        {WALLET_COLORS.map((c) => (
          <button key={c} className="chip shrink-0" data-active={color === c} onClick={() => filter(c)}>
            <Gem color={c} size={14} />
            {GEM_META[c].value}
          </button>
        ))}
      </div>

      <div className={`space-y-3 transition-opacity ${pending ? "opacity-60" : ""}`}>
        <AnimatePresence mode="popLayout" initial={false}>
          {page.items.map((item, i) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 24, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.6, ease: EASE, delay: Math.min(i % 20, 8) * 0.04 }}
            >
              <FeedCard item={item} />
            </motion.div>
          ))}
        </AnimatePresence>
        {page.items.length === 0 && (
          <div className="card p-12 text-center text-ink-2">Nothing here yet.</div>
        )}
      </div>

      {page.nextCursor && (
        <div className="mt-8 flex justify-center">
          <button onClick={more} className="btn btn-ghost" disabled={pending}>
            {pending ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}
