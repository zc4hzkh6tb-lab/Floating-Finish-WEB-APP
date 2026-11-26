"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const opt = (f: FormData, k: string) => str(f, k) || null;

export async function createUser(f: FormData) {
  await requireAdmin();
  const username = str(f, "username").toLowerCase().replace(/\s+/g, "");
  const password = String(f.get("password") ?? "");
  if (!username || !str(f, "name") || password.length < 8) return;
  if (await prisma.user.findUnique({ where: { username } })) return;
  await prisma.user.create({
    data: {
      username,
      name: str(f, "name"),
      email: opt(f, "email"),
      phone: opt(f, "phone"),
      position: opt(f, "position"),
      role: (str(f, "role") || "TEAM") as Role,
      passwordHash: await bcrypt.hash(password, 10),
      mustChangePassword: true,
    },
  });
  revalidatePath("/backoffice/nutzer");
}

export async function updateUser(f: FormData) {
  const me = await requireAdmin();
  const id = str(f, "id");
  const self = id === me.id;
  await prisma.user.update({
    where: { id },
    data: {
      name: str(f, "name"),
      email: opt(f, "email"),
      phone: opt(f, "phone"),
      position: opt(f, "position"),
      // eigene Admin-Rechte und eigenen Zugang kann man sich nicht selbst entziehen
      role: self ? "ADMIN" : ((str(f, "role") || "TEAM") as Role),
      active: self ? true : f.get("active") === "on",
    },
  });
  revalidatePath("/backoffice/nutzer");
}

export async function resetPassword(f: FormData) {
  await requireAdmin();
  const password = String(f.get("password") ?? "");
  if (password.length < 8) return;
  await prisma.user.update({ where: { id: str(f, "id") }, data: { passwordHash: await bcrypt.hash(password, 10), mustChangePassword: true } });
  revalidatePath("/backoffice/nutzer");
}
