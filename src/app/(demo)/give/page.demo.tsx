"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { GiveFlow } from "@/components/GiveFlow";
import { give, quotaOf } from "@/demo/engine";
import { useDemoUser } from "@/demo/store";

function Give() {
  const { state, me, run } = useDemoUser();
  const params = useSearchParams();
  const quota = quotaOf(state, me.id);
  const thanked = new Set(quota.thankedIds);
  const pending = new Set(quota.yellowPendingIds);
  return (
    <GiveFlow
      sprintOpen
      transparentLeft={quota.transparentLeft}
      transparentTotal={quota.transparentTotal}
      yellowLeft={quota.yellowLeft}
      yellowTotal={quota.yellowTotal}
      people={state.users
        .filter((u) => u.id !== me.id)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((p) => ({
          id: p.id,
          name: p.name,
          subtitle: [p.title, p.team].filter(Boolean).join(" · "),
          avatarUrl: p.avatarUrl,
          thanked: thanked.has(p.id),
          isReport: p.managerId === me.id,
          yellowPending: pending.has(p.id),
        }))}
      initialTo={params.get("to") ?? undefined}
      initialSource={params.get("type") === "YELLOW" ? "YELLOW" : undefined}
      give={(input) => run((d) => give(d, me.id, input))}
    />
  );
}

export default function DemoGivePage() {
  return (
    <Suspense>
      <Give />
    </Suspense>
  );
}
