// Edge-taugliche Session-Funktionen (Middleware + Server)
import { SignJWT, jwtVerify } from "jose";

export type Role = "ADMIN" | "PLANUNG" | "TEAM";
export type Session = { uid: string; name: string; role: Role };

export const SESSION_COOKIE = "ff_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 Tage

function secret() {
  // AUTH_SECRET setzen! Fallback nur, damit Test-Deployments ohne Zusatz-Variable laufen.
  const s = process.env.AUTH_SECRET || `ff-${process.env.BACKOFFICE_PASSWORD ?? ""}-${process.env.POSTGRES_PRISMA_URL ?? process.env.DATABASE_URL ?? ""}`;
  return new TextEncoder().encode(s);
}

export async function signSession(s: Session) {
  return new SignJWT(s).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(`${MAX_AGE}s`).sign(secret());
}

export async function verifySession(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return { uid: String(payload.uid), name: String(payload.name), role: payload.role as Role };
  } catch {
    return null;
  }
}

export const sessionCookie = (value: string) => ({
  name: SESSION_COOKIE,
  value,
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE,
});

export const BACKOFFICE_ROLES: Role[] = ["ADMIN", "PLANUNG"];
export const ROLE_LABEL: Record<Role, string> = { ADMIN: "Admin", PLANUNG: "Planung", TEAM: "Team" };
