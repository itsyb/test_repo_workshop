import { RuleError, type Db } from "./db";
import { WALLET_COLORS, type Balance } from "./gems";
import { getBalance } from "./ledger";
import { resolveSpend } from "./rules";

export async function purchase(db: Db, userId: string, productId: string, spendInput?: Partial<Balance>) {
  return db.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: productId } });
    if (!product?.active) throw new RuleError("This reward is no longer available.");
    if (product.stock !== null && product.stock <= 0) throw new RuleError("Out of stock — check back soon.");

    const spend = resolveSpend(await getBalance(tx, userId), product.price, spendInput);

    if (product.stock !== null) {
      const dec = await tx.product.updateMany({
        where: { id: product.id, stock: { gt: 0 } },
        data: { stock: { decrement: 1 } },
      });
      if (dec.count === 0) throw new RuleError("Out of stock — check back soon.");
    }

    const order = await tx.order.create({
      data: { userId, productId, price: product.price, spent: JSON.stringify(spend) },
    });
    await tx.gemEntry.createMany({
      data: WALLET_COLORS.filter((c) => spend[c] > 0).map((c) => ({
        userId,
        color: c,
        amount: -spend[c],
        kind: "PURCHASE",
        refId: order.id,
        note: product.name,
      })),
    });
    return order;
  });
}

export async function setOrderStatus(db: Db, orderId: string, status: "FULFILLED" | "REJECTED", note?: string) {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { product: true } });
    if (!order) throw new RuleError("Order not found.");
    if (order.status !== "PENDING") throw new RuleError("This order is already processed.");
    await tx.order.update({ where: { id: orderId }, data: { status, note: note || null } });
    if (status === "REJECTED") {
      const spent = JSON.parse(order.spent) as Balance;
      await tx.gemEntry.createMany({
        data: WALLET_COLORS.filter((c) => spent[c] > 0).map((c) => ({
          userId: order.userId,
          color: c,
          amount: spent[c],
          kind: "REFUND",
          refId: order.id,
          note: `Refund: ${order.product.name}`,
        })),
      });
      if (order.product.stock !== null) {
        await tx.product.update({ where: { id: order.productId }, data: { stock: { increment: 1 } } });
      }
    }
  });
}
