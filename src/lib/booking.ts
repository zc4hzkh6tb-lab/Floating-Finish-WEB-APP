import { z } from "zod";

export const LED_PLAYOUT = {
  NONE: "Keine Bespielung",
  STREAM: "Bespielung mit Stream",
  STREAM_ADS: "Stream und eigene Werbung",
  OWN_MIX: "Eigene Mischung",
} as const;
export type LedPlayout = keyof typeof LED_PLAYOUT;

// Welche Bespielung welches Add-on vorauswählt
export const LED_PLAYOUT_ADDON: Record<LedPlayout, string | null> = {
  NONE: null,
  STREAM: "LED_STREAM",
  STREAM_ADS: "LED_STREAM_ADS",
  OWN_MIX: "LED_OWN_MIX",
};

export const LED_PLACEMENTS = {
  START: "Start",
  ZIEL: "Ziel",
  SEITE_LI: "Seitlich links",
  SEITE_RE: "Seitlich rechts",
  ENDE_LI: "Am Ende links",
  ENDE_RE: "Am Ende rechts",
} as const;
export type LedPlacement = keyof typeof LED_PLACEMENTS;

const time = z.string().regex(/^\d{2}:\d{2}$/, "Uhrzeit fehlt");

export const daySchema = z
  .object({
    key: z.string(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Datum fehlt"),
    startTime: time,
    endTime: time,
    note: z.string().optional(),
  })
  .refine((d) => d.endTime > d.startTime, { message: "Ende muss nach dem Beginn liegen", path: ["endTime"] });

export const eventSchema = z.object({
  organizer: z.string().trim().min(1, "Bitte Veranstalter angeben"),
  contactName: z.string().trim().min(1, "Bitte Ansprechpartner angeben"),
  contactEmail: z.string().trim().email("Bitte gültige E-Mail angeben"),
  contactPhone: z.string().trim().optional(),
  eventName: z.string().trim().min(1, "Bitte Namen der VA angeben"),
  eventLocation: z.string().trim().min(1, "Bitte Ort angeben"),
  days: z.array(daySchema).min(1, "Mindestens ein VA-Tag"),
  expectedVisitors: z.coerce.number().int().min(0).optional(),
  classes: z.string().trim().min(1, "Bitte gefahrene Klassen angeben"),
  seriesCodes: z.array(z.string()),
  otherSeries: z.string().trim().optional(),
  catering: z.string().trim().optional(),
  accommodation: z.string().trim().optional(),
  internet: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export const setupSchema = z.object({
  perspectives: z.coerce.number().int().min(1, "Mindestens 1 Perspektive"),
  speakers: z.coerce.number().int().min(0),
  ledPlayout: z.string().default(""),
  packageCode: z.string().default(""),
});

export const addonSelectionSchema = z.object({
  code: z.string(),
  dayKeys: z.array(z.string()).min(1, "Mindestens einen Tag wählen"),
});

export const ledWallSchema = z.object({
  count: z.coerce.number().int().min(1, "Mindestens eine Wand"),
  size: z.string().min(1, "Bitte Größe wählen"),
  placements: z.array(z.enum(["START", "ZIEL", "SEITE_LI", "SEITE_RE", "ENDE_LI", "ENDE_RE"])).min(1, "Bitte Platzierung wählen"),
  hasMount: z.boolean(),
  mountInfo: z.string().trim().optional(),
});

export const bookingSchema = z.object({
  event: eventSchema,
  answers: z.record(z.string(), z.string()).default({}),
  setup: setupSchema,
  addons: z.array(addonSelectionSchema),
  ledWall: ledWallSchema.nullable(),
});

export type BookingInput = z.infer<typeof bookingSchema>;

export type PackageInfo = {
  code: string;
  sortOrder: number;
  customerItems: string[]; // für den Kunden sichtbare Bestandteile der Anlage
  rigText: string | null;
  name: string;
  description: string;
  priceCategory: string;
  maxPerspectives: number | null;
  maxSpeakers: number | null;
  includedAddonCodes: string[];
  excludedAddonCodes: string[];
};

/** Kleinstes Paket, das Perspektiven und Sprecher abdeckt (Pakete sind nach Größe sortiert). */
export function recommendPackage(packages: PackageInfo[], perspectives: number, speakers: number): PackageInfo | undefined {
  return (
    packages.find(
      (p) => (p.maxPerspectives == null || perspectives <= p.maxPerspectives) && (p.maxSpeakers == null || speakers <= p.maxSpeakers),
    ) ?? packages.at(-1)
  );
}

/** Was vor Ort für die LED-Wand gebraucht wird. PLATZHALTER-Werte, bis echte Daten aus den Stammdaten kommen. */
export function ledOnSiteNeeds(led: { count: number; size: string; placements: string[]; hasMount: boolean }): string[] {
  const needs = [
    `${led.count} × Stromanschluss, je Wand einer (genaue Leistung folgt aus Wandgröße)`,
    `Ebene, befahrbare Stellfläche je Wand für ${led.size} plus Anlieferung`,
    "Kabelweg vom Regieplatz zu jeder Wand",
  ];
  if (!led.hasMount) needs.push("Wir bringen eine Ständerung mit: zusätzliche Stellfläche und Ballast einplanen");
  if (led.placements.some((p) => p.startsWith("ENDE"))) needs.push("Sicherheitsabstand am Bahnende mit der Rennleitung abstimmen");
  return needs;
}

export type RuleInfo = { type: "MIN_PACKAGE" | "CUSTOM_OFFER"; seriesCodes: string[]; matchAll: boolean; packageCode: string | null; message: string };

/** Wertet die Buchungsregeln für die gewählten Serien aus. */
export function evaluateRules(rules: RuleInfo[], seriesCodes: string[], packages: PackageInfo[]) {
  const hits = rules.filter((r) =>
    r.seriesCodes.length > 0 && (r.matchAll ? r.seriesCodes.every((c) => seriesCodes.includes(c)) : r.seriesCodes.some((c) => seriesCodes.includes(c))),
  );
  let minSort = -Infinity;
  let minPackage: PackageInfo | undefined;
  for (const r of hits.filter((h) => h.type === "MIN_PACKAGE")) {
    const p = packages.find((x) => x.code === r.packageCode);
    if (p && p.sortOrder > minSort) {
      minSort = p.sortOrder;
      minPackage = p;
    }
  }
  const customOffer = hits.some((h) => h.type === "CUSTOM_OFFER");
  return { hits, minSort, minPackage, customOffer, messages: hits.map((h) => h.message) };
}
