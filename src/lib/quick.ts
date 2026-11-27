import { z } from "zod";
import { prisma } from "./db";
import { evaluateRules } from "./booking";
import { loadMasterData } from "./masterdata";

export const quickSchema = z.object({
  organizer: z.string().trim().min(1, "Bitte Veranstalter angeben"),
  contactName: z.string().trim().min(1, "Bitte Ansprechpartner angeben"),
  contactEmail: z.string().trim().email("Bitte gültige E-Mail angeben").or(z.literal("")),
  contactPhone: z.string().trim().optional(),
  eventName: z.string().trim().min(1, "Bitte Namen der VA angeben"),
  eventLocation: z.string().trim().min(1, "Bitte Ort angeben"),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Bitte Datum angeben"),
  dateTo: z.string().optional(),
  seriesCodes: z.array(z.string()).default([]),
  notes: z.string().trim().optional(),
});
export type QuickInput = z.infer<typeof quickSchema>;

/** Legt eine Schnellanfrage an (öffentlich oder intern erfasst). */
export async function createQuickRequest(q: QuickInput, source: "SCHNELL" | "INTERN", actor: string) {
  const start = new Date(q.dateFrom + "T00:00:00Z");
  const end = q.dateTo && q.dateTo >= q.dateFrom ? new Date(q.dateTo + "T00:00:00Z") : start;
  const dates: Date[] = [];
  for (let d = new Date(start); d <= end && dates.length < 10; d = new Date(d.getTime() + 864e5)) dates.push(d);
  const md = await loadMasterData();
  const rules = evaluateRules(md.rules, q.seriesCodes, md.packages);
  const series = await prisma.series.findMany({ where: { code: { in: q.seriesCodes } } });
  return prisma.bookingRequest.create({
    data: {
      source,
      organizer: q.organizer,
      contactName: q.contactName,
      contactEmail: q.contactEmail,
      contactPhone: q.contactPhone || null,
      eventName: q.eventName,
      eventLocation: q.eventLocation,
      classes: "",
      notes: q.notes || null,
      customOffer: rules.customOffer,
      ruleHints: rules.messages,
      series: { create: series.map((s) => ({ seriesId: s.id })) },
      days: { create: dates.map((date) => ({ date, startTime: "09:00", endTime: "18:00" })) },
      events: { create: { actor, text: source === "SCHNELL" ? "Schnellanfrage über die Website eingegangen" : "Anfrage intern erfasst (Schnellanfrage)" } },
    },
  });
}
