import type { BookingStatus } from "@prisma/client";

export const STATUS_LABEL: Record<BookingStatus, string> = {
  ANFRAGE: "Anfrage",
  ANGEBOT: "Angebot",
  BESTAETIGT: "Bestätigt",
  IN_PLANUNG: "In Planung",
  DURCHGEFUEHRT: "Durchgeführt",
  ABGERECHNET: "Abgerechnet",
  ABGESAGT: "Abgesagt",
};

export const fmtDay = (d: Date) => d.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
