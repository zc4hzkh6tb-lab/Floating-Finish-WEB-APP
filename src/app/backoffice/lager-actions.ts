"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ArticleKind, UnitStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireBackoffice } from "@/lib/auth";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const opt = (f: FormData, k: string) => str(f, k) || null;
const num = (f: FormData, k: string) => {
  const v = parseFloat(str(f, k).replace(",", "."));
  return Number.isFinite(v) ? v : null;
};
const int = (f: FormData, k: string, d = 1) => {
  const v = parseInt(str(f, k), 10);
  return Number.isFinite(v) ? v : d;
};
const date = (f: FormData, k: string) => (str(f, k) ? new Date(str(f, k) + "T00:00:00Z") : null);

// ---------- Artikel ----------
export async function saveArticle(f: FormData) {
  await requireBackoffice();
  const id = str(f, "id");
  const data = {
    name: str(f, "name"),
    number: opt(f, "number"),
    categoryId: opt(f, "categoryId"),
    kind: (str(f, "kind") || "GERAET") as ArticleKind,
    manufacturer: opt(f, "manufacturer"),
    model: opt(f, "model"),
    quantity: int(f, "quantity", 1),
    unit: str(f, "unit") || "Stk",
    storage: opt(f, "storage"),
    weightKg: num(f, "weightKg"),
    purchasePrice: num(f, "purchasePrice"),
    rentalPrice: num(f, "rentalPrice"),
    customerVisible: f.get("customerVisible") === "on",
    notes: opt(f, "notes"),
    active: id ? f.get("active") === "on" : true,
  };
  if (!data.name) return;
  if (id) await prisma.article.update({ where: { id }, data });
  else {
    const a = await prisma.article.create({ data });
    redirect(`/backoffice/inventar/${a.id}`);
  }
  revalidatePath("/backoffice/inventar");
  revalidatePath(`/backoffice/inventar/${id}`);
}
export async function deleteArticle(f: FormData) {
  await requireBackoffice();
  const id = str(f, "id");
  try {
    await prisma.article.delete({ where: { id } });
  } catch {
    await prisma.article.update({ where: { id }, data: { active: false } });
  }
  redirect("/backoffice/inventar");
}

export async function saveUnit(f: FormData) {
  await requireBackoffice();
  const id = str(f, "id");
  const articleId = str(f, "articleId");
  const data = { inventoryNo: opt(f, "inventoryNo"), serial: opt(f, "serial"), status: (str(f, "status") || "OK") as UnitStatus, purchaseDate: date(f, "purchaseDate"), note: opt(f, "note") };
  if (id) await prisma.inventoryUnit.update({ where: { id }, data });
  else await prisma.inventoryUnit.create({ data: { ...data, articleId } });
  revalidatePath(`/backoffice/inventar/${articleId}`);
}
export async function deleteUnit(f: FormData) {
  await requireBackoffice();
  await prisma.inventoryUnit.delete({ where: { id: str(f, "id") } });
  revalidatePath(`/backoffice/inventar/${str(f, "articleId")}`);
}

// ---------- Anlagen ----------
export async function saveRig(f: FormData) {
  await requireBackoffice();
  const id = str(f, "id");
  const data = { name: str(f, "name"), description: opt(f, "description"), customerDescription: opt(f, "customerDescription"), sortOrder: int(f, "sortOrder", 0), active: id ? f.get("active") === "on" : true };
  if (!data.name) return;
  if (id) await prisma.rig.update({ where: { id }, data });
  else {
    const r = await prisma.rig.create({ data });
    redirect(`/backoffice/anlagen/${r.id}`);
  }
  revalidatePath("/backoffice/anlagen");
  revalidatePath(`/backoffice/anlagen/${id}`);
  revalidatePath("/buchen");
}
export async function deleteRig(f: FormData) {
  await requireBackoffice();
  await prisma.rig.delete({ where: { id: str(f, "id") } });
  redirect("/backoffice/anlagen");
}

/** Position in einer Anlage oder einem Add-on (owner = rig | addon) */
export async function saveComponent(f: FormData) {
  await requireBackoffice();
  const owner = str(f, "owner");
  const ownerId = str(f, "ownerId");
  const id = str(f, "id");
  const data = { quantity: int(f, "quantity", 1), customerVisible: f.get("customerVisible") === "on" };
  const articleId = str(f, "articleId");
  if (owner === "rig") {
    if (id) await prisma.rigItem.update({ where: { id }, data: { ...data, note: opt(f, "note") } });
    else if (articleId) {
      const art = await prisma.article.findUnique({ where: { id: articleId } });
      await prisma.rigItem.create({ data: { ...data, customerVisible: f.has("customerVisible") ? data.customerVisible : !!art?.customerVisible, rigId: ownerId, articleId, note: opt(f, "note") } });
    }
    revalidatePath(`/backoffice/anlagen/${ownerId}`);
  } else {
    if (id) await prisma.addonArticle.update({ where: { id }, data });
    else if (articleId) await prisma.addonArticle.create({ data: { ...data, addonId: ownerId, articleId } });
    revalidatePath(`/backoffice/anlagen/addon/${ownerId}`);
  }
  revalidatePath("/buchen");
}
export async function deleteComponent(f: FormData) {
  await requireBackoffice();
  const owner = str(f, "owner");
  const ownerId = str(f, "ownerId");
  if (owner === "rig") await prisma.rigItem.delete({ where: { id: str(f, "id") } });
  else await prisma.addonArticle.delete({ where: { id: str(f, "id") } });
  revalidatePath(owner === "rig" ? `/backoffice/anlagen/${ownerId}` : `/backoffice/anlagen/addon/${ownerId}`);
  revalidatePath("/buchen");
}
