// In-browser data layer for the static demo (GitHub Pages). State is a plain
// object persisted to localStorage; every operation runs the same rule checks
// as the server (src/lib/rules.ts).

import { CHALLENGE_IDEAS, STARTER_PRODUCTS } from "@/lib/catalogue";
import { RuleError } from "@/lib/errors";
import type { FeedFilter, FeedItem } from "@/lib/feed";
import {
  BANK_COLORS,
  DNA_COLORS,
  TRANSPARENT_PER_SPRINT,
  WALLET_COLORS,
  YELLOW_GIVER_ROLES,
  emptyBalance,
  isWalletColor,
  type Balance,
} from "@/lib/gems";
import { checkActivate, checkGive, checkPrize, cleanComment, cleanEntry, resolveSpend, type GiveInput } from "@/lib/rules";
import type { Quota } from "@/lib/sprint";
import { localDate, sprintWindow } from "@/lib/time";
import { DEMO_USERS, GIFT_COMMENTS, PERSONAS, type DemoUser } from "./fixture";

export const DEMO_VERSION = 1;

type Transfer = { id: string; sprint: number; fromId: string; toId: string; source: string; color: string; comment: string; createdAt: string };
type Entry = { id: string; userId: string; color: string; amount: number; kind: string; refId?: string; note?: string; createdAt: string };
type BankRow = { id: string; color: string; amount: number; kind: string; note: string; createdAt: string };
export type DemoProduct = {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  emoji: string | null;
  imageUrl: null;
  stock: number | null;
  active: boolean;
  sortOrder: number;
};
type Order = { id: string; userId: string; productId: string; price: number; spent: Balance; status: string; note: string | null; createdAt: string };
type Challenge = { id: string; title: string; description: string; emoji: string | null; status: string; startedAt: string | null; createdAt: string };
type ChallengeEntry = { id: string; challengeId: string; userId: string; text: string; link: string | null; prizeColor: string | null; prizeAmount: number | null; createdAt: string };

export type SprintInfo = { number: number; startsAt: string; endsAt: string };

export type DemoState = {
  v: number;
  meId: string | null;
  sprint: SprintInfo;
  pastSprints: (SprintInfo & { missed: number })[];
  users: DemoUser[];
  alloc: Record<string, { transparent: number; yellow: number }>;
  transfers: Transfer[];
  ledger: Entry[];
  bank: BankRow[];
  products: DemoProduct[];
  orders: Order[];
  challenges: Challenge[];
  entries: ChallengeEntry[];
};

/* ── Helpers ──────────────────────────────────────────────────────────── */

let counter = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(counter++).toString(36)}`;

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ymd = ({ y, m, d }: { y: number; m: number; d: number }) =>
  `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

export const userById = (s: DemoState, id: string) => s.users.find((u) => u.id === id) ?? null;

/* ── Initial state ────────────────────────────────────────────────────── */

/**
 * A fresh demo: the current sprint started 7–13 days ago (so it is always
 * mid-flight), with two finished sprints of history behind it.
 */
export function createDemoState(now = new Date()): DemoState {
  // Monday on or before (today − 7 days), in the program time zone.
  const t = localDate(new Date(now.getTime() - 7 * 86_400_000));
  const weekday = new Date(Date.UTC(t.y, t.m - 1, t.d)).getUTCDay(); // 0 = Sunday
  const monday = new Date(Date.UTC(t.y, t.m - 1, t.d) - ((weekday + 6) % 7) * 86_400_000);
  const start = ymd({ y: monday.getUTCFullYear(), m: monday.getUTCMonth() + 1, d: monday.getUTCDate() });
  const win = (n: number): SprintInfo => {
    const w = sprintWindow(n - 2, start); // sprint 3 is the current one
    return { number: n, startsAt: w.startsAt.toISOString(), endsAt: w.endsAt.toISOString() };
  };

  const rand = rng(20261012);
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)]!;
  const at = (from: string, to: string) =>
    new Date(new Date(from).getTime() + rand() * (new Date(to).getTime() - new Date(from).getTime())).toISOString();

  const users = DEMO_USERS;
  const reportsOf = (id: string) => users.filter((u) => u.managerId === id);
  const quotaOf = (u: DemoUser) => ({
    transparent: TRANSPARENT_PER_SPRINT,
    yellow: YELLOW_GIVER_ROLES.includes(u.role) ? reportsOf(u.id).length : 0,
  });

  const s: DemoState = {
    v: DEMO_VERSION,
    meId: null,
    sprint: win(3),
    pastSprints: [],
    users,
    alloc: Object.fromEntries(users.map((u) => [u.id, quotaOf(u)])),
    transfers: [],
    ledger: [],
    bank: [],
    products: STARTER_PRODUCTS.map((p, i) => ({ ...p, id: `p-${i + 1}`, imageUrl: null, active: true })),
    orders: [],
    challenges: CHALLENGE_IDEAS.map((c, i) => ({
      ...c,
      id: `c-${i + 1}`,
      status: "DRAFT",
      startedAt: null,
      createdAt: win(1).startsAt,
    })),
    entries: [],
  };

  const gift = (sprint: SprintInfo, fromId: string, toId: string, source: "TRANSPARENT" | "YELLOW", color: string, until: string) => {
    const createdAt = at(sprint.startsAt, until);
    const id = uid("t");
    s.transfers.push({ id, sprint: sprint.number, fromId, toId, source, color, comment: pick(GIFT_COMMENTS[color]!), createdAt });
    s.ledger.push({ id: uid("e"), userId: toId, color, amount: 1, kind: "TRANSFER", refId: id, createdAt });
  };

  // Two finished sprints: most people share most of their gems.
  for (const n of [1, 2]) {
    const sprint = win(n);
    let missed = 0;
    for (const u of users) {
      const q = quotaOf(u);
      const thanked = new Set<string>();
      const shareCount = rand() < 0.75 ? q.transparent : rand() < 0.5 ? 1 : 0;
      for (let i = 0; i < shareCount; i++) {
        let to = pick(users);
        while (to.id === u.id || thanked.has(to.id)) to = pick(users);
        thanked.add(to.id);
        gift(sprint, u.id, to.id, "TRANSPARENT", pick(DNA_COLORS), sprint.endsAt);
      }
      let yellowGiven = 0;
      for (const r of reportsOf(u.id)) {
        if (q.yellow > 0 && rand() < 0.8) {
          gift(sprint, u.id, r.id, "YELLOW", "YELLOW", sprint.endsAt);
          yellowGiven++;
        }
      }
      const unusedT = q.transparent - shareCount;
      const unusedY = q.yellow - yellowGiven;
      missed += unusedT + unusedY;
      if (unusedT) s.bank.push({ id: uid("b"), color: "TRANSPARENT", amount: unusedT, kind: "MISSED", note: `Missed Opportunities · Sprint ${n}`, createdAt: sprint.endsAt });
      if (unusedY) s.bank.push({ id: uid("b"), color: "YELLOW", amount: unusedY, kind: "MISSED", note: `Missed Opportunities · Sprint ${n}`, createdAt: sprint.endsAt });
      if (n === 1 && unusedT === 0 && unusedY === 0) {
        s.ledger.push({ id: uid("e"), userId: u.id, color: "PURPLE", amount: 1, kind: "SIGNUP_BONUS", note: "Sign-up bonus", createdAt: sprint.endsAt });
      }
    }
    s.pastSprints.push({ ...sprint, missed });
  }

  // Current sprint so far — personas keep their full quota to play with.
  const personaIds = new Set(PERSONAS.map((p) => p.id));
  const nowIso = now.toISOString();
  for (const u of users) {
    if (personaIds.has(u.id) || rand() < 0.45) continue;
    let to = pick(users);
    while (to.id === u.id) to = pick(users);
    gift(s.sprint, u.id, to.id, "TRANSPARENT", pick(DNA_COLORS), nowIso);
  }

  // Challenges: one finished with a winner, two running with entries.
  const [docs, samurai, , tool] = s.challenges;
  samurai!.status = "CLOSED";
  samurai!.startedAt = win(2).startsAt;
  const winner = users[11]!; // Oleh
  const entry: ChallengeEntry = {
    id: uid("ce"),
    challengeId: samurai!.id,
    userId: winner.id,
    text: "A one-page meeting template with agenda, pre-reads and decision log — adopted by three teams.",
    link: null,
    prizeColor: "GREEN",
    prizeAmount: 3,
    createdAt: win(2).startsAt,
  };
  s.entries.push(entry);
  s.bank.push({ id: uid("b"), color: "TRANSPARENT", amount: -3, kind: "CHALLENGE_PRIZE", note: samurai!.title, createdAt: win(2).endsAt });
  s.ledger.push({ id: uid("e"), userId: winner.id, color: "GREEN", amount: 3, kind: "CHALLENGE_PRIZE", refId: entry.id, note: samurai!.title, createdAt: win(2).endsAt });

  for (const c of [docs!, tool!]) {
    c.status = "ACTIVE";
    c.startedAt = s.sprint.startsAt;
  }
  s.entries.push(
    { id: uid("ce"), challengeId: docs!.id, userId: users[12]!.id, text: "Restructured the Product wiki: every project now has a 5-minute ‘start here’ page with owners and links.", link: "https://example.com/wiki", prizeColor: null, prizeAmount: null, createdAt: at(s.sprint.startsAt, nowIso) },
    { id: uid("ce"), challengeId: tool!.id, userId: users[17]!.id, text: "A script that builds the weekly eCRM performance deck automatically — saves about 3 hours every Monday.", link: null, prizeColor: null, prizeAmount: null, createdAt: at(s.sprint.startsAt, nowIso) },
  );

  // A few redemptions so the store and admin have history.
  for (const [userIdx, productIdx, status] of [[16, 0, "FULFILLED"], [7, 3, "PENDING"], [19, 0, "PENDING"]] as const) {
    const u = users[userIdx]!;
    const product = s.products[productIdx]!;
    try {
      const spend = resolveSpend(balanceOf(s, u.id), product.price);
      const id = uid("o");
      const createdAt = at(s.sprint.startsAt, nowIso);
      s.orders.push({ id, userId: u.id, productId: product.id, price: product.price, spent: spend, status, note: null, createdAt });
      for (const c of WALLET_COLORS) {
        if (spend[c]) s.ledger.push({ id: uid("e"), userId: u.id, color: c, amount: -spend[c], kind: "PURCHASE", refId: id, note: product.name, createdAt });
      }
    } catch {
      // Not enough gems in this random history — skip.
    }
  }
  return s;
}

/* ── Selectors ────────────────────────────────────────────────────────── */

export function balanceOf(s: DemoState, userId: string): Balance {
  const b = emptyBalance();
  for (const e of s.ledger) if (e.userId === userId && isWalletColor(e.color)) b[e.color] += e.amount;
  return b;
}

export function collectionOf(s: DemoState, userId: string): Balance {
  const b = emptyBalance();
  for (const e of s.ledger) {
    if (e.userId === userId && e.amount > 0 && e.kind !== "REFUND" && isWalletColor(e.color)) b[e.color] += e.amount;
  }
  return b;
}

export function bankOf(s: DemoState) {
  const b = Object.fromEntries(BANK_COLORS.map((c) => [c, 0])) as Record<(typeof BANK_COLORS)[number], number>;
  for (const r of s.bank) b[r.color as keyof typeof b] += r.amount;
  return b;
}

export function quotaOf(s: DemoState, userId: string): Quota {
  const alloc = s.alloc[userId];
  const sent = s.transfers.filter((t) => t.sprint === s.sprint.number && t.fromId === userId);
  const tUsed = sent.filter((t) => t.source === "TRANSPARENT");
  const yUsed = sent.filter((t) => t.source === "YELLOW");
  const yellowTotal = alloc?.yellow ?? 0;
  const yellowLeft = Math.max(0, yellowTotal - yUsed.length);
  const gotYellow = new Set(
    s.transfers.filter((t) => t.sprint === s.sprint.number && t.source === "YELLOW").map((t) => t.toId),
  );
  return {
    transparentTotal: alloc?.transparent ?? 0,
    transparentLeft: Math.max(0, (alloc?.transparent ?? 0) - tUsed.length),
    yellowTotal,
    yellowLeft,
    thankedIds: tUsed.map((t) => t.toId),
    yellowPendingIds: yellowLeft > 0 ? s.users.filter((u) => u.managerId === userId && !gotYellow.has(u.id)).map((u) => u.id) : [],
  };
}

const person = (s: DemoState, id: string) => {
  const u = userById(s, id)!;
  return { id: u.id, name: u.name, avatarUrl: u.avatarUrl };
};

export function feedOf(s: DemoState, { color, userId, cursor, take = 20 }: FeedFilter) {
  const items: FeedItem[] = [
    ...s.transfers
      .filter((t) => (!userId || t.fromId === userId || t.toId === userId) && (!color || t.color === color))
      .map((t) => ({
        id: t.id,
        kind: "TRANSFER" as const,
        color: t.color,
        amount: 1,
        comment: t.comment,
        createdAt: t.createdAt,
        from: person(s, t.fromId),
        to: person(s, t.toId),
      })),
    ...s.ledger
      .filter((e) => e.kind === "CHALLENGE_PRIZE" && (!userId || e.userId === userId) && (!color || e.color === color))
      .map((e) => ({
        id: e.id,
        kind: "PRIZE" as const,
        color: e.color,
        amount: e.amount,
        comment: e.note ?? "",
        createdAt: e.createdAt,
        from: null,
        to: person(s, e.userId),
        challenge: e.note,
      })),
  ]
    .filter((i) => !cursor || i.createdAt < cursor)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, take);
  return { items, nextCursor: items.length === take ? items[items.length - 1]!.createdAt : null };
}

export function receivedTotals(s: DemoState) {
  const m = new Map<string, number>();
  for (const e of s.ledger) if (e.amount > 0 && e.kind !== "REFUND") m.set(e.userId, (m.get(e.userId) ?? 0) + e.amount);
  return m;
}

/* ── Operations (mutate a draft; throw RuleError on violations) ───────── */

export function give(s: DemoState, fromId: string, input: Omit<GiveInput, "fromId">, now = new Date()) {
  const full = { ...input, fromId };
  const comment = cleanComment(input.comment);
  if (now.toISOString() >= s.sprint.endsAt) throw new RuleError("This demo sprint has ended — reset the demo to start a new one.");
  const cur = s.transfers.filter((t) => t.sprint === s.sprint.number);
  checkGive(full, {
    from: userById(s, fromId),
    to: userById(s, input.toId),
    alloc: s.alloc[fromId] ?? null,
    usedTransparent: cur.filter((t) => t.fromId === fromId && t.source === "TRANSPARENT").length,
    repeatTransparent: cur.filter((t) => t.fromId === fromId && t.toId === input.toId && t.source === "TRANSPARENT").length,
    usedYellow: cur.filter((t) => t.fromId === fromId && t.source === "YELLOW").length,
    recipientYellow: cur.filter((t) => t.toId === input.toId && t.source === "YELLOW").length,
  });
  const id = uid("t");
  const createdAt = now.toISOString();
  s.transfers.push({ id, sprint: s.sprint.number, fromId, toId: input.toId, source: input.source, color: input.color, comment, createdAt });
  s.ledger.push({ id: uid("e"), userId: input.toId, color: input.color, amount: 1, kind: "TRANSFER", refId: id, createdAt });
}

export function buy(s: DemoState, userId: string, productId: string, spendInput?: Partial<Balance>) {
  const product = s.products.find((p) => p.id === productId);
  if (!product?.active) throw new RuleError("This reward is no longer available.");
  if (product.stock !== null && product.stock <= 0) throw new RuleError("Out of stock — check back soon.");
  const spend = resolveSpend(balanceOf(s, userId), product.price, spendInput);
  if (product.stock !== null) product.stock--;
  const id = uid("o");
  const createdAt = new Date().toISOString();
  s.orders.push({ id, userId, productId, price: product.price, spent: spend, status: "PENDING", note: null, createdAt });
  for (const c of WALLET_COLORS) {
    if (spend[c]) s.ledger.push({ id: uid("e"), userId, color: c, amount: -spend[c], kind: "PURCHASE", refId: id, note: product.name, createdAt });
  }
}

export function setOrderStatus(s: DemoState, orderId: string, status: "FULFILLED" | "REJECTED", note?: string) {
  const order = s.orders.find((o) => o.id === orderId);
  if (!order) throw new RuleError("Order not found.");
  if (order.status !== "PENDING") throw new RuleError("This order is already processed.");
  order.status = status;
  order.note = note || null;
  if (status === "REJECTED") {
    const product = s.products.find((p) => p.id === order.productId);
    for (const c of WALLET_COLORS) {
      if (order.spent[c]) {
        s.ledger.push({ id: uid("e"), userId: order.userId, color: c, amount: order.spent[c], kind: "REFUND", refId: order.id, note: `Refund: ${product?.name}`, createdAt: new Date().toISOString() });
      }
    }
    if (product && product.stock !== null) product.stock++;
  }
}

export function submitEntry(s: DemoState, userId: string, challengeId: string, text: string, link: string) {
  const entry = cleanEntry(text, link);
  const challenge = s.challenges.find((c) => c.id === challengeId);
  if (challenge?.status !== "ACTIVE") throw new RuleError("This challenge is not accepting entries.");
  const existing = s.entries.find((e) => e.challengeId === challengeId && e.userId === userId);
  if (existing) Object.assign(existing, entry);
  else s.entries.push({ id: uid("ce"), challengeId, userId, ...entry, prizeColor: null, prizeAmount: null, createdAt: new Date().toISOString() });
}

export function setChallengeStatus(s: DemoState, id: string, status: "DRAFT" | "ACTIVE" | "CLOSED") {
  const c = s.challenges.find((x) => x.id === id);
  if (!c) throw new RuleError("Challenge not found.");
  if (status === "ACTIVE") {
    checkActivate(s.challenges.filter((x) => x.status === "ACTIVE" && x.id !== id).length);
    c.startedAt = new Date().toISOString();
  }
  c.status = status;
}

export function createChallenge(s: DemoState, input: { title: string; description: string; emoji: string }) {
  if (input.title.trim().length < 3) throw new RuleError("Give the challenge a title.");
  if (input.description.trim().length < 10) throw new RuleError("Describe the challenge.");
  s.challenges.unshift({
    id: uid("c"),
    title: input.title.trim(),
    description: input.description.trim(),
    emoji: input.emoji.trim() || null,
    status: "DRAFT",
    startedAt: null,
    createdAt: new Date().toISOString(),
  });
}

export function awardPrize(s: DemoState, entryId: string, bankColor: string, amount: number, convertTo?: string) {
  const entry = s.entries.find((e) => e.id === entryId);
  if (!entry) throw new RuleError("Entry not found.");
  if (entry.prizeAmount) throw new RuleError("This entry already has a prize.");
  const bank = bankOf(s);
  const walletColor = checkPrize(bankColor, amount, bank[bankColor as keyof typeof bank] ?? 0, convertTo);
  const title = s.challenges.find((c) => c.id === entry.challengeId)?.title ?? "Challenge";
  const createdAt = new Date().toISOString();
  s.bank.push({ id: uid("b"), color: bankColor, amount: -amount, kind: "CHALLENGE_PRIZE", note: title, createdAt });
  s.ledger.push({ id: uid("e"), userId: entry.userId, color: walletColor, amount, kind: "CHALLENGE_PRIZE", refId: entry.id, note: title, createdAt });
  entry.prizeColor = walletColor;
  entry.prizeAmount = amount;
}

export function saveProduct(
  s: DemoState,
  input: { id?: string; name: string; description: string; category: string; price: number; emoji: string; stock: number | null; active: boolean },
) {
  if (input.name.trim().length < 2) throw new RuleError("Name the reward.");
  if (!Number.isInteger(input.price) || input.price < 1) throw new RuleError("Price must be at least 1 gem.");
  if (input.stock !== null && (!Number.isInteger(input.stock) || input.stock < 0)) {
    throw new RuleError("Stock must be a whole number or empty for unlimited.");
  }
  const data = {
    name: input.name.trim(),
    description: input.description.trim(),
    category: input.category,
    price: input.price,
    emoji: input.emoji.trim() || null,
    stock: input.stock,
    active: input.active,
  };
  const existing = input.id ? s.products.find((p) => p.id === input.id) : null;
  if (existing) Object.assign(existing, data);
  else s.products.push({ ...data, id: uid("p"), imageUrl: null, sortOrder: s.products.length + 1 });
}
