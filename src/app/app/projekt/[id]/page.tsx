import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import Link from "next/link";
import { LED_PLACEMENTS, type LedPlacement } from "@/lib/booking";
import { toggleChecklistItem, toggleMaterialPacked } from "../../team-actions";
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
      checklists: { include: { items: { orderBy: { sortOrder: "asc" } } }, orderBy: { createdAt: "asc" } },
      materials: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { article: { include: { category: true } } } },
      plans: { where: { visibleToTeam: true }, orderBy: { updatedAt: "desc" } },
      chat: true,
      locationRef: true,
    },
  });
  const playout = b?.ledPlayout ? await prisma.ledPlayoutOption.findUnique({ where: { code: b.ledPlayout } }) : null;
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
        <Row k="LED-Bespielung" v={playout?.name ?? b.ledPlayout} />
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

      {(b.chat || b.plans.length > 0) && (
        <div className="mx-4 mt-4 flex flex-wrap gap-2">
          {b.chat && <Link href={`/app/chat/${b.chat.id}`} className="btn-ghost">💬 Projekt-Chat</Link>}
          {b.plans.map((p) => <Link key={p.id} href={`/app/plan/${p.id}`} className="btn-ghost">🗺️ {p.name}</Link>)}
        </div>
      )}

      {b.checklists.map((c) => (
        <div key={c.id}>
          <H>{c.name} <span className="text-sm font-normal text-neutral-500">{c.items.filter((i) => i.done).length}/{c.items.length}</span></H>
          <Box>
            {c.items.map((i) => (
              <form key={i.id} action={toggleChecklistItem}>
                <input type="hidden" name="itemId" value={i.id} />
                <button className="flex w-full items-start gap-3 py-1.5 text-left text-sm">
                  <span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border ${i.done ? "border-emerald-500 bg-emerald-500 text-black" : "border-neutral-500"}`}>{i.done ? "✓" : ""}</span>
                  <span className={i.done ? "text-neutral-500 line-through" : ""}>{i.text}{i.done && i.doneBy && <span className="ml-1 text-xs no-underline">({i.doneBy})</span>}</span>
                </button>
              </form>
            ))}
          </Box>
        </div>
      ))}

      {b.materials.length > 0 && (
        <>
          <H>Material <span className="text-sm font-normal text-neutral-500">{b.materials.filter((m) => m.packed).length}/{b.materials.length} gepackt</span></H>
          <Box>
            {b.materials.map((m) => (
              <form key={m.id} action={toggleMaterialPacked}>
                <input type="hidden" name="itemId" value={m.id} />
                <button className="flex w-full items-center gap-3 py-1 text-left text-sm">
                  <span className={`flex size-5 shrink-0 items-center justify-center rounded border ${m.packed ? "border-emerald-500 bg-emerald-500 text-black" : "border-neutral-500"}`}>{m.packed ? "✓" : ""}</span>
                  <span className="w-10 text-right tabular-nums text-neutral-400">{m.quantity}×</span>
                  <span className={m.packed ? "text-neutral-500" : ""}>{m.name}{m.note && <span className="text-neutral-500"> – {m.note}</span>}</span>
                </button>
              </form>
            ))}
          </Box>
        </>
      )}

      {b.locationRef && (
        <>
          <H>Location</H>
          <Box>
            <Row k="Name" v={b.locationRef.name} />
            <Row k="Adresse" v={[b.locationRef.street, [b.locationRef.zip, b.locationRef.city].filter(Boolean).join(" ")].filter(Boolean).join(", ")} />
            <Row k="Kontakt vor Ort" v={[b.locationRef.contactName, b.locationRef.phone].filter(Boolean).join(" · ")} />
            <Row k="Strom" v={b.locationRef.power} />
            <Row k="Internet" v={b.locationRef.internet} />
            <Row k="Bahn / Gelände" v={b.locationRef.trackInfo} />
            <Row k="Notizen" v={b.locationRef.notes} />
          </Box>
        </>
      )}

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
