import Link from "next/link";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Box, Empty, H } from "../ui";
import CopyButton from "./CopyButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kalender" };

export default async function KalenderPage() {
  const user = await requireUser();
  const host = (await headers()).get("host");
  const feed = `https://${host}/api/ical/${user.icalToken}`;
  const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");
  const days = await prisma.staffRequestDay.findMany({
    where: { staffRequest: { userId: user.id, status: "ZUGESAGT" }, day: { date: { gte: today } } },
    include: { day: true, staffRequest: { include: { booking: true } } },
    orderBy: { day: { date: "asc" } },
  });
  const byMonth = new Map<string, typeof days>();
  for (const d of days) {
    const m = d.day.date.toLocaleDateString("de-DE", { month: "long", year: "numeric", timeZone: "UTC" });
    byMonth.set(m, [...(byMonth.get(m) ?? []), d]);
  }
  return (
    <div>
      <H>Kalender-Abo</H>
      <Box>
        <p className="text-sm text-neutral-300">Abonniere deine Einsätze in Apple-, Google- oder Outlook-Kalender. Neue Zusagen erscheinen dort automatisch.</p>
        <div className="mt-3 grid gap-2">
          <a href={feed.replace("https://", "webcal://")} className="btn-primary text-center">In Kalender abonnieren</a>
          <CopyButton text={feed} />
        </div>
        <p className="mt-2 text-xs text-neutral-500">Google Kalender: „Weitere Kalender → Per URL“ und den kopierten Link einfügen. Den Link nicht weitergeben.</p>
      </Box>

      <H>Meine Einsatztage</H>
      {days.length === 0 && <Empty>Keine kommenden Einsätze.</Empty>}
      {[...byMonth.entries()].map(([month, list]) => (
        <div key={month}>
          <div className="px-4 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">{month}</div>
          {list.map((d) => (
            <Link key={`${d.staffRequestId}-${d.dayId}`} href={`/app/projekt/${d.staffRequest.bookingId}`}>
              <Box className="flex items-center gap-4 !py-3">
                <div className="w-12 text-center">
                  <div className="text-2xl font-bold leading-none">{d.day.date.getUTCDate()}</div>
                  <div className="text-xs text-neutral-500">{d.day.date.toLocaleDateString("de-DE", { weekday: "short", timeZone: "UTC" })}</div>
                </div>
                <div>
                  <div className="font-semibold">{d.staffRequest.booking.eventName}</div>
                  <div className="text-sm text-neutral-400">{d.day.startTime}–{d.day.endTime} · {d.staffRequest.task}</div>
                </div>
              </Box>
            </Link>
          ))}
        </div>
      ))}
    </div>
  );
}
