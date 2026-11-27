import "server-only";
import type { User } from "@prisma/client";
import { prisma } from "./db";

export const isBackoffice = (u: User) => u.role === "ADMIN" || u.role === "PLANUNG";

/** Team sieht nur Projekte, zu denen es angefragt wurde (offen oder zugesagt). */
export async function canSeeBooking(u: User, bookingId: string) {
  if (isBackoffice(u)) return true;
  return !!(await prisma.staffRequest.findFirst({ where: { bookingId, userId: u.id, status: { in: ["OFFEN", "ZUGESAGT"] } } }));
}

export async function visibleChannels(u: User) {
  const where = isBackoffice(u)
    ? {}
    : { OR: [{ bookingId: null }, { booking: { staff: { some: { userId: u.id, status: { in: ["OFFEN" as const, "ZUGESAGT" as const] } } } } }] };
  return prisma.chatChannel.findMany({
    where,
    include: { messages: { orderBy: { createdAt: "desc" }, take: 1, include: { user: true } }, booking: { include: { days: { orderBy: { date: "asc" }, take: 1 } } } },
  });
}

export async function canSeeChannel(u: User, channelId: string) {
  const ch = await prisma.chatChannel.findUnique({ where: { id: channelId } });
  if (!ch) return null;
  if (!ch.bookingId || (await canSeeBooking(u, ch.bookingId))) return ch;
  return null;
}
