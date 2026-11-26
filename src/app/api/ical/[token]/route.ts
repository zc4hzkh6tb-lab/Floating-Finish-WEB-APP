import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const local = (date: Date, hhmm: string) => `${date.toISOString().slice(0, 10).replace(/-/g, "")}T${hhmm.replace(":", "")}00`;

const VTIMEZONE = [
  "BEGIN:VTIMEZONE", "TZID:Europe/Berlin",
  "BEGIN:DAYLIGHT", "TZOFFSETFROM:+0100", "TZOFFSETTO:+0200", "TZNAME:CEST", "DTSTART:19700329T020000", "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU", "END:DAYLIGHT",
  "BEGIN:STANDARD", "TZOFFSETFROM:+0200", "TZOFFSETTO:+0100", "TZNAME:CET", "DTSTART:19701025T030000", "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU", "END:STANDARD",
  "END:VTIMEZONE",
];

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const user = await prisma.user.findUnique({ where: { icalToken: token } });
  if (!user || !user.active) return new Response("Nicht gefunden", { status: 404 });
  const days = await prisma.staffRequestDay.findMany({
    where: { staffRequest: { userId: user.id, status: "ZUGESAGT" } },
    include: { day: true, staffRequest: { include: { booking: true } } },
  });
  const now = stamp(new Date());
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Floating Finish//Team-App//DE", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", `X-WR-CALNAME:${esc(`Einsätze ${user.name}`)}`, "X-WR-TIMEZONE:Europe/Berlin", ...VTIMEZONE];
  for (const d of days) {
    const b = d.staffRequest.booking;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${d.staffRequestId}-${d.dayId}@floating-finish`,
      `DTSTAMP:${now}`,
      `DTSTART;TZID=Europe/Berlin:${local(d.day.date, d.day.startTime)}`,
      `DTEND;TZID=Europe/Berlin:${local(d.day.date, d.day.endTime)}`,
      `SUMMARY:${esc(`${b.eventName} – ${d.staffRequest.task}`)}`,
      `LOCATION:${esc(b.eventLocation)}`,
      `DESCRIPTION:${esc(`Aufgabe: ${d.staffRequest.task}`)}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return new Response(lines.join("\r\n"), { headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "no-store" } });
}
