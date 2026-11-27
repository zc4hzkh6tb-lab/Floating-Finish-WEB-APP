"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canSeeBooking, canSeeChannel, isBackoffice } from "@/lib/access";

export async function sendMessage(channelId: string, text: string) {
  const u = await requireUser();
  const t = text.trim().slice(0, 4000);
  if (!t || !(await canSeeChannel(u, channelId))) return;
  await prisma.chatMessage.create({ data: { channelId, userId: u.id, text: t } });
  revalidatePath(`/app/chat/${channelId}`);
}

export async function createChannel(f: FormData) {
  const u = await requireUser();
  const name = String(f.get("name") ?? "").trim();
  if (!isBackoffice(u) || !name) return;
  const ch = await prisma.chatChannel.create({ data: { name } });
  redirect(`/app/chat/${ch.id}`);
}

export async function toggleChecklistItem(f: FormData) {
  const u = await requireUser();
  const item = await prisma.checklistItem.findUnique({ where: { id: String(f.get("itemId")) }, include: { checklist: true } });
  if (!item || !(await canSeeBooking(u, item.checklist.bookingId))) return;
  const done = !item.done;
  await prisma.checklistItem.update({ where: { id: item.id }, data: { done, doneBy: done ? u.name : null, doneAt: done ? new Date() : null } });
  revalidatePath(`/app/projekt/${item.checklist.bookingId}`);
  revalidatePath(`/backoffice/anfragen/${item.checklist.bookingId}`);
}

export async function toggleMaterialPacked(f: FormData) {
  const u = await requireUser();
  const m = await prisma.materialItem.findUnique({ where: { id: String(f.get("itemId")) } });
  if (!m || !(await canSeeBooking(u, m.bookingId))) return;
  await prisma.materialItem.update({ where: { id: m.id }, data: { packed: !m.packed } });
  revalidatePath(`/app/projekt/${m.bookingId}`);
  revalidatePath(`/backoffice/anfragen/${m.bookingId}`);
}
