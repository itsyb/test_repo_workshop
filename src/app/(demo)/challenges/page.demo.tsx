"use client";

import { bankOf, submitEntry, userById, type DemoState } from "@/demo/engine";
import { useDemoUser } from "@/demo/store";
import { ChallengesView, type ChallengeCard } from "@/views/ChallengesView";

function cards(state: DemoState, status: string): ChallengeCard[] {
  return state.challenges
    .filter((c) => c.status === status)
    .map((c) => ({
      ...c,
      entries: state.entries
        .filter((e) => e.challengeId === c.id)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map((e) => {
          const u = userById(state, e.userId)!;
          return { ...e, user: { id: u.id, name: u.name, avatarUrl: u.avatarUrl } };
        }),
    }));
}

export default function DemoChallenges() {
  const { state, me, run } = useDemoUser();
  const pool = Object.values(bankOf(state)).reduce((a, b) => a + b, 0);
  return (
    <ChallengesView
      meId={me.id}
      active={cards(state, "ACTIVE")}
      closed={cards(state, "CLOSED")}
      pool={pool}
      submit={(challengeId, text, link) =>
        run((d) => {
          submitEntry(d, me.id, challengeId, text, link);
          return "Your entry is in. Good luck!";
        })
      }
    />
  );
}
