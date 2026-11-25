import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { LED_PLACEMENTS, LED_PLAYOUT, ledOnSiteNeeds, type LedPlacement, type LedPlayout } from "@/lib/booking";
import { STATUS_LABEL, fmtDay } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function AnfragePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await prisma.bookingRequest.findUnique({
    where: { id },
    include: {
      days: { orderBy: { date: "asc" } },
      package: { include: { includedAddons: { include: { addon: true } } } },
      series: { include: { series: true } },
      addons: { include: { addon: true, days: { include: { day: true } } }, orderBy: { addon: { sortOrder: "asc" } } },
      ledWall: true,
    },
  });
  if (!b) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/backoffice" className="text-sm text-neutral-400 hover:text-white">← Alle Anfragen</Link>
      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold">#{b.number} {b.eventName}</h1>
        <span className="rounded-full bg-neutral-800 px-3 py-1 text-sm">{STATUS_LABEL[b.status]}</span>
      </div>
      <p className="text-neutral-400">Eingegangen am {b.createdAt.toLocaleString("de-DE", { timeZone: "Europe/Berlin" })}</p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card title="Veranstalter">
          <R k="Veranstalter" v={b.organizer} />
          <R k="Ansprechpartner" v={b.contactName} />
          <R k="E-Mail" v={<a className="text-amber-400" href={`mailto:${b.contactEmail}`}>{b.contactEmail}</a>} />
          <R k="Telefon" v={b.contactPhone} />
        </Card>
        <Card title="Veranstaltung">
          <R k="Ort" v={b.eventLocation} />
          <R k="Zuschauer" v={b.expectedVisitors} />
          <R k="Klassen" v={b.classes} />
          <R k="Serien" v={[...b.series.map((s) => s.series.name), b.otherSeries].filter(Boolean).join(", ")} />
        </Card>
        <Card title="Tage">
          {b.days.map((d) => <R key={d.id} k={fmtDay(d.date)} v={`${d.startTime}–${d.endTime}`} />)}
        </Card>
        <Card title="Organisation vor Ort">
          <R k="Catering" v={b.catering} />
          <R k="Übernachtung" v={b.accommodation} />
          <R k="Internet" v={b.internet} />
          <R k="Sonstiges" v={b.notes} />
        </Card>
        <Card title="Grundsetup">
          <R k="Paket" v={b.package ? `${b.package.name} (${b.package.priceCategory})` : null} />
          <R k="Perspektiven" v={b.perspectives} />
          <R k="Sprecher" v={b.speakers} />
          <R k="LED-Bespielung" v={b.ledPlayout ? LED_PLAYOUT[b.ledPlayout as LedPlayout] : null} />
          <R k="Im Paket" v={b.package?.includedAddons.map((i) => i.addon.name).join(", ") || "–"} />
        </Card>
        <Card title="Add-ons">
          {b.addons.length === 0 && <p className="text-neutral-500">Keine</p>}
          {b.addons.map((a) => (
            <R key={a.id} k={a.addon.name} v={a.days.map((d) => d.day).sort((x, y) => +x.date - +y.date).map((d) => fmtDay(d.date)).join(", ")} />
          ))}
        </Card>
        {b.ledWall && (
          <Card title="LED-Wand">
            <R k="Anzahl / Größe" v={`${b.ledWall.count} × ${b.ledWall.size}`} />
            <R k="Platzierung" v={b.ledWall.placements.map((p) => LED_PLACEMENTS[p as LedPlacement] ?? p).join(", ")} />
            <R k="Vorrichtung" v={b.ledWall.hasMount ? b.ledWall.mountInfo || "Ja" : "Nein"} />
            <ul className="mt-2 list-disc pl-5 text-neutral-400">
              {ledOnSiteNeeds(b.ledWall).map((n) => <li key={n}>{n}</li>)}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-neutral-800 p-4">
      <h2 className="mb-2 font-semibold">{title}</h2>
      <dl className="space-y-1 text-sm">{children}</dl>
    </section>
  );
}

function R({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[130px_1fr] gap-2">
      <dt className="text-neutral-500">{k}</dt>
      <dd>{v === null || v === undefined || v === "" ? "–" : v}</dd>
    </div>
  );
}
