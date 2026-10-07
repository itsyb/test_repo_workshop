import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { prisma } from "./db";

export const SESSION_COOKIE = "gq_session";
const SESSION_DAYS = 30;
const LINK_MINUTES = 15;

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/** Creates a one-time sign-in link for an existing, active participant. */
export async function createLoginLink(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user?.active) return null;
  const token = randomBytes(32).toString("base64url");
  await prisma.loginToken.create({
    data: {
      tokenHash: sha256(token),
      email: user.email,
      expiresAt: new Date(Date.now() + LINK_MINUTES * 60_000),
    },
  });
  const base = process.env.APP_URL || "http://localhost:3000";
  return `${base}/auth/verify?token=${token}`;
}

/** Exchanges a sign-in token for a session token. */
export async function redeemLoginToken(token: string): Promise<string | null> {
  const row = await prisma.loginToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!row || row.usedAt || row.expiresAt < new Date()) return null;
  const claimed = await prisma.loginToken.updateMany({
    where: { id: row.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (claimed.count === 0) return null;
  const user = await prisma.user.findUnique({ where: { email: row.email } });
  if (!user?.active) return null;
  const session = randomBytes(32).toString("base64url");
  await prisma.session.create({
    data: {
      token: sha256(session),
      userId: user.id,
      expiresAt: new Date(Date.now() + SESSION_DAYS * 86_400_000),
    },
  });
  return session;
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_DAYS * 86_400,
};

export const getCurrentUser = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { token: sha256(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date() || !session.user.active) return null;
  return session.user;
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!user.isAdmin) redirect("/");
  return user;
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { token: sha256(token) } });
  jar.delete(SESSION_COOKIE);
}
