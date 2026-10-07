import { SplitHeadline } from "@/components/motion";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getBalance } from "@/lib/ledger";
import { StoreGrid } from "./StoreGrid";

export default async function StorePage() {
  const user = await requireUser();
  const [products, balance] = await Promise.all([
    prisma.product.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { price: "asc" }] }),
    getBalance(prisma, user.id),
  ]);
  return (
    <div>
      <p className="eyebrow mb-3">DNA Store</p>
      <SplitHeadline text="Redeem your impact." className="display text-5xl sm:text-6xl" />
      <p className="mb-10 mt-4 max-w-xl text-lg text-ink-2">
        Every gem is worth the same here — Blue, Purple, Green or Yellow. Turn recognition into experiences, impact and
        things you’ll love.
      </p>
      <StoreGrid
        balance={balance}
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
