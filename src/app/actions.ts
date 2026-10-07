"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createLoginLink, destroySession, requireAdmin, requireUser } from "@/lib/auth";
import { awardPrize, setChallengeStatus, submitEntry } from "@/lib/challenges";
import { prisma, RuleError } from "@/lib/db";
import { giveGem } from "@/lib/give";
import { sendLoginEmail } from "@/lib/mail";
import { syncSprints } from "@/lib/sprint";
import { purchase, setOrderStatus } from "@/lib/store";
import { loadFeed, type FeedFilter } from "@/lib/feed";
import type { Balance, GemSource } from "@/lib/gems";

import type { ActionResult } from "@/lib/errors";

export type { ActionResult };

async function run(fn: () => Promise<string | void>): Promise<ActionResult> {
  try {
    const message = await fn();
    return { ok: true, message: message || undefined };
  } catch (e) {
    if (e instanceof RuleError) return { ok: false, error: e.message };
    console.error(e);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

/* ── Auth ─────────────────────────────────────────────────────────────── */

export async function requestLogin(
  _prev: { sent?: boolean; devLink?: string; error?: string } | null,
  form: FormData,
) {
  const email = String(form.get("email") || "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Enter your work email." };
  const link = await createLoginLink(email);
  // Same answer whether or not the email exists, so the form can't be used to list participants.
  if (!link) return { sent: true };
  if (process.env.AUTH_DEV_LINKS === "true") return { sent: true, devLink: link };
  await sendLoginEmail(email, link);
  return { sent: true };
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

/* ── Giving ───────────────────────────────────────────────────────────── */

export async function giveAction(input: { toId: string; source: GemSource; color: string; comment: string }) {
  const user = await requireUser();
  return run(async () => {
    await syncSprints(prisma);
    await giveGem(prisma, { fromId: user.id, ...input });
    revalidatePath("/", "layout");
  });
}

export async function feedPage(filter: FeedFilter) {
  await requireUser();
  return loadFeed(prisma, filter);
}

/* ── Store ────────────────────────────────────────────────────────────── */

export async function buyAction(productId: string, spend: Partial<Balance>) {
  const user = await requireUser();
  return run(async () => {
    await purchase(prisma, user.id, productId, spend);
    revalidatePath("/", "layout");
    return "Order placed — the team will be in touch.";
  });
}

/* ── Challenges ───────────────────────────────────────────────────────── */

export async function submitEntryAction(challengeId: string, text: string, link: string) {
  const user = await requireUser();
  return run(async () => {
    await submitEntry(prisma, challengeId, user.id, text, link.trim() || undefined);
    revalidatePath("/challenges");
    return "Your entry is in. Good luck!";
  });
}

/* ── Admin ────────────────────────────────────────────────────────────── */

export async function adminOrderAction(orderId: string, status: "FULFILLED" | "REJECTED", note?: string) {
  await requireAdmin();
  return run(async () => {
    await setOrderStatus(prisma, orderId, status, note);
    revalidatePath("/", "layout");
  });
}

export async function adminChallengeStatusAction(id: string, status: "DRAFT" | "ACTIVE" | "CLOSED") {
  await requireAdmin();
  return run(async () => {
    await setChallengeStatus(prisma, id, status);
    revalidatePath("/", "layout");
  });
}

export async function adminCreateChallengeAction(input: { title: string; description: string; emoji: string }) {
  await requireAdmin();
  return run(async () => {
    if (input.title.trim().length < 3) throw new RuleError("Give the challenge a title.");
    if (input.description.trim().length < 10) throw new RuleError("Describe the challenge.");
    await prisma.challenge.create({
      data: { title: input.title.trim(), description: input.description.trim(), emoji: input.emoji.trim() || null },
    });
    revalidatePath("/admin");
  });
}

export async function adminAwardAction(entryId: string, bankColor: string, amount: number, convertTo?: string) {
  await requireAdmin();
  return run(async () => {
    await awardPrize(prisma, entryId, bankColor, amount, convertTo);
    revalidatePath("/", "layout");
  });
}

export async function adminProductAction(input: {
  id?: string;
  name: string;
  description: string;
  category: string;
  price: number;
  emoji: string;
  stock: number | null;
  active: boolean;
}) {
  await requireAdmin();
  return run(async () => {
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
    if (input.id) await prisma.product.update({ where: { id: input.id }, data });
    else await prisma.product.create({ data });
    revalidatePath("/", "layout");
  });
}
