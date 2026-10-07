"use client";

import { balanceOf, feedOf, quotaOf, userById } from "@/demo/engine";
import { useDemoUser } from "@/demo/store";
import { HomeView } from "@/views/HomeView";

export default function DemoHome() {
  const { state, me } = useDemoUser();
  const quota = quotaOf(state, me.id);
  return (
    <HomeView
      name={me.name}
      sprint={{ number: state.sprint.number, startsAt: new Date(state.sprint.startsAt), endsAt: new Date(state.sprint.endsAt) }}
      programStartsAt={new Date(state.pastSprints[0]?.startsAt ?? state.sprint.startsAt)}
      quota={quota}
      pending={quota.yellowPendingIds.map((id) => userById(state, id)!)}
      balance={balanceOf(state, me.id)}
      feed={feedOf(state, { take: 3 }).items}
      challenges={state.challenges.filter((c) => c.status === "ACTIVE")}
    />
  );
}
