import { RuleError, type Db } from "./db";
import { isDnaColor, isWalletColor } from "./gems";
import { getBankBalance } from "./ledger";

export const MAX_ACTIVE_CHALLENGES = 2;

export async function setChallengeStatus(db: Db, id: string, status: "DRAFT" | "ACTIVE" | "CLOSED", now = new Date()) {
  return db.$transaction(async (tx) => {
    if (status === "ACTIVE") {
      const active = await tx.challenge.count({ where: { status: "ACTIVE", id: { not: id } } });
      if (active >= MAX_ACTIVE_CHALLENGES) {
        throw new RuleError(`Only ${MAX_ACTIVE_CHALLENGES} challenges can run at once — close one first.`);
      }
    }
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
  const clean = text.trim();
  if (clean.length < 20) throw new RuleError("Describe your entry in at least 20 characters.");
  if (clean.length > 1500) throw new RuleError("Keep it under 1500 characters.");
  if (link && !/^https?:\/\//i.test(link)) throw new RuleError("Links must start with http:// or https://");
  const challenge = await db.challenge.findUnique({ where: { id: challengeId } });
  if (challenge?.status !== "ACTIVE") throw new RuleError("This challenge is not accepting entries.");
  return db.challengeEntry.upsert({
    where: { challengeId_userId: { challengeId, userId } },
    create: { challengeId, userId, text: clean, link: link || null },
    update: { text: clean, link: link || null },
  });
}

/**
 * Pays a challenge prize out of the SFP Bank. Transparent gems in the bank are
 * converted to the chosen DNA colour on payout, like any Transparent gift.
 */
export async function awardPrize(db: Db, entryId: string, bankColor: string, amount: number, convertTo?: string) {
  if (!Number.isInteger(amount) || amount < 1) throw new RuleError("Prize must be at least 1 gem.");
  const walletColor = bankColor === "TRANSPARENT" ? convertTo : bankColor;
  if (bankColor === "TRANSPARENT" && !isDnaColor(convertTo ?? "")) {
    throw new RuleError("Choose Blue, Purple or Green for Transparent bank gems.");
  }
  if (!walletColor || !isWalletColor(walletColor)) throw new RuleError("Unknown gem colour.");

  return db.$transaction(async (tx) => {
    const entry = await tx.challengeEntry.findUnique({ where: { id: entryId }, include: { challenge: true } });
    if (!entry) throw new RuleError("Entry not found.");
    if (entry.prizeAmount) throw new RuleError("This entry already has a prize.");
    const bank = await getBankBalance(tx);
    if ((bank[bankColor as keyof typeof bank] ?? 0) < amount) {
      throw new RuleError("Not enough gems of that colour in the SFP Bank.");
    }
    await tx.bankEntry.create({
      data: { color: bankColor, amount: -amount, kind: "CHALLENGE_PRIZE", note: entry.challenge.title },
    });
    await tx.gemEntry.create({
      data: {
        userId: entry.userId,
        color: walletColor,
        amount,
        kind: "CHALLENGE_PRIZE",
        refId: entry.id,
        note: entry.challenge.title,
      },
    });
    return tx.challengeEntry.update({ where: { id: entryId }, data: { prizeColor: walletColor, prizeAmount: amount } });
  });
}
