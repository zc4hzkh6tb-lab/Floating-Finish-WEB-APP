"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { signSession, sessionCookie } from "@/lib/session";

export type LoginState = { error?: string };

export async function login(_: LoginState, f: FormData): Promise<LoginState> {
  const username = String(f.get("username") ?? "").trim().toLowerCase();
  const password = String(f.get("password") ?? "");
  const next = String(f.get("next") ?? "");
  if (!username || !password) return { error: "Bitte Benutzername und Passwort eingeben." };

  let user = await prisma.user.findUnique({ where: { username } });

  // Erster Start: Gibt es noch keine Nutzer, wird mit dem Zugang aus BACKOFFICE_USER/-PASSWORD ein Admin angelegt.
  if (!user && (await prisma.user.count()) === 0) {
    const envUser = (process.env.BACKOFFICE_USER ?? "").trim().toLowerCase();
    const envPass = process.env.BACKOFFICE_PASSWORD ?? "";
    if (envUser && envPass && username === envUser && password === envPass) {
      user = await prisma.user.create({
        data: { username, name: process.env.BACKOFFICE_USER!.trim(), passwordHash: await bcrypt.hash(password, 10), role: "ADMIN", mustChangePassword: false },
      });
    }
  }

  if (!user || !user.active || !(await bcrypt.compare(password, user.passwordHash))) {
    return { error: "Benutzername oder Passwort falsch." };
  }

  (await cookies()).set(sessionCookie(await signSession({ uid: user.id, name: user.name, role: user.role })));
  if (user.mustChangePassword) redirect("/app/profil?neu=1");
  const fallback = user.role === "TEAM" ? "/app" : "/backoffice";
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : fallback);
}
