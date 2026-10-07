import { buyAction } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getBalance } from "@/lib/ledger";
import { StoreView } from "@/views/SimpleViews";

export default async function StorePage() {
  const user = await requireUser();
  const [products, balance] = await Promise.all([
    prisma.product.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { price: "asc" }] }),
    getBalance(prisma, user.id),
  ]);
  return <StoreView products={products} balance={balance} buy={buyAction} />;
}
