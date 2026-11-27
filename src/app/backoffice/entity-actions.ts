"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireBackoffice } from "@/lib/auth";
import { entityByKey, type Field } from "@/lib/entities";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const model = (name: string) => (prisma as any)[name];

function parseField(f: FormData, fd: Field): unknown {
  const raw = String(f.get(fd.name) ?? "").trim();
  switch (fd.type) {
    case "number": {
      const v = parseInt(raw, 10);
      return Number.isFinite(v) ? v : 0;
    }
    case "float": {
      const v = parseFloat(raw.replace(",", "."));
      return Number.isFinite(v) ? v : null;
    }
    case "bool":
      return f.get(fd.name) === "on";
    case "date":
      return raw ? new Date(raw + "T00:00:00Z") : null;
    case "lines":
      return raw.split("\n").map((l) => l.trim()).filter(Boolean);
    case "multi":
      return f.getAll(fd.name).map(String);
    case "relation":
      return raw || null;
    case "color":
      return raw || "#f59e0b";
    case "select":
      return raw || fd.options?.[0]?.[0];
    default:
      return fd.required ? raw : raw || null;
  }
}

const toCode = (name: string) =>
  name.toUpperCase().replace(/Ä/g, "AE").replace(/Ö/g, "OE").replace(/Ü/g, "UE").replace(/ß/g, "SS").replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40) || "X";

export async function saveEntity(f: FormData) {
  await requireBackoffice();
  const ent = entityByKey(String(f.get("_entity")));
  if (!ent) return;
  const id = String(f.get("id") ?? "");
  const data: Record<string, unknown> = {};
  for (const fd of ent.fields) data[fd.name] = parseField(f, fd);
  if (ent.fields.some((fd) => fd.required && !data[fd.name])) return;
  if (ent.hasActive) data.active = id ? f.get("active") === "on" : true;
  const m = model(ent.model);
  if (id) await m.update({ where: { id }, data });
  else {
    if (ent.hasCode) {
      let c = toCode(String(data[ent.titleField]));
      for (let i = 2; await m.findUnique({ where: { code: c } }); i++) c = `${toCode(String(data[ent.titleField]))}_${i}`;
      data.code = c;
    }
    try {
      await m.create({ data });
    } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError)) throw e; // doppelter Name: ignorieren
    }
  }
  revalidatePath(`/backoffice/daten/${ent.key}`);
  revalidatePath("/buchen");
}

export async function deleteEntity(f: FormData) {
  await requireBackoffice();
  const ent = entityByKey(String(f.get("_entity")));
  if (!ent) return;
  const id = String(f.get("id"));
  const m = model(ent.model);
  try {
    await m.delete({ where: { id } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && ent.hasActive) await m.update({ where: { id }, data: { active: false } });
    else throw e;
  }
  revalidatePath(`/backoffice/daten/${ent.key}`);
  revalidatePath("/buchen");
}
