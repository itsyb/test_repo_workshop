import type { Db } from "./db";
import { RuleError } from "./errors";
import { getBankBalance } from "./ledger";
import { checkActivate, checkPrize, cleanEntry } from "./rules";

export { MAX_ACTIVE_CHALLENGES } from "./rules";

export async function setChallengeStatus(db: Db, id: string, status: "DRAFT" | "ACTIVE" | "CLOSED", now = new Date()) {
  return db.$transaction(async (tx) => {
    if (status === "ACTIVE") checkActivate(await tx.challenge.count({ where: { status: "ACTIVE", id: { not: id } } }));
    return tx.challenge.update({
      where: { id },
      data: {
        status,
        ...(status === "ACTIVE" ? { startsAt: now, endsAt: null } : {}),
        ...(status === "CLOSED" ? { endsAt: now } : {}),
      },
    });
  });
}

export async function submitEntry(db: Db, challengeId: string, userId: string, text: string, link?: string) {
  const entry = cleanEntry(text, link);
  const challenge = await db.challenge.findUnique({ where: { id: challengeId } });
  if (challenge?.status !== "ACTIVE") throw new RuleError("This challenge is not accepting entries.");
  return db.challengeEntry.upsert({
    where: { challengeId_userId: { challengeId, userId } },
    create: { challengeId, userId, ...entry },
    update: entry,
  });
}

/** Pays a challenge prize out of the SFP Bank (see checkPrize). */
export async function awardPrize(db: Db, entryId: string, bankColor: string, amount: number, convertTo?: string) {
  return db.$transaction(async (tx) => {
    const entry = await tx.challengeEntry.findUnique({ where: { id: entryId }, include: { challenge: true } });
    if (!entry) throw new RuleError("Entry not found.");
    if (entry.prizeAmount) throw new RuleError("This entry already has a prize.");
    const bank = await getBankBalance(tx);
    const walletColor = checkPrize(bankColor, amount, bank[bankColor as keyof typeof bank] ?? 0, convertTo);
    await tx.bankEntry.create({
      data: { color: bankColor, amount: -amount, kind: "CHALLENGE_PRIZE", note: entry.challenge.title },
    });
    await tx.gemEntry.create({
      data: { userId: entry.userId, color: walletColor, amount, kind: "CHALLENGE_PRIZE", refId: entry.id, note: entry.challenge.title },
    });
    return tx.challengeEntry.update({ where: { id: entryId }, data: { prizeColor: walletColor, prizeAmount: amount } });
  });
}
