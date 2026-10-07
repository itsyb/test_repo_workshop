// Program rules as pure functions. The server (Prisma) and the static demo
// (browser state) gather the same facts and run them through these checks,
// so both behave identically.

import { RuleError } from "./errors";
import {
  COMMENT_MAX,
  COMMENT_MIN,
  WALLET_COLORS,
  YELLOW_GIVER_ROLES,
  emptyBalance,
  isDnaColor,
  isWalletColor,
  total,
  type Balance,
  type GemSource,
} from "./gems";
import { autoSpend } from "./store-spend";

export const MAX_ACTIVE_CHALLENGES = 2;

export type GiveInput = {
  fromId: string;
  toId: string;
  source: GemSource;
  /** BLUE | PURPLE | GREEN for a Transparent gem; YELLOW for a Yellow one. */
  color: string;
  comment: string;
};

export function cleanComment(raw: string): string {
  const comment = raw.trim().replace(/\s+/g, " ");
  if (comment.length < COMMENT_MIN) throw new RuleError(`Tell them why — at least ${COMMENT_MIN} characters.`);
  if (comment.length > COMMENT_MAX) throw new RuleError(`Keep it under ${COMMENT_MAX} characters.`);
  return comment;
}

export type GiveFacts = {
  from: { active: boolean; role: string } | null;
  to: { active: boolean; name: string; managerId: string | null } | null;
  alloc: { transparent: number; yellow: number } | null;
  /** Transparent gems the giver already used this sprint. */
  usedTransparent: number;
  /** Transparent gems the giver already gave this recipient this sprint. */
  repeatTransparent: number;
  /** Yellow gems the giver already used this sprint. */
  usedYellow: number;
  /** Yellow gems the recipient already received this sprint. */
  recipientYellow: number;
};

/**
 * Giving a gem:
 *  - every gift carries a public comment of at least 20 characters;
 *  - no gifts to yourself; both people must be active participants;
 *  - the giver needs a quota for this sprint (newcomers wait for the next one);
 *  - Transparent → Blue/Purple/Green, at most one per recipient per sprint;
 *  - Yellow → Leads/Managers only, to their own direct reports, one per report per sprint;
 *  - gifts are final (there is no cancel).
 */
export function checkGive(input: GiveInput, facts: GiveFacts) {
  if (input.fromId === input.toId) throw new RuleError("You can't give a gem to yourself.");
  const { from, to, alloc } = facts;
  if (!from?.active) throw new RuleError("Your account is not active.");
  if (!to?.active) throw new RuleError("This person is not part of the program.");
  if (!alloc) throw new RuleError("You'll receive gems to give starting next sprint.");

  if (input.source === "TRANSPARENT") {
    if (!isDnaColor(input.color)) throw new RuleError("Choose Blue, Purple or Green for a Transparent gem.");
    if (facts.usedTransparent >= alloc.transparent) throw new RuleError("You've shared all your Transparent gems this sprint.");
    if (facts.repeatTransparent > 0) throw new RuleError(`You've already thanked ${to.name} this sprint — spread the love.`);
  } else if (input.source === "YELLOW") {
    if (input.color !== "YELLOW") throw new RuleError("A Yellow gem stays Yellow.");
    if (!YELLOW_GIVER_ROLES.includes(from.role)) throw new RuleError("Only Leads and Managers give Yellow gems.");
    if (to.managerId !== input.fromId) throw new RuleError("Yellow gems go to your direct reports only.");
    if (facts.usedYellow >= alloc.yellow) throw new RuleError("You've given all your Yellow gems this sprint.");
    if (facts.recipientYellow > 0) throw new RuleError(`${to.name} already has a Yellow gem this sprint.`);
  } else {
    throw new RuleError("Unknown gem type.");
  }
}

/**
 * Which gems pay for a reward. All wallet colours are worth the same; the
 * buyer may pick, otherwise the largest piles are used first.
 */
export function resolveSpend(balance: Balance, price: number, spendInput?: Partial<Balance>): Balance {
  if (!spendInput) {
    const spend = autoSpend(balance, price);
    if (!spend) throw new RuleError("Not enough gems yet — keep collecting.");
    return spend;
  }
  const spend = emptyBalance();
  for (const [c, n] of Object.entries(spendInput)) {
    if (!isWalletColor(c) || !Number.isInteger(n) || (n as number) < 0) throw new RuleError("Invalid gem selection.");
    spend[c] = n as number;
  }
  if (total(spend) !== price) throw new RuleError(`Select exactly ${price} gems.`);
  for (const c of WALLET_COLORS) {
    if (spend[c] > balance[c]) throw new RuleError("You don't have enough of those gems.");
  }
  return spend;
}

export function checkActivate(otherActive: number) {
  if (otherActive >= MAX_ACTIVE_CHALLENGES) {
    throw new RuleError(`Only ${MAX_ACTIVE_CHALLENGES} challenges can run at once — close one first.`);
  }
}

export function cleanEntry(text: string, link?: string) {
  const clean = text.trim();
  if (clean.length < 20) throw new RuleError("Describe your entry in at least 20 characters.");
  if (clean.length > 1500) throw new RuleError("Keep it under 1500 characters.");
  const l = link?.trim() || undefined;
  if (l && !/^https?:\/\//i.test(l)) throw new RuleError("Links must start with http:// or https://");
  return { text: clean, link: l ?? null };
}

/**
 * Challenge prizes are paid from the SFP Bank. Transparent bank gems are
 * converted to the chosen DNA colour on payout. Returns the wallet colour.
 */
export function checkPrize(bankColor: string, amount: number, inBank: number, convertTo?: string) {
  if (!Number.isInteger(amount) || amount < 1) throw new RuleError("Prize must be at least 1 gem.");
  if (bankColor === "TRANSPARENT" && !isDnaColor(convertTo ?? "")) {
    throw new RuleError("Choose Blue, Purple or Green for Transparent bank gems.");
  }
  const walletColor = bankColor === "TRANSPARENT" ? convertTo! : bankColor;
  if (!isWalletColor(walletColor)) throw new RuleError("Unknown gem colour.");
  if (inBank < amount) throw new RuleError("Not enough gems of that colour in the SFP Bank.");
  return walletColor;
}
