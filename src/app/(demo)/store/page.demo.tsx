"use client";

import { balanceOf, buy } from "@/demo/engine";
import { useDemoUser } from "@/demo/store";
import { StoreView } from "@/views/SimpleViews";

export default function DemoStore() {
  const { state, me, run } = useDemoUser();
  return (
    <StoreView
      products={state.products.filter((p) => p.active).sort((a, b) => a.sortOrder - b.sortOrder || a.price - b.price)}
      balance={balanceOf(state, me.id)}
      buy={(productId, spend) =>
        run((d) => {
          buy(d, me.id, productId, spend);
          return "Order placed — in the real program the team would now deliver it.";
        })
      }
    />
  );
}
