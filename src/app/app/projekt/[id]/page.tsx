import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { LED_PLACEMENTS, LED_PLAYOUT, type LedPlacement, type LedPlayout } from "@/lib/booking";
import { fmtDay } from "@/lib/labels";
import { Box, H } from "../../ui";

export const dynamic = "force-dynamic";

export default async function ProjektPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const b = await prisma.bookingRequest.findUnique({
    where: { id },
    include: {
      days: { orderBy: { date: "asc" } },
      series: { include: { series: true } },
      package: true,
      addons: { include: { addon: true, days: true }, orderBy: { addon: { sortOrder: "asc" } } },
      ledWall: true,
      staff: { where: { status: { in: ["OFFEN", "ZUGESAGT"] } }, include: { user: true, days: true } },
    },
  });
  if (!b) notFound();
  // Team sieht nur Projekte, zu denen es angefragt wurde
  if (user.role === "TEAM" && !b.staff.some((s) => s.userId === user.id)) notFound();
  const answers = (Array.isArray(b.customAnswers) ? b.customAnswers : []) as { label: string; answer: string }[];
  const crew = b.staff.filter((s) => s.status === "ZUGESAGT");
  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.eventLocation)}`;

  return (
    <div>
      <div className="px-4 pt-4">
        <h1 className="text-2xl font-bold">{b.eventName}</h1>
        <a href={maps} target="_blank" rel="noreferrer" className="text-sm text-amber-400">{b.eventLocation} ↗</a>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {b.series.map((s) => <span key={s.seriesId} className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-white" style={{ backgroundColor: s.series.color }}>{s.series.name}</span>)}
        </div>
      </div>

      <H>Tage</H>
      <Box>
        {b.days.map((d) => (
          <div key={d.id} className="flex justify-between border-b border-neutral-800 py-1.5 last:border-0">
            <span>{fmtDay(d.date)}</span><span className="text-neutral-400">{d.startTime}–{d.endTime}</span>
          </div>
        ))}
      </Box>

      <H>Setup</H>
      <Box>
        <Row k="Paket" v={b.package?.name} />
        <Row k="Perspektiven" v={b.perspectives} />
        <Row k="Sprecher" v={b.speakers} />
        <Row k="LED-Bespielung" v={b.ledPlayout ? LED_PLAYOUT[b.ledPlayout as LedPlayout] : null} />
        <Row k="Klassen" v={b.classes} />
        {b.addons.length > 0 && (
          <div className="mt-2 border-t border-neutral-800 pt-2">
            <div className="mb-1 text-xs text-neutral-500">Add-ons</div>
            {b.addons.map((a) => (
              <div key={a.id} className="text-sm">
                {a.addon.name} <span className="text-neutral-500">({b.days.filter((d) => a.days.some((x) => x.dayId === d.id)).map((d) => fmtDay(d.date)).join(", ")})</span>
              </div>
            ))}
          </div>
        )}
        {b.ledWall && (
          <div className="mt-2 border-t border-neutral-800 pt-2 text-sm">
            <div className="mb-1 text-xs text-neutral-500">LED-Wand</div>
            {b.ledWall.count} × {b.ledWall.size} · {b.ledWall.placements.map((p) => LED_PLACEMENTS[p as LedPlacement] ?? p).join(", ")}
          </div>
        )}
      </Box>

      <H>VA-Infos</H>
      <Box>
        <Row k="Zuschauer" v={b.expectedVisitors} />
        <Row k="Catering" v={b.catering} />
        <Row k="Übernachtung" v={b.accommodation} />
        <Row k="Internet" v={b.internet} />
        <Row k="Sonstiges" v={b.notes} />
        {answers.map((a) => <Row key={a.label} k={a.label} v={a.answer} />)}
      </Box>

      <H>Crew</H>
      <Box>
        {crew.length === 0 && <p className="text-sm text-neutral-500">Noch keine Zusagen</p>}
        {crew.map((s) => (
          <div key={s.id} className="flex justify-between py-1 text-sm">
            <span>{s.user.name}</span><span className="text-neutral-400">{s.task}</span>
          </div>
        ))}
      </Box>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  if (v === null || v === undefined || v === "") return null;
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2 py-0.5 text-sm">
      <span className="text-neutral-500">{k}</span><span>{v}</span>
    </div>
  );
}
