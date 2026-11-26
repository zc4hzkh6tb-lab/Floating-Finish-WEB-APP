import { NextResponse, type NextRequest } from "next/server";
import { BACKOFFICE_ROLES, SESSION_COOKIE, verifySession } from "@/lib/session";

// Schützt Backoffice (Admin, Planung) und Team-App (alle angemeldeten Nutzer).
export async function middleware(req: NextRequest) {
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  const path = req.nextUrl.pathname;
  if (!session) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
  if (path.startsWith("/backoffice") && !BACKOFFICE_ROLES.includes(session.role)) {
    return NextResponse.redirect(new URL("/app", req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/backoffice/:path*", "/app/:path*"] };
