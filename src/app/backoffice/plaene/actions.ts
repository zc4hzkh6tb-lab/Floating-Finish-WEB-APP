"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireBackoffice } from "@/lib/auth";

export async function savePlanData(id: string, data: unknown) {
  await requireBackoffice();
  const json = JSON.stringify(data);
  if (json.length > 4_000_000) throw new Error("Plan zu groß (Hintergrundbild verkleinern)");
  await prisma.plan.update({ where: { id }, data: { data: JSON.parse(json) as Prisma.InputJsonValue } });
  revalidatePath(`/backoffice/plaene/${id}`);
}

export async function savePlanMeta(f: FormData) {
  await requireBackoffice();
  const id = String(f.get("id"));
  await prisma.plan.update({ where: { id }, data: { name: String(f.get("name") || "Plan"), bookingId: String(f.get("bookingId") || "") || null, visibleToTeam: f.get("visibleToTeam") === "on" } });
  revalidatePath(`/backoffice/plaene/${id}`);
  revalidatePath("/backoffice/plaene");
}

export async function deletePlan(f: FormData) {
  await requireBackoffice();
  await prisma.plan.delete({ where: { id: String(f.get("id")) } });
  redirect("/backoffice/plaene");
}
