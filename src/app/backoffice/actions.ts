"use server";

import { revalidatePath } from "next/cache";
import { Prisma, type BookingStatus, type QuestionType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { STATUS_LABEL, fmtDay } from "@/lib/labels";
import { requireBackoffice } from "@/lib/auth";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const optStr = (f: FormData, k: string) => str(f, k) || null;
const int = (f: FormData, k: string, d = 0) => {
  const v = parseInt(str(f, k), 10);
  return Number.isFinite(v) ? v : d;
};
const optInt = (f: FormData, k: string) => {
  const v = parseInt(str(f, k), 10);
  return Number.isFinite(v) ? v : null;
};
const bool = (f: FormData, k: string) => f.get(k) === "on";
const code = (name: string) =>
  name
    .toUpperCase()
    .replace(/Ä/g, "AE").replace(/Ö/g, "OE").replace(/Ü/g, "UE").replace(/ß/g, "SS")
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40) || "X";

async function uniqueCode(base: string, exists: (c: string) => Promise<boolean>) {
  let c = base;
  for (let i = 2; await exists(c); i++) c = `${base}_${i}`;
  return c;
}

function done(...paths: string[]) {
  for (const p of paths) revalidatePath(p);
  revalidatePath("/buchen");
}

/** Löschen, oder bei Verwendung in Anfragen nur deaktivieren. */
async function deleteOrDeactivate(del: () => Promise<unknown>, deactivate: () => Promise<unknown>) {
  try {
    await del();
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) await deactivate();
    else throw e;
  }
}

// ---------- Serien ----------
export async function saveSeries(f: FormData) {
  await requireBackoffice();
  const id = str(f, "id");
  const data = { name: str(f, "name"), color: str(f, "color") || "#f59e0b", note: optStr(f, "note"), sortOrder: int(f, "sortOrder"), active: bool(f, "active") };
  if (!data.name) return;
  if (id) await prisma.series.update({ where: { id }, data });
  else {
    const c = await uniqueCode(code(str(f, "code") || data.name), async (c) => !!(await prisma.series.findUnique({ where: { code: c } })));
    await prisma.series.create({ data: { ...data, code: c, active: true } });
  }
  done("/backoffice/stammdaten/serien");
}
export async function deleteSeries(f: FormData) {
  await requireBackoffice();
  const id = str(f, "id");
  await deleteOrDeactivate(() => prisma.series.delete({ where: { id } }), () => prisma.series.update({ where: { id }, data: { active: false } }));
  done("/backoffice/stammdaten/serien");
}

// ---------- Klassen ----------
export async function saveClass(f: FormData) {
  await requireBackoffice();
  const id = str(f, "id");
  const data = { name: str(f, "name"), sortOrder: int(f, "sortOrder"), active: id ? bool(f, "active") : true };
  if (!data.name) return;
  if (id) await prisma.vehicleClass.update({ where: { id }, data });
  else await prisma.vehicleClass.upsert({ where: { name: data.name }, update: { active: true }, create: data });
  done("/backoffice/stammdaten/klassen");
}
export async function deleteClass(f: FormData) {
  await requireBackoffice();
  await prisma.vehicleClass.delete({ where: { id: str(f, "id") } });
  done("/backoffice/stammdaten/klassen");
}

// ---------- LED-Größen ----------
export async function saveLedSize(f: FormData) {
  await requireBackoffice();
  const id = str(f, "id");
  const data = { label: str(f, "label"), sortOrder: int(f, "sortOrder"), active: id ? bool(f, "active") : true };
  if (!data.label) return;
  if (id) await prisma.ledSize.update({ where: { id }, data });
  else await prisma.ledSize.upsert({ where: { label: data.label }, update: { active: true }, create: data });
  done("/backoffice/stammdaten/led-groessen");
}
export async function deleteLedSize(f: FormData) {
  await requireBackoffice();
  await prisma.ledSize.delete({ where: { id: str(f, "id") } });
  done("/backoffice/stammdaten/led-groessen");
}

// ---------- Add-on-Kategorien & Add-ons ----------
export async function saveCategory(f: FormData) {
  await requireBackoffice();
  const id = str(f, "id");
  const data = { name: str(f, "name"), sortOrder: int(f, "sortOrder") };
  if (!data.name) return;
  if (id) await prisma.addonCategory.update({ where: { id }, data });
  else {
    const c = await uniqueCode(code(data.name), async (c) => !!(await prisma.addonCategory.findUnique({ where: { code: c } })));
    await prisma.addonCategory.create({ data: { ...data, code: c } });
  }
  done("/backoffice/stammdaten/addons");
}
export async function deleteCategory(f: FormData) {
  await requireBackoffice();
  const id = str(f, "id");
  if ((await prisma.addon.count({ where: { categoryId: id } })) > 0) return; // nur leere Kategorien löschen
  await prisma.addonCategory.delete({ where: { id } });
  done("/backoffice/stammdaten/addons");
}
export async function saveAddon(f: FormData) {
  await requireBackoffice();
  const id = str(f, "id");
  const data = {
    name: str(f, "name"),
    description: optStr(f, "description"),
    priceHint: optStr(f, "priceHint"),
    categoryId: str(f, "categoryId"),
    isLedWall: bool(f, "isLedWall"),
    sortOrder: int(f, "sortOrder"),
    active: id ? bool(f, "active") : true,
  };
  if (!data.name || !data.categoryId) return;
  if (id) await prisma.addon.update({ where: { id }, data });
  else {
    const c = await uniqueCode(code(data.name), async (c) => !!(await prisma.addon.findUnique({ where: { code: c } })));
    await prisma.addon.create({ data: { ...data, code: c } });
  }
  done("/backoffice/stammdaten/addons", "/backoffice/stammdaten/pakete");
}
export async function deleteAddon(f: FormData) {
  await requireBackoffice();
  const id = str(f, "id");
  await deleteOrDeactivate(() => prisma.addon.delete({ where: { id } }), () => prisma.addon.update({ where: { id }, data: { active: false } }));
  done("/backoffice/stammdaten/addons", "/backoffice/stammdaten/pakete");
}

// ---------- Pakete ----------
export async function savePackage(f: FormData) {
  await requireBackoffice();
  const id = str(f, "id");
  const data = {
    name: str(f, "name"),
    description: str(f, "description"),
    priceCategory: str(f, "priceCategory") || "€",
    maxPerspectives: optInt(f, "maxPerspectives"),
    maxSpeakers: optInt(f, "maxSpeakers"),
    sortOrder: int(f, "sortOrder"),
    active: id ? bool(f, "active") : true,
  };
  if (!data.name) return;
  const excludedIds = f.getAll("excludedIds").map(String);
  const addonIds = f.getAll("addonIds").map(String).filter((a) => !excludedIds.includes(a));
  await prisma.$transaction(async (tx) => {
    let pkgId = id;
    if (id) await tx.package.update({ where: { id }, data });
    else {
      const c = await uniqueCode(code(data.name), async (c) => !!(await tx.package.findUnique({ where: { code: c } })));
      pkgId = (await tx.package.create({ data: { ...data, code: c } })).id;
    }
    await tx.packageAddon.deleteMany({ where: { packageId: pkgId } });
    if (addonIds.length) await tx.packageAddon.createMany({ data: addonIds.map((addonId) => ({ packageId: pkgId, addonId })) });
    await tx.packageExcludedAddon.deleteMany({ where: { packageId: pkgId } });
    if (excludedIds.length) await tx.packageExcludedAddon.createMany({ data: excludedIds.map((addonId) => ({ packageId: pkgId, addonId })) });
  });
  done("/backoffice/stammdaten/pakete");
}
export async function deletePackage(f: FormData) {
  await requireBackoffice();
  const id = str(f, "id");
  await deleteOrDeactivate(() => prisma.package.delete({ where: { id } }), () => prisma.package.update({ where: { id }, data: { active: false } }));
  done("/backoffice/stammdaten/pakete");
}

// ---------- Eigene Fragen ----------
export async function saveQuestion(f: FormData) {
  await requireBackoffice();
  const id = str(f, "id");
  const type = (str(f, "type") || "TEXT") as QuestionType;
  const data = {
    label: str(f, "label"),
    help: optStr(f, "help"),
    type,
    options: type === "SELECT" ? str(f, "options").split("\n").map((o) => o.trim()).filter(Boolean) : [],
    required: bool(f, "required"),
    sortOrder: int(f, "sortOrder"),
    active: id ? bool(f, "active") : true,
  };
  if (!data.label) return;
  if (id) await prisma.customQuestion.update({ where: { id }, data });
  else await prisma.customQuestion.create({ data });
  done("/backoffice/fragen");
}
export async function deleteQuestion(f: FormData) {
  await requireBackoffice();
  await prisma.customQuestion.delete({ where: { id: str(f, "id") } });
  done("/backoffice/fragen");
}

// ---------- Anfragen ----------
async function actor() {
  return (await requireBackoffice()).name;
}

async function log(bookingId: string, text: string) {
  await prisma.bookingEvent.create({ data: { bookingId, text, actor: await actor() } });
  revalidatePath(`/backoffice/anfragen/${bookingId}`);
  revalidatePath("/backoffice");
}

export async function setBookingStatus(f: FormData) {
  await requireBackoffice();
  const id = str(f, "id");
  const status = str(f, "status") as BookingStatus;
  const old = await prisma.bookingRequest.findUniqueOrThrow({ where: { id } });
  if (old.status === status) return;
  await prisma.bookingRequest.update({ where: { id }, data: { status } });
  await log(id, `Status: ${STATUS_LABEL[old.status]} → ${STATUS_LABEL[status]}`);
}

export async function setBookingPackage(f: FormData) {
  await requireBackoffice();
  const id = str(f, "id");
  const packageId = str(f, "packageId") || null;
  const old = await prisma.bookingRequest.findUniqueOrThrow({ where: { id }, include: { package: true } });
  if (old.packageId === packageId) return;
  const pkg = packageId ? await prisma.package.findUnique({ where: { id: packageId } }) : null;
  await prisma.bookingRequest.update({ where: { id }, data: { packageId } });
  await log(id, `Paket: ${old.package?.name ?? "–"} → ${pkg?.name ?? "–"}`);
}

export async function addBookingAddon(f: FormData) {
  await requireBackoffice();
  const id = str(f, "id");
  const addonId = str(f, "addonId");
  const dayIds = f.getAll("dayIds").map(String);
  if (!addonId || dayIds.length === 0) return;
  const addon = await prisma.addon.findUniqueOrThrow({ where: { id: addonId } });
  const existing = await prisma.bookingAddon.findFirst({ where: { bookingId: id, addonId } });
  if (existing) {
    await prisma.bookingAddonDay.deleteMany({ where: { bookingAddonId: existing.id } });
    await prisma.bookingAddonDay.createMany({ data: dayIds.map((dayId) => ({ bookingAddonId: existing.id, dayId })) });
  } else {
    await prisma.bookingAddon.create({ data: { bookingId: id, addonId, days: { create: dayIds.map((dayId) => ({ dayId })) } } });
  }
  const days = await prisma.bookingDay.findMany({ where: { id: { in: dayIds } }, orderBy: { date: "asc" } });
  await log(id, `${existing ? "Add-on geändert" : "Add-on hinzugefügt"}: ${addon.name} (${days.map((d) => fmtDay(d.date)).join(", ")})`);
}

export async function removeBookingAddon(f: FormData) {
  await requireBackoffice();
  const bookingAddonId = str(f, "bookingAddonId");
  const ba = await prisma.bookingAddon.findUniqueOrThrow({ where: { id: bookingAddonId }, include: { addon: true } });
  await prisma.bookingAddon.delete({ where: { id: bookingAddonId } });
  await log(ba.bookingId, `Add-on entfernt: ${ba.addon.name}`);
}

export async function saveInternalNotes(f: FormData) {
  await requireBackoffice();
  const id = str(f, "id");
  const internalNotes = optStr(f, "internalNotes");
  const old = await prisma.bookingRequest.findUniqueOrThrow({ where: { id } });
  if ((old.internalNotes ?? null) === internalNotes) return;
  await prisma.bookingRequest.update({ where: { id }, data: { internalNotes } });
  await log(id, "Interne Notizen bearbeitet");
}

export async function addHistoryEntry(f: FormData) {
  await requireBackoffice();
  const id = str(f, "id");
  const text = str(f, "text");
  if (!text) return;
  await log(id, text);
}

// ---------- Personalanfragen ----------
export async function createStaffRequests(f: FormData) {
  await requireBackoffice();
  const id = str(f, "id");
  const userIds = f.getAll("userIds").map(String);
  const dayIds = f.getAll("dayIds").map(String);
  const task = str(f, "task");
  if (!userIds.length || !dayIds.length || !task) return;
  const users = await prisma.user.findMany({ where: { id: { in: userIds }, active: true } });
  for (const u of users) {
    await prisma.staffRequest.create({
      data: { bookingId: id, userId: u.id, task, message: optStr(f, "message"), days: { create: dayIds.map((dayId) => ({ dayId })) } },
    });
  }
  const days = await prisma.bookingDay.findMany({ where: { id: { in: dayIds } }, orderBy: { date: "asc" } });
  await log(id, `Personal angefragt (${task}, ${days.map((d) => fmtDay(d.date)).join(", ")}): ${users.map((u) => u.name).join(", ")}`);
}

export async function withdrawStaffRequest(f: FormData) {
  await requireBackoffice();
  const sr = await prisma.staffRequest.update({ where: { id: str(f, "staffRequestId") }, data: { status: "ZURUECKGEZOGEN" }, include: { user: true } });
  await log(sr.bookingId, `Personalanfrage zurückgezogen: ${sr.user.name} (${sr.task})`);
}
