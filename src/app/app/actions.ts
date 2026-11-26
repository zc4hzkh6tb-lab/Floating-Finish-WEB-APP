"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fmtDay } from "@/lib/labels";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function acceptStaffRequest(f: FormData) {
  await respond(f, true);
}

export async function declineStaffRequest(f: FormData) {
  await respond(f, false);
}

async function respond(f: FormData, accept: boolean) {
  const user = await requireUser();
  const id = str(f, "id");
  const sr = await prisma.staffRequest.findUnique({ where: { id }, include: { days: { include: { day: true } } } });
  if (!sr || sr.userId !== user.id || sr.status === "ZURUECKGEZOGEN") return;
  const note = str(f, "note") || null;
  await prisma.staffRequest.update({ where: { id }, data: { status: accept ? "ZUGESAGT" : "ABGESAGT", respondedAt: new Date(), responseNote: note } });
  const days = sr.days.map((d) => d.day).sort((a, b) => +a.date - +b.date).map((d) => fmtDay(d.date)).join(", ");
  await prisma.bookingEvent.create({
    data: { bookingId: sr.bookingId, actor: user.name, text: `${accept ? "Zugesagt" : "Abgesagt"}: ${sr.task} (${days})${note ? ` – „${note}“` : ""}` },
  });
  revalidatePath("/app");
  revalidatePath(`/backoffice/anfragen/${sr.bookingId}`);
}

export async function updateProfile(f: FormData) {
  const user = await requireUser();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      email: str(f, "email") || null,
      phone: str(f, "phone") || null,
      position: str(f, "position") || null,
      skills: str(f, "skills") || null,
      bio: str(f, "bio") || null,
    },
  });
  revalidatePath("/app/profil");
  revalidatePath("/app/team");
}

export type PwState = { error?: string; ok?: boolean };

export async function changePassword(_: PwState, f: FormData): Promise<PwState> {
  const user = await requireUser();
  const current = String(f.get("current") ?? "");
  const next = String(f.get("next") ?? "");
  if (!(await bcrypt.compare(current, user.passwordHash))) return { error: "Aktuelles Passwort stimmt nicht." };
  if (next.length < 8) return { error: "Das neue Passwort braucht mindestens 8 Zeichen." };
  if (next !== String(f.get("repeat") ?? "")) return { error: "Die beiden neuen Passwörter stimmen nicht überein." };
  const wasForced = user.mustChangePassword;
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(next, 10), mustChangePassword: false } });
  if (wasForced) redirect(user.role === "TEAM" ? "/app" : "/backoffice");
  return { ok: true };
}
