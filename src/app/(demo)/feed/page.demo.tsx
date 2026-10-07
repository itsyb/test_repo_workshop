"use client";

import { feedOf } from "@/demo/engine";
import { useDemo } from "@/demo/store";
import { FeedView } from "@/views/SimpleViews";

export default function DemoFeed() {
  const { state } = useDemo();
  return <FeedView initial={feedOf(state, {})} load={async (f) => feedOf(state, f)} />;
}
