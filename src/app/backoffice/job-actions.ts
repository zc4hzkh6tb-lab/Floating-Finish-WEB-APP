"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { OfferStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireBackoffice } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { OFFER_STATUS } from "@/lib/labels";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const opt = (f: FormData, k: string) => str(f, k) || null;
const num = (f: FormData, k: string, d = 0) => {
  const v = parseFloat(str(f, k).replace(",", "."));
  return Number.isFinite(v) ? v : d;
};
const page = (id: string) => revalidatePath(`/backoffice/anfragen/${id}`);
async function log(bookingId: string, text: string) {
  const u = await requireBackoffice();
  await prisma.bookingEvent.create({ data: { bookingId, actor: u.name, text } });
}

// ---------- Zuordnung Veranstalter / Location ----------
export async function linkContacts(f: FormData) {
  await requireBackoffice();
  const id = str(f, "id");
  await prisma.bookingRequest.update({ where: { id }, data: { organizerId: opt(f, "organizerId"), locationId: opt(f, "locationId") } });
  page(id);
}
export async function organizerFromBooking(f: FormData) {
  await requireBackoffice();
  const b = await prisma.bookingRequest.findUniqueOrThrow({ where: { id: str(f, "id") } });
  const o = await prisma.organizer.create({ data: { name: b.organizer, contactName: b.contactName, email: b.contactEmail || null, phone: b.contactPhone } });
  await prisma.bookingRequest.update({ where: { id: b.id }, data: { organizerId: o.id } });
  await log(b.id, `Veranstalter „${o.name}“ in die Stammdaten übernommen`);
  page(b.id);
}
export async function locationFromBooking(f: FormData) {
  await requireBackoffice();
  const b = await prisma.bookingRequest.findUniqueOrThrow({ where: { id: str(f, "id") } });
  const l = await prisma.location.create({ data: { name: b.eventLocation.split(",")[0] || b.eventLocation, street: b.eventLocation, internet: b.internet } });
  await prisma.bookingRequest.update({ where: { id: b.id }, data: { locationId: l.id } });
  await log(b.id, `Location „${l.name}“ in die Stammdaten übernommen`);
  page(b.id);
}

// ---------- Materialliste ----------
export async function generateMaterial(f: FormData) {
  await requireBackoffice();
  const id = str(f, "id");
  const b = await prisma.bookingRequest.findUniqueOrThrow({
    where: { id },
    include: { package: { include: { rig: { include: { items: { include: { article: true } } } } } }, addons: { include: { addon: { include: { articles: { include: { article: true } } } } } } },
  });
  const rows = new Map<string, { name: string; quantity: number; source: string }>();
  const add = (articleId: string, name: string, qty: number, source: string) => {
    const cur = rows.get(articleId);
    if (cur) cur.quantity += qty;
    else rows.set(articleId, { name, quantity: qty, source });
  };
  for (const i of b.package?.rig?.items ?? []) add(i.articleId, i.article.name, i.quantity, "PAKET");
  for (const a of b.addons) for (const i of a.addon.articles) add(i.articleId, i.article.name, i.quantity, "ADDON");
  await prisma.$transaction([
    prisma.materialItem.deleteMany({ where: { bookingId: id, source: { not: "MANUELL" } } }),
    prisma.materialItem.createMany({ data: [...rows].map(([articleId, r], i) => ({ bookingId: id, articleId, name: r.name, quantity: r.quantity, source: r.source, sortOrder: i })) }),
  ]);
  await log(id, `Materialliste aus Paket und Add-ons erzeugt (${rows.size} Positionen)`);
  page(id);
}
export async function addMaterial(f: FormData) {
  await requireBackoffice();
  const id = str(f, "id");
  const articleId = opt(f, "articleId");
  const art = articleId ? await prisma.article.findUnique({ where: { id: articleId } }) : null;
  const name = art?.name ?? str(f, "name");
  if (!name) return;
  await prisma.materialItem.create({ data: { bookingId: id, articleId: art?.id ?? null, name, quantity: Math.max(1, Math.round(num(f, "quantity", 1))), note: opt(f, "note"), source: "MANUELL", sortOrder: 999 } });
  page(id);
}
export async function updateMaterial(f: FormData) {
  await requireBackoffice();
  await prisma.materialItem.update({ where: { id: str(f, "itemId") }, data: { quantity: Math.max(1, Math.round(num(f, "quantity", 1))), packed: f.get("packed") === "on", note: opt(f, "note") } });
  page(str(f, "id"));
}
export async function deleteMaterial(f: FormData) {
  await requireBackoffice();
  await prisma.materialItem.delete({ where: { id: str(f, "itemId") } });
  page(str(f, "id"));
}

// ---------- Angebote ----------
export async function createOffer(f: FormData) {
  await requireBackoffice();
  const id = str(f, "id");
  const s = await getSettings();
  const b = await prisma.bookingRequest.findUniqueOrThrow({ where: { id }, include: { days: true, package: true, addons: { include: { addon: true, days: true } }, ledWall: true } });
  const items: { name: string; description?: string; quantity: number; unit: string; unitPrice: number }[] = [];
  if (b.package) items.push({ name: `Livestream-Paket ${b.package.name}`, description: b.package.description, quantity: b.days.length || 1, unit: "Tag", unitPrice: b.package.price ?? 0 });
  else items.push({ name: "Individuelles Livestream-Paket", description: "nach Absprache", quantity: b.days.length || 1, unit: "Tag", unitPrice: 0 });
  for (const a of b.addons) {
    const extra = a.addon.isLedWall && b.ledWall ? `${b.ledWall.count} × ${b.ledWall.size}, Lieferung und Aufbau` : (a.addon.description ?? undefined);
    items.push({ name: a.addon.name, description: extra, quantity: (a.days.length || 1) * (a.addon.isLedWall && b.ledWall ? b.ledWall.count : 1), unit: "Tag", unitPrice: a.addon.price ?? 0 });
  }
  const valid = new Date(Date.now() + (parseInt(s.angebot_gueltig_tage, 10) || 30) * 864e5);
  const o = await prisma.offer.create({
    data: {
      bookingId: id,
      title: `Angebot Livestream ${b.eventName}`,
      intro: s.angebot_einleitung,
      outro: s.angebot_schluss,
      vatRate: parseFloat(s.mwst.replace(",", ".")) || 19,
      validUntil: valid,
      items: { create: items.map((it, i) => ({ ...it, position: i + 1 })) },
    },
  });
  await log(id, `Angebot A-${o.number} erstellt`);
  if (b.status === "ANFRAGE") await prisma.bookingRequest.update({ where: { id }, data: { status: "ANGEBOT" } });
  redirect(`/backoffice/angebote/${o.id}`);
}
export async function saveOffer(f: FormData) {
  await requireBackoffice();
  const id = str(f, "offerId");
  await prisma.offer.update({
    where: { id },
    data: { title: str(f, "title"), intro: opt(f, "intro"), outro: opt(f, "outro"), vatRate: num(f, "vatRate", 19), validUntil: str(f, "validUntil") ? new Date(str(f, "validUntil") + "T00:00:00Z") : null },
  });
  revalidatePath(`/backoffice/angebote/${id}`);
}
export async function setOfferStatus(f: FormData) {
  await requireBackoffice();
  const id = str(f, "offerId");
  const status = str(f, "status") as OfferStatus;
  const o = await prisma.offer.update({ where: { id }, data: { status } });
  await log(o.bookingId, `Angebot A-${o.number}: ${OFFER_STATUS[status]}`);
  if (status === "ANGENOMMEN") await prisma.bookingRequest.update({ where: { id: o.bookingId }, data: { status: "BESTAETIGT" } });
  revalidatePath(`/backoffice/angebote/${id}`);
  page(o.bookingId);
}
export async function saveOfferItem(f: FormData) {
  await requireBackoffice();
  const offerId = str(f, "offerId");
  const data = { name: str(f, "name"), description: opt(f, "description"), quantity: num(f, "quantity", 1), unit: str(f, "unit") || "Stk", unitPrice: num(f, "unitPrice"), position: Math.round(num(f, "position", 99)) };
  if (!data.name) return;
  const itemId = str(f, "itemId");
  if (itemId) await prisma.offerItem.update({ where: { id: itemId }, data });
  else await prisma.offerItem.create({ data: { ...data, offerId } });
  revalidatePath(`/backoffice/angebote/${offerId}`);
}
export async function deleteOfferItem(f: FormData) {
  await requireBackoffice();
  await prisma.offerItem.delete({ where: { id: str(f, "itemId") } });
  revalidatePath(`/backoffice/angebote/${str(f, "offerId")}`);
}
export async function deleteOffer(f: FormData) {
  await requireBackoffice();
  const o = await prisma.offer.delete({ where: { id: str(f, "offerId") } });
  await log(o.bookingId, `Angebot A-${o.number} gelöscht`);
  redirect(`/backoffice/anfragen/${o.bookingId}`);
}

// ---------- Pläne, Checklisten, Chat ----------
export async function createPlan(f: FormData) {
  await requireBackoffice();
  const bookingId = opt(f, "id");
  const b = bookingId ? await prisma.bookingRequest.findUnique({ where: { id: bookingId } }) : null;
  const p = await prisma.plan.create({ data: { name: str(f, "name") || (b ? `Aufbauplan ${b.eventName}` : "Neuer Plan"), bookingId, data: { items: [], lines: [] } } });
  redirect(`/backoffice/plaene/${p.id}`);
}
export async function addChecklist(f: FormData) {
  await requireBackoffice();
  const id = str(f, "id");
  const t = await prisma.checklistTemplate.findUnique({ where: { id: str(f, "templateId") } });
  if (!t) return;
  await prisma.checklist.create({ data: { bookingId: id, name: t.name, items: { create: t.items.map((text, i) => ({ text, sortOrder: i })) } } });
  page(id);
}
export async function deleteChecklist(f: FormData) {
  await requireBackoffice();
  await prisma.checklist.delete({ where: { id: str(f, "checklistId") } });
  page(str(f, "id"));
}
export async function openChat(f: FormData) {
  await requireBackoffice();
  const id = str(f, "id");
  const b = await prisma.bookingRequest.findUniqueOrThrow({ where: { id }, include: { chat: true } });
  const ch = b.chat ?? (await prisma.chatChannel.create({ data: { bookingId: id, name: `#${b.number} ${b.eventName}` } }));
  redirect(`/app/chat/${ch.id}`);
}
