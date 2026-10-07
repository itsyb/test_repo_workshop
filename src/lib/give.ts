import type { Db } from "./db";
import { RuleError } from "./errors";
import { checkGive, cleanComment, type GiveInput } from "./rules";

export type { GiveInput };

/** Gives a gem under the program rules (see checkGive), in one transaction. */
export async function giveGem(db: Db, input: GiveInput, now = new Date()) {
  const comment = cleanComment(input.comment);
  if (input.fromId === input.toId) throw new RuleError("You can't give a gem to yourself.");

  return db.$transaction(async (tx) => {
    const sprint = await tx.sprint.findFirst({
      where: { closedAt: null, startsAt: { lte: now }, endsAt: { gt: now } },
    });
    if (!sprint) throw new RuleError("There is no active sprint right now.");

    const s = sprint.id;
    const [from, to, alloc, usedTransparent, repeatTransparent, usedYellow, recipientYellow] = await Promise.all([
      tx.user.findUnique({ where: { id: input.fromId } }),
      tx.user.findUnique({ where: { id: input.toId } }),
      tx.allocation.findUnique({ where: { sprintId_userId: { sprintId: s, userId: input.fromId } } }),
      tx.transfer.count({ where: { sprintId: s, fromId: input.fromId, source: "TRANSPARENT" } }),
      tx.transfer.count({ where: { sprintId: s, fromId: input.fromId, toId: input.toId, source: "TRANSPARENT" } }),
      tx.transfer.count({ where: { sprintId: s, fromId: input.fromId, source: "YELLOW" } }),
      tx.transfer.count({ where: { sprintId: s, toId: input.toId, source: "YELLOW" } }),
    ]);
    checkGive(input, { from, to, alloc, usedTransparent, repeatTransparent, usedYellow, recipientYellow });

    const transfer = await tx.transfer.create({
      data: { sprintId: s, fromId: input.fromId, toId: input.toId, source: input.source, color: input.color, comment },
    });
    await tx.gemEntry.create({
      data: { userId: input.toId, color: input.color, amount: 1, kind: "TRANSFER", refId: transfer.id },
    });
    return transfer;
  });
}
