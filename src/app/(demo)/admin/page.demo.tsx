"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import * as E from "@/demo/engine";
import { useDemoUser } from "@/demo/store";
import type { GemColor } from "@/lib/gems";
import { AdminView } from "@/views/AdminView";

function Admin() {
  const { state: s, me, run } = useDemoUser();
  const router = useRouter();
  const tab = useSearchParams().get("tab") ?? "overview";

  useEffect(() => {
    if (!me.isAdmin) router.replace("/");
  }, [me.isAdmin, router]);
  if (!me.isAdmin) return null;

  const cur = s.transfers.filter((t) => t.sprint === s.sprint.number);
  const counts = new Map<string, number>();
  for (const t of cur) counts.set(t.toId, (counts.get(t.toId) ?? 0) + 1);
  const top = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, n]) => ({ ...E.userById(s, id)!, n }));
  const allocs = Object.values(s.alloc);

  return (
    <AdminView
      tab={tab}
      pendingOrders={s.orders.filter((o) => o.status === "PENDING").length}
      overview={{
        participants: s.users.length,
        sprint: { number: s.sprint.number, endsAt: new Date(s.sprint.endsAt) },
        stats: {
          allocated: allocs.reduce((a, x) => a + x.transparent + x.yellow, 0),
          given: cur.length,
          givers: new Set(cur.map((t) => t.fromId)).size,
          eligible: allocs.length,
        },
        bank: E.bankOf(s),
        top,
        sprints: [
          { id: "current", number: s.sprint.number, startsAt: new Date(s.sprint.startsAt), endsAt: new Date(s.sprint.endsAt), closed: false, missed: 0 },
          ...[...s.pastSprints].reverse().map((p) => ({
            id: `s${p.number}`,
            number: p.number,
            startsAt: new Date(p.startsAt),
            endsAt: new Date(p.endsAt),
            closed: true,
            missed: p.missed,
          })),
        ],
      }}
      orders={[...s.orders]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((o) => {
          const u = E.userById(s, o.userId)!;
          return { ...o, product: s.products.find((p) => p.id === o.productId)!, user: { name: u.name, email: u.email } };
        })}
      challenges={{
        bank: E.bankOf(s),
        list: s.challenges.map((c) => ({
          ...c,
          entries: s.entries
            .filter((e) => e.challengeId === c.id)
            .map((e) => ({ ...e, name: E.userById(s, e.userId)!.name, prizeColor: e.prizeColor as GemColor | null })),
        })),
      }}
      products={[...s.products]
        .sort((a, b) => Number(b.active) - Number(a.active) || a.sortOrder - b.sortOrder)
        .map((p) => ({ ...p, emoji: p.emoji ?? "" }))}
      people={s.users.map((u) => ({
        ...u,
        managerName: u.managerId ? E.userById(s, u.managerId)!.name : null,
        reports: s.users.filter((r) => r.managerId === u.id).length,
      }))}
      peopleNote={
        <>
          In the real app participants are managed directly in the database (<code className="rounded bg-white/10 px-1.5 py-0.5 text-ink">npm run db:studio</code>).
          This demo uses a fixed set of fictional people.
        </>
      }
      actions={{
        order: (id, status, note) => run((d) => E.setOrderStatus(d, id, status, note)),
        challengeStatus: (id, status) => run((d) => E.setChallengeStatus(d, id, status)),
        createChallenge: (input) => run((d) => E.createChallenge(d, input)),
        award: (entryId, bankColor, amount, convertTo) => run((d) => E.awardPrize(d, entryId, bankColor, amount, convertTo)),
        saveProduct: (input) => run((d) => E.saveProduct(d, input)),
      }}
    />
  );
}

export default function DemoAdminPage() {
  return (
    <Suspense>
      <Admin />
    </Suspense>
  );
}
