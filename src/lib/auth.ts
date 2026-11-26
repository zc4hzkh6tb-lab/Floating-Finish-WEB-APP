import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./db";
import { SESSION_COOKIE, verifySession, type Role } from "./session";

/** Aktueller Nutzer aus Cookie + Datenbank (deaktivierte Nutzer gelten als abgemeldet). */
export async function currentUser() {
  const s = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!s) return null;
  const user = await prisma.user.findUnique({ where: { id: s.uid } });
  return user?.active ? user : null;
}

export async function requireUser(roles?: Role[]) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (roles && !roles.includes(user.role)) redirect(user.role === "TEAM" ? "/app" : "/login");
  return user;
}

export const requireBackoffice = () => requireUser(["ADMIN", "PLANUNG"]);
export const requireAdmin = () => requireUser(["ADMIN"]);
