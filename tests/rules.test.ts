import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { syncSprints, getQuota } from "../src/lib/sprint";
import { giveGem } from "../src/lib/give";
import { getBalance, getBankBalance } from "../src/lib/ledger";
import { purchase, setOrderStatus } from "../src/lib/store";
import { setChallengeStatus, submitEntry, awardPrize } from "../src/lib/challenges";
import { RuleError } from "../src/lib/db";

const db = new PrismaClient();
const SPRINT1 = new Date("2026-10-13T09:00:00Z");
const SPRINT2 = new Date("2026-10-27T09:00:00Z");
const why = "Thanks for the amazing help this sprint!";
let L: string, A: string, B: string, C: string, E: string;

before(async () => {
  const mk = (email: string, role: string, managerId?: string) =>
    db.user.create({ data: { email, name: email.split("@")[0], role, managerId } });
  E = (await mk("exec@x.com", "EXECUTIVE")).id;
  L = (await mk("lead@x.com", "LEAD", E)).id;
  A = (await mk("anna@x.com", "MEMBER", L)).id;
  B = (await mk("bohdan@x.com", "MEMBER", L)).id;
  C = (await mk("cyril@x.com", "MEMBER", E)).id;
});
after(() => db.$disconnect());

const rejects = (p: Promise<unknown>, re: RegExp) =>
  assert.rejects(p, (e: unknown) => e instanceof RuleError && re.test((e as Error).message));

test("no sprint before program start", async () => {
  assert.equal(await syncSprints(db, new Date("2026-10-07T09:00:00Z")), null);
});

test("sprint opens with 2 transparent each and 1 yellow per direct report for leads", async () => {
  const s = await syncSprints(db, SPRINT1);
  assert.equal(s?.number, 1);
  const allocs = await db.allocation.findMany({ where: { sprintId: s!.id } });
  assert.equal(allocs.length, 5);
  assert.deepEqual(
    allocs.map((a) => [a.userId, a.transparent, a.yellow]).sort(),
    [[A, 2, 0], [B, 2, 0], [C, 2, 0], [E, 2, 0], [L, 2, 2]].sort(),
  );
  assert.equal((await syncSprints(db, SPRINT1))?.id, s!.id, "idempotent");
});

test("transparent gems: converted to DNA colour, one per recipient, quota of two", async () => {
  await giveGem(db, { fromId: A, toId: C, source: "TRANSPARENT", color: "BLUE", comment: why }, SPRINT1);
  await rejects(giveGem(db, { fromId: A, toId: C, source: "TRANSPARENT", color: "GREEN", comment: why }, SPRINT1), /already thanked/);
  await rejects(giveGem(db, { fromId: A, toId: A, source: "TRANSPARENT", color: "GREEN", comment: why }, SPRINT1), /yourself/);
  await rejects(giveGem(db, { fromId: A, toId: L, source: "TRANSPARENT", color: "GREEN", comment: "thanks!" }, SPRINT1), /at least 20/);
  await rejects(giveGem(db, { fromId: A, toId: L, source: "TRANSPARENT", color: "YELLOW", comment: why }, SPRINT1), /Blue, Purple or Green/);
  await giveGem(db, { fromId: A, toId: L, source: "TRANSPARENT", color: "PURPLE", comment: why }, SPRINT1);
  await rejects(giveGem(db, { fromId: A, toId: E, source: "TRANSPARENT", color: "GREEN", comment: why }, SPRINT1), /all your Transparent/);
  assert.deepEqual(await getBalance(db, C), { BLUE: 1, PURPLE: 0, GREEN: 0, YELLOW: 0 });
});

test("yellow gems: only leads/managers, only to own reports, one per sprint", async () => {
  await rejects(giveGem(db, { fromId: L, toId: C, source: "YELLOW", color: "YELLOW", comment: why }, SPRINT1), /direct reports/);
  await rejects(giveGem(db, { fromId: C, toId: A, source: "YELLOW", color: "YELLOW", comment: why }, SPRINT1), /Only Leads/);
  await giveGem(db, { fromId: L, toId: A, source: "YELLOW", color: "YELLOW", comment: why }, SPRINT1);
  await rejects(giveGem(db, { fromId: L, toId: A, source: "YELLOW", color: "YELLOW", comment: why }, SPRINT1), /already has a Yellow/);
  const q = await getQuota(db, (await syncSprints(db, SPRINT1))!.id, L);
  assert.equal(q.yellowLeft, 1);
  assert.deepEqual(q.yellowPendingIds, [B]);
});

test("newcomer mid-sprint receives quota from the next sprint", async () => {
  const D = (await db.user.create({ data: { email: "dana@x.com", name: "dana" } })).id;
  await rejects(giveGem(db, { fromId: D, toId: A, source: "TRANSPARENT", color: "GREEN", comment: why }, SPRINT1), /next sprint/);
  await giveGem(db, { fromId: C, toId: D, source: "TRANSPARENT", color: "GREEN", comment: why }, SPRINT1);
});

test("sprint close burns unused quota into the bank and pays the sign-up bonus", async () => {
  const s2 = await syncSprints(db, SPRINT2);
  assert.equal(s2?.number, 2);
  const bank = await getBankBalance(db);
  // transparent: 5 users × 2 = 10, used A2 + C1 = 3 → 7 missed; yellow: 2 − 1 = 1
  assert.equal(bank.TRANSPARENT, 7);
  assert.equal(bank.YELLOW, 1);
  // A shared everything in sprint 1 → +1 purple. Received yellow from L.
  assert.deepEqual(await getBalance(db, A), { BLUE: 0, PURPLE: 1, GREEN: 0, YELLOW: 1 });
  assert.equal(await db.gemEntry.count({ where: { kind: "SIGNUP_BONUS" } }), 1);
  // Dana joined mid-sprint 1, so gets quota now.
  const dana = await db.user.findUniqueOrThrow({ where: { email: "dana@x.com" } });
  assert.ok(await db.allocation.findUnique({ where: { sprintId_userId: { sprintId: s2!.id, userId: dana.id } } }));
  // Closing again changes nothing.
  await syncSprints(db, SPRINT2);
  assert.equal((await getBankBalance(db)).TRANSPARENT, 7);
});

test("store: any colour pays, refunds on rejection", async () => {
  const p = await db.product.create({ data: { name: "Book voucher", description: "d", category: "OTHER", price: 2, stock: 1 } });
  await rejects(purchase(db, C, p.id), /Not enough/);
  const order = await purchase(db, A, p.id); // A has 1 purple + 1 yellow
  assert.deepEqual(await getBalance(db, A), { BLUE: 0, PURPLE: 0, GREEN: 0, YELLOW: 0 });
  await rejects(purchase(db, L, p.id), /Out of stock/);
  await setOrderStatus(db, order.id, "REJECTED");
  assert.deepEqual(await getBalance(db, A), { BLUE: 0, PURPLE: 1, GREEN: 0, YELLOW: 1 });
  assert.equal((await db.product.findUniqueOrThrow({ where: { id: p.id } })).stock, 1);
  await rejects(purchase(db, A, p.id, { PURPLE: 2 }), /don't have enough/);
  await purchase(db, A, p.id, { PURPLE: 1, YELLOW: 1 });
});

test("challenges: max two active, prizes paid from the bank", async () => {
  const mk = (title: string) => db.challenge.create({ data: { title, description: "d" } });
  const [c1, c2, c3] = [await mk("One"), await mk("Two"), await mk("Three")];
  await setChallengeStatus(db, c1.id, "ACTIVE");
  await setChallengeStatus(db, c2.id, "ACTIVE");
  await rejects(setChallengeStatus(db, c3.id, "ACTIVE"), /Only 2/);
  const entry = await submitEntry(db, c1.id, B, "My documentation overhaul for the CRM project");
  await rejects(awardPrize(db, entry.id, "TRANSPARENT", 3), /Choose Blue/);
  await rejects(awardPrize(db, entry.id, "YELLOW", 5), /Not enough/);
  await awardPrize(db, entry.id, "TRANSPARENT", 3, "GREEN");
  assert.equal((await getBalance(db, B)).GREEN, 3);
  assert.equal((await getBankBalance(db)).TRANSPARENT, 4);
  await rejects(awardPrize(db, entry.id, "TRANSPARENT", 1, "GREEN"), /already has a prize/);
});
