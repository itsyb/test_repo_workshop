"use client";

import { receivedTotals } from "@/demo/engine";
import { useDemo } from "@/demo/store";
import { PeopleView } from "@/views/SimpleViews";

export default function DemoPeople() {
  const { state } = useDemo();
  const totals = receivedTotals(state);
  return (
    <PeopleView
      people={[...state.users]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((u) => ({ id: u.id, name: u.name, title: u.title, team: u.team, avatarUrl: u.avatarUrl, received: totals.get(u.id) ?? 0 }))}
    />
  );
}
