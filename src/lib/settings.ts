import { prisma } from "./db";

// Einstellungen mit Beispielwerten. Alles im Backoffice unter „Einstellungen“ änderbar.
export const SETTINGS = {
  firma_name: { label: "Firmenname", def: "Floating Finish", long: false },
  firma_adresse: { label: "Adresse (für Angebote)", def: "Musterstraße 1\n12345 Musterstadt", long: true },
  firma_kontakt: { label: "Kontakt (für Angebote)", def: "info@example.com · +49 000 000000", long: false },
  firma_bank: { label: "Bankverbindung / Fußzeile", def: "Beispielbank · IBAN DE00 0000 0000 0000 0000 00", long: false },
  mwst: { label: "Mehrwertsteuer in %", def: "19", long: false },
  angebot_gueltig_tage: { label: "Angebot gültig (Tage)", def: "30", long: false },
  angebot_einleitung: { label: "Angebot: Einleitung", def: "vielen Dank für Ihre Anfrage. Gerne bieten wir Ihnen den Livestream Ihrer Veranstaltung wie folgt an:", long: true },
  angebot_schluss: { label: "Angebot: Schlusstext", def: "Wir freuen uns auf die Zusammenarbeit. Bei Fragen melden Sie sich gerne jederzeit.", long: true },
  led_hinweis: {
    label: "Buchung: Hinweis zur LED-Wand",
    def: "Die LED-Wand bringen wir mit: Wir liefern, bauen auf und vermieten sie für Ihre Veranstaltung. Sie müssen keine eigene Wand stellen.",
    long: true,
  },
  eigenes_angebot_hinweis: {
    label: "Buchung: Hinweis bei eigenem Angebot",
    def: "Für diese Kombination erstellen wir Ihnen ein individuelles Angebot. Bitte füllen Sie trotzdem alle Angaben aus, damit wir gut planen können.",
    long: true,
  },
  schnellanfrage_text: { label: "Schnellanfrage: Einleitung", def: "Wenig Zeit? Schicken Sie uns die wichtigsten Eckdaten, wir melden uns mit allen Details.", long: true },
} as const;
export type SettingKey = keyof typeof SETTINGS;

export async function getSettings(): Promise<Record<SettingKey, string>> {
  const rows = await prisma.setting.findMany();
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return Object.fromEntries(Object.entries(SETTINGS).map(([k, v]) => [k, map[k] ?? v.def])) as Record<SettingKey, string>;
}
