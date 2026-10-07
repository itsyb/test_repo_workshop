"use client";

import { balanceOf, collectionOf, feedOf, userById } from "@/demo/engine";
import { useDemoUser } from "@/demo/store";
import { ProfileView } from "@/views/ProfileView";

export function DemoProfile({ id }: { id: string }) {
  const { state, me } = useDemoUser();
  const person = userById(state, id);
  if (!person) return <p className="text-ink-2">Person not found.</p>;
  const isMe = person.id === me.id;
  const manager = person.managerId ? userById(state, person.managerId) : null;
  return (
    <ProfileView
      person={{ ...person, manager: manager ? { id: manager.id, name: manager.name } : null }}
      isMe={isMe}
      collection={collectionOf(state, id)}
      given={state.transfers.filter((t) => t.fromId === id).length}
      balance={isMe ? balanceOf(state, id) : null}
      orders={
        isMe
          ? state.orders
              .filter((o) => o.userId === id)
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .map((o) => ({ ...o, product: state.products.find((p) => p.id === o.productId)! }))
          : []
      }
      feed={feedOf(state, { userId: id })}
      load={async (f) => feedOf(state, f)}
    />
  );
}
