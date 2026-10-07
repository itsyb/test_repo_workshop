import { FeedList } from "@/components/FeedList";
import { Reveal, SplitHeadline } from "@/components/motion";
import { PeopleGrid } from "@/components/PeopleGrid";
import { StoreGrid } from "@/components/StoreGrid";
import type { ActionResult } from "@/lib/errors";
import type { FeedFilter, FeedItem } from "@/lib/feed";
import type { Balance } from "@/lib/gems";

type FeedPage = { items: FeedItem[]; nextCursor: string | null };

export function FeedView({ initial, load }: { initial: FeedPage; load: (f: FeedFilter) => Promise<FeedPage> }) {
  return (
    <div>
      <p className="eyebrow mb-3">Newsfeed</p>
      <SplitHeadline text="Thank-yous, in the open." className="display mb-10 text-5xl sm:text-6xl" />
      <FeedList initial={initial} load={load} />
    </div>
  );
}

export function PeopleView({ people }: { people: Parameters<typeof PeopleGrid>[0]["people"] }) {
  return (
    <div>
      <p className="eyebrow mb-3">People</p>
      <SplitHeadline text="The team behind the gems." className="display mb-10 text-5xl sm:text-6xl" />
      <PeopleGrid people={people} />
    </div>
  );
}

type Product = {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  emoji: string | null;
  imageUrl: string | null;
  stock: number | null;
};

export function StoreView({
  products,
  balance,
  buy,
}: {
  products: Product[];
  balance: Balance;
  buy: (productId: string, spend: Partial<Balance>) => Promise<ActionResult>;
}) {
  return (
    <div>
      <p className="eyebrow mb-3">DNA Store</p>
      <SplitHeadline text="Redeem your impact." className="display text-5xl sm:text-6xl" />
      <Reveal delay={0.2}>
        <p className="mb-10 mt-4 max-w-xl text-lg text-ink-2">
          Every gem is worth the same here — Blue, Purple, Green or Yellow. Turn recognition into experiences, impact and
          things you’ll love.
        </p>
      </Reveal>
      <StoreGrid
        balance={balance}
        buy={buy}
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          category: p.category,
          price: p.price,
          emoji: p.emoji,
          imageUrl: p.imageUrl,
          stock: p.stock,
        }))}
      />
    </div>
  );
}
