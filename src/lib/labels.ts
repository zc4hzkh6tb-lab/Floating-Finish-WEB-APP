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

export const STATUS_STYLE: Record<BookingStatus, string> = {
  ANFRAGE: "bg-sky-500/15 text-sky-300 ring-sky-500/40",
  ANGEBOT: "bg-amber-500/15 text-amber-300 ring-amber-500/40",
  BESTAETIGT: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/40",
  IN_PLANUNG: "bg-violet-500/15 text-violet-300 ring-violet-500/40",
  DURCHGEFUEHRT: "bg-teal-500/15 text-teal-300 ring-teal-500/40",
  ABGERECHNET: "bg-neutral-500/15 text-neutral-300 ring-neutral-500/40",
  ABGESAGT: "bg-red-500/15 text-red-300 ring-red-500/40",
};

export const STATUS_BAR: Record<BookingStatus, string> = {
  ANFRAGE: "border-l-sky-500",
  ANGEBOT: "border-l-amber-500",
  BESTAETIGT: "border-l-emerald-500",
  IN_PLANUNG: "border-l-violet-500",
  DURCHGEFUEHRT: "border-l-teal-500",
  ABGERECHNET: "border-l-neutral-500",
  ABGESAGT: "border-l-red-500",
};
