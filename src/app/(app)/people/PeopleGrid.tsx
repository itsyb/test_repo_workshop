"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { Gem } from "@/components/Gem";
import { EASE, Spotlight } from "@/components/motion";

type P = { id: string; name: string; title: string | null; team: string | null; avatarUrl: string | null; received: number };

export function PeopleGrid({ people }: { people: P[] }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"name" | "gems">("name");
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = people.filter((p) => !s || `${p.name} ${p.title ?? ""} ${p.team ?? ""}`.toLowerCase().includes(s));
    return sort === "gems" ? [...list].sort((a, b) => b.received - a.received) : list;
  }, [people, q, sort]);

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people, roles, teams" className="field sm:max-w-sm" />
        <div className="flex gap-2">
          <button className="chip" data-active={sort === "name"} onClick={() => setSort("name")}>
            A–Z
          </button>
          <button className="chip" data-active={sort === "gems"} onClick={() => setSort("gems")}>
            Most recognised
          </button>
        </div>
      </div>
      <motion.div layout className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((p, i) => (
          <motion.div
            key={p.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE, delay: Math.min(i, 12) * 0.03 }}
          >
            <Link href={`/people/${p.id}`}>
              <Spotlight className="flex items-center gap-4 p-5">
                <Avatar name={p.name} src={p.avatarUrl} size={52} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{p.name}</div>
                  <div className="truncate text-sm text-ink-3">{[p.title, p.team].filter(Boolean).join(" · ") || " "}</div>
                </div>
                <div className="flex items-center gap-1.5 text-sm font-semibold tabular-nums">
                  <Gem color="PURPLE" size={16} />
                  {p.received}
                </div>
              </Spotlight>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </>
  );
}
