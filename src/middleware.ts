import { NextResponse, type NextRequest } from "next/server";

// Cheap gate: no session cookie → sign-in page. The session itself is
// validated against the database in each page (requireUser).
export function middleware(req: NextRequest) {
  if (!req.cookies.has("gq_session")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

export const config = {
  matcher: ["/((?!login|auth|_next|favicon.ico|icon.svg).*)"],
};
