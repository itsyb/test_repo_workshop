import { NextResponse, type NextRequest } from "next/server";
import { redeemLoginToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") || "";
  const session = token ? await redeemLoginToken(token) : null;
  if (!session) return NextResponse.redirect(new URL("/login?expired=1", req.url));
  const res = NextResponse.redirect(new URL("/", req.url));
  res.cookies.set(SESSION_COOKIE, session, sessionCookieOptions);
  return res;
}
