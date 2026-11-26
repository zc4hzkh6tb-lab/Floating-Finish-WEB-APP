import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fmtDay } from "@/lib/labels";
import { acceptStaffRequest, declineStaffRequest } from "./actions";
import { Box, Empty, H } from "./ui";

export const dynamic = "force-dynamic";

export default async function AppStart() {
  const user = await requireUser();
  const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");
  const requests = await prisma.staffRequest.findMany({
    where: { userId: user.id, status: { in: ["OFFEN", "ZUGESAGT"] } },
    include: { booking: true, days: { include: { day: true } } },
    orderBy: { createdAt: "desc" },
  });
  const sortedDays = (r: (typeof requests)[number]) => r.days.map((d) => d.day).sort((a, b) => +a.date - +b.date);
  const open = requests.filter((r) => r.status === "OFFEN");
  const upcoming = requests
    .filter((r) => r.status === "ZUGESAGT" && sortedDays(r).some((d) => d.date >= today))
    .sort((a, b) => +sortedDays(a)[0].date - +sortedDays(b)[0].date);

  return (
    <div>
      <H>Offene Anfragen {open.length > 0 && <span className="ml-1 rounded-full bg-amber-500 px-2 py-0.5 text-sm text-black">{open.length}</span>}</H>
      {open.length === 0 && <Empty>Keine offenen Anfragen.</Empty>}
      {open.map((r) => (
        <Box key={r.id} className="border-amber-500/50">
          <Link href={`/app/projekt/${r.bookingId}`} className="block">
            <div className="text-lg font-semibold">{r.booking.eventName}</div>
            <div className="text-sm text-neutral-400">{r.booking.eventLocation}</div>
            <div className="mt-2 text-sm"><span className="text-neutral-500">Aufgabe:</span> {r.task}</div>
            <div className="text-sm"><span className="text-neutral-500">Tage:</span> {sortedDays(r).map((d) => `${fmtDay(d.date)} ${d.startTime}–${d.endTime}`).join(" · ")}</div>
            {r.message && <p className="mt-2 rounded-lg bg-neutral-800 p-2 text-sm">{r.message}</p>}
          </Link>
          <form action={acceptStaffRequest} className="mt-3 space-y-2">
            <input type="hidden" name="id" value={r.id} />
            <input name="note" className="input" placeholder="Anmerkung (optional)" />
            <div className="grid grid-cols-2 gap-2">
              <button formAction={acceptStaffRequest} className="rounded-xl bg-emerald-600 py-3 font-semibold text-white">Zusagen</button>
              <button formAction={declineStaffRequest} className="rounded-xl bg-neutral-800 py-3 font-semibold text-neutral-200">Absagen</button>
            </div>
          </form>
        </Box>
      ))}

      <H>Meine nächsten Einsätze</H>
      {upcoming.length === 0 && <Empty>Keine bestätigten Einsätze.</Empty>}
      {upcoming.map((r) => (
        <Link key={r.id} href={`/app/projekt/${r.bookingId}`}>
          <Box className="border-l-4 border-l-emerald-500">
            <div className="font-semibold">{r.booking.eventName}</div>
            <div className="text-sm text-neutral-400">{r.task} · {sortedDays(r).map((d) => fmtDay(d.date)).join(", ")}</div>
          </Box>
        </Link>
      ))}
    </div>
  );
}
