import { WALLET_COLORS, emptyBalance, total, type Balance } from "./gems";

/**
 * Every wallet colour has the same value in the store. When the buyer doesn't
 * choose, take from the largest piles first.
 */
export function autoSpend(balance: Balance, price: number): Balance | null {
  if (total(balance) < price) return null;
  const spend = emptyBalance();
  for (let left = price; left > 0; left--) {
    const color = WALLET_COLORS.reduce((best, c) => (balance[c] - spend[c] > balance[best] - spend[best] ? c : best));
    spend[color]++;
  }
  return spend;
}
