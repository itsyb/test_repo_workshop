import { RuleError, type Db } from "./db";
import { COMMENT_MAX, COMMENT_MIN, YELLOW_GIVER_ROLES, isDnaColor, type GemSource } from "./gems";

export type GiveInput = {
  fromId: string;
  toId: string;
  source: GemSource;
  /** BLUE | PURPLE | GREEN for a Transparent gem; YELLOW for a Yellow one. */
  color: string;
  comment: string;
};

/**
 * Program rules for giving a gem (all checked inside one transaction):
 *  - a sprint must be running and the giver must have quota left;
 *  - no gifts to yourself; recipient must be an active participant;
 *  - every gift carries a public comment of at least 20 characters;
 *  - Transparent → converted to Blue/Purple/Green; at most one per recipient per sprint;
 *  - Yellow → Leads/Managers only, to their own direct reports, one per report per sprint;
 *  - gifts are final (no cancel).
 */
export async function giveGem(db: Db, input: GiveInput, now = new Date()) {
  const comment = input.comment.trim().replace(/\s+/g, " ");
  if (comment.length < COMMENT_MIN) {
    throw new RuleError(`Tell them why — at least ${COMMENT_MIN} characters.`);
  }
  if (comment.length > COMMENT_MAX) throw new RuleError(`Keep it under ${COMMENT_MAX} characters.`);
  if (input.fromId === input.toId) throw new RuleError("You can't give a gem to yourself.");

  return db.$transaction(async (tx) => {
    const sprint = await tx.sprint.findFirst({
      where: { closedAt: null, startsAt: { lte: now }, endsAt: { gt: now } },
    });
    if (!sprint) throw new RuleError("There is no active sprint right now.");

    const [from, to, alloc] = await Promise.all([
      tx.user.findUnique({ where: { id: input.fromId } }),
      tx.user.findUnique({ where: { id: input.toId } }),
      tx.allocation.findUnique({ where: { sprintId_userId: { sprintId: sprint.id, userId: input.fromId } } }),
    ]);
    if (!from?.active) throw new RuleError("Your account is not active.");
    if (!to?.active) throw new RuleError("This person is not part of the program.");
    if (!alloc) throw new RuleError("You'll receive gems to give starting next sprint.");

    if (input.source === "TRANSPARENT") {
      if (!isDnaColor(input.color)) throw new RuleError("Choose Blue, Purple or Green for a Transparent gem.");
      const used = await tx.transfer.count({
        where: { sprintId: sprint.id, fromId: from.id, source: "TRANSPARENT" },
      });
      if (used >= alloc.transparent) throw new RuleError("You've shared all your Transparent gems this sprint.");
      const repeat = await tx.transfer.count({
        where: { sprintId: sprint.id, fromId: from.id, toId: to.id, source: "TRANSPARENT" },
      });
      if (repeat > 0) throw new RuleError(`You've already thanked ${to.name} this sprint — spread the love.`);
    } else if (input.source === "YELLOW") {
      if (input.color !== "YELLOW") throw new RuleError("A Yellow gem stays Yellow.");
      if (!YELLOW_GIVER_ROLES.includes(from.role)) throw new RuleError("Only Leads and Managers give Yellow gems.");
      if (to.managerId !== from.id) throw new RuleError("Yellow gems go to your direct reports only.");
      const used = await tx.transfer.count({ where: { sprintId: sprint.id, fromId: from.id, source: "YELLOW" } });
      if (used >= alloc.yellow) throw new RuleError("You've given all your Yellow gems this sprint.");
      const already = await tx.transfer.count({ where: { sprintId: sprint.id, toId: to.id, source: "YELLOW" } });
      if (already > 0) throw new RuleError(`${to.name} already has a Yellow gem this sprint.`);
    } else {
      throw new RuleError("Unknown gem type.");
    }

    const transfer = await tx.transfer.create({
      data: {
        sprintId: sprint.id,
        fromId: from.id,
        toId: to.id,
        source: input.source,
        color: input.color,
        comment,
      },
    });
    await tx.gemEntry.create({
      data: { userId: to.id, color: input.color, amount: 1, kind: "TRANSFER", refId: transfer.id },
    });
    return transfer;
  });
}
