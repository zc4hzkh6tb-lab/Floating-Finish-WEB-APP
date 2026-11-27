"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireBackoffice } from "@/lib/auth";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const opt = (f: FormData, k: string) => str(f, k) || null;
const ids = (f: FormData, k: string) => f.getAll(k).map((v) => ({ id: String(v) }));

export async function savePerson(f: FormData) {
  await requireBackoffice();
  const id = str(f, "id");
  const rate = parseFloat(str(f, "dayRate").replace(",", "."));
  await prisma.user.update({
    where: { id },
    data: {
      name: str(f, "name") || undefined,
      email: opt(f, "email"),
      phone: opt(f, "phone"),
      street: opt(f, "street"),
      zip: opt(f, "zip"),
      city: opt(f, "city"),
      country: opt(f, "country"),
      birthDate: str(f, "birthDate") ? new Date(str(f, "birthDate") + "T00:00:00Z") : null,
      emergencyContact: opt(f, "emergencyContact"),
      employment: opt(f, "employment"),
      dayRate: Number.isFinite(rate) ? rate : null,
      skills: opt(f, "skills"),
      bio: opt(f, "bio"),
      internalNotes: opt(f, "internalNotes"),
      position: opt(f, "position"),
      positions: { set: ids(f, "positions") },
      qualifications: { set: ids(f, "qualifications") },
      licenses: { set: ids(f, "licenses") },
    },
  });
  revalidatePath("/backoffice/personal");
  revalidatePath(`/backoffice/personal/${id}`);
}
