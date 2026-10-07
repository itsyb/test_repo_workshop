import "server-only";
import { prisma } from "./db";
import { getQuota, type Quota } from "./sprint";

export { formatDay, greeting, lastMoment } from "./format";

export async function currentSprint(now = new Date()) {
  return prisma.sprint.findFirst({
    where: { closedAt: null, startsAt: { lte: now }, endsAt: { gt: now } },
  });
}

export async function quotaFor(userId: string): Promise<{ sprint: Awaited<ReturnType<typeof currentSprint>>; quota: Quota | null }> {
  const sprint = await currentSprint();
  return { sprint, quota: sprint ? await getQuota(prisma, sprint.id, userId) : null };
}
