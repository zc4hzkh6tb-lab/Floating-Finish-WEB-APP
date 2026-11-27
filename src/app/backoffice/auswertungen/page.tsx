import Link from "next/link";
import { prisma } from "@/lib/db";
import { STATUS_LABEL, eur, fmtDay } from "@/lib/labels";
import { Page } from "../ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Auswertungen" };

const TABS = [["uebersicht", "Übersicht"], ["leistungen", "Pakete & Add-ons"], ["technik", "Inventar & Anlagen"], ["projekte", "Projekte"], ["personal", "Personal"], ["kunden", "Kunden & Orte"]] as const;
const MONTHS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const WON = new Set(["BESTAETIGT", "IN_PLANUNG", "DURCHGEFUEHRT", "ABGERECHNET"]);

type Bar = { label: React.ReactNode; key: string; value: number; display?: string; sub?: string };

/** Horizontale Balken für einen Messwert (eine Farbe, Wert als Text daneben, Tooltip per title). */
function Bars({ title, rows, empty = "Keine Daten im Zeitraum" }: { title: string; rows: Bar[]; empty?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <section className="rounded-xl border border-neutral-800 p-4">
      <h3 className="mb-3 font-semibold">{title}</h3>
      {rows.length === 0 && <p className="text-sm text-neutral-500">{empty}</p>}
      <div className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.key} className="group grid grid-cols-[minmax(90px,38%)_1fr_auto] items-center gap-2 text-sm" title={`${typeof r.label === "string" ? r.label : r.key}: ${r.display ?? r.value}${r.sub ? ` (${r.sub})` : ""}`}>
            <span className="truncate text-neutral-300">{r.label}</span>
            <div className="h-3 rounded-r bg-neutral-800/50">
              <div className="h-3 rounded-r bg-amber-500 transition-all group-hover:bg-amber-300" style={{ width: `${(r.value / max) * 100}%`, minWidth: r.value ? 3 : 0 }} />
            </div>
            <span className="w-24 text-right tabular-nums text-neutral-200">{r.display ?? r.value}{r.sub && <span className="block text-[11px] text-neutral-500">{r.sub}</span>}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-neutral-800 p-4">
      <div className="text-xs uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
      {sub && <div className="text-xs text-neutral-500">{sub}</div>}
    </div>
  );
}

const sortDesc = (rows: Bar[]) => rows.sort((a, b) => b.value - a.value);

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ jahr?: string; serie?: string; tab?: string }> }) {
  const sp = await searchParams;
  const tab = TABS.some(([k]) => k === sp.tab) ? sp.tab! : "uebersicht";
  const all = await prisma.bookingRequest.findMany({
    include: {
      days: true,
      package: { include: { rig: true } },
      series: { include: { series: true } },
      addons: { include: { addon: true, days: true } },
      offers: { include: { items: true } },
      materials: { include: { article: { include: { category: true } } } },
      staff: { include: { user: true, days: true } },
      locationRef: true,
      organizerRef: true,
    },
    orderBy: { createdAt: "asc" },
  });
  const yearOf = (b: (typeof all)[number]) => (b.days.length ? Math.min(...b.days.map((d) => d.date.getUTCFullYear())) : b.createdAt.getFullYear());
  const years = [...new Set([...all.map(yearOf), new Date().getFullYear()])].sort((a, b) => b - a);
  const year = sp.jahr === "alle" ? null : Number(sp.jahr) || new Date().getFullYear();
  const series = await prisma.series.findMany({ orderBy: { sortOrder: "asc" } });
  const bs = all.filter((b) => (year === null || yearOf(b) === year) && (!sp.serie || b.series.some((s) => s.series.code === sp.serie)));

  const offerNet = (o: (typeof bs)[number]["offers"][number]) => o.items.reduce((n, i) => n + i.quantity * i.unitPrice, 0);
  const accepted = bs.flatMap((b) => b.offers.filter((o) => o.status === "ANGENOMMEN"));
  const open = bs.flatMap((b) => b.offers.filter((o) => o.status === "VERSENDET" || o.status === "ENTWURF"));
  const won = bs.filter((b) => WON.has(b.status));
  const vaDays = bs.reduce((n, b) => n + b.days.length, 0);
  const link = (p: Record<string, string | undefined>) => {
    const q = new URLSearchParams(Object.entries({ jahr: sp.jahr, serie: sp.serie, tab, ...p }).filter(([, v]) => v) as [string, string][]);
    return `/backoffice/auswertungen?${q}`;
  };

  // Aggregationen
  const count = <T,>(items: T[], key: (t: T) => string | null | undefined, val: (t: T) => number = () => 1) => {
    const m = new Map<string, number>();
    for (const it of items) {
      const k = key(it);
      if (k) m.set(k, (m.get(k) ?? 0) + val(it));
    }
    return m;
  };
  const months = MONTHS.map((m, i) => ({ key: m, label: m, value: bs.reduce((n, b) => n + b.days.filter((d) => d.date.getUTCMonth() === i).length, 0) }));

  return (
    <Page title="Auswertungen" intro="Alle Zahlen beziehen sich auf den gewählten Zeitraum (Jahr des ersten VA-Tags) und die gewählte Serie. Fahre über einen Balken für Details.">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-neutral-400">Jahr:</span>
        {years.map((y) => <Link key={y} href={link({ jahr: String(y) })} className={`rounded-full border px-3 py-1 text-sm ${year === y ? "border-amber-500 bg-amber-500 text-black" : "border-neutral-700"}`}>{y}</Link>)}
        <Link href={link({ jahr: "alle" })} className={`rounded-full border px-3 py-1 text-sm ${year === null ? "border-amber-500 bg-amber-500 text-black" : "border-neutral-700"}`}>alle</Link>
        <span className="ml-4 text-sm text-neutral-400">Serie:</span>
        <Link href={link({ serie: undefined })} className={`rounded-full border px-3 py-1 text-sm ${!sp.serie ? "border-amber-500 bg-amber-500 text-black" : "border-neutral-700"}`}>alle</Link>
        {series.map((s) => <Link key={s.id} href={link({ serie: s.code })} className={`rounded-full border px-3 py-1 text-sm ${sp.serie === s.code ? "border-amber-500 bg-amber-500 text-black" : "border-neutral-700"}`}>{s.code}</Link>)}
      </div>
      <div className="flex flex-wrap gap-1 border-b border-neutral-800">
        {TABS.map(([k, l]) => <Link key={k} href={link({ tab: k })} className={`-mb-px border-b-2 px-3 py-2 text-sm ${tab === k ? "border-amber-500 text-white" : "border-transparent text-neutral-400 hover:text-white"}`}>{l}</Link>)}
      </div>

      {tab === "uebersicht" && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Tile label="Anfragen" value={String(bs.length)} sub={`${bs.filter((b) => b.source !== "BUCHUNG").length} davon Schnellanfragen`} />
            <Tile label="Aufträge" value={String(won.length)} sub={bs.length ? `${Math.round((won.length / bs.length) * 100)} % Abschlussquote` : undefined} />
            <Tile label="VA-Tage" value={String(vaDays)} sub={`${won.reduce((n, b) => n + b.days.length, 0)} davon beauftragt`} />
            <Tile label="Angenommene Angebote" value={eur(accepted.reduce((n, o) => n + offerNet(o), 0))} sub={`netto · offen: ${eur(open.reduce((n, o) => n + offerNet(o), 0))}`} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Bars title="VA-Tage je Monat" rows={months} />
            <Bars title="Anfragen nach Status" rows={Object.entries(STATUS_LABEL).map(([k, l]) => ({ key: k, label: l, value: bs.filter((b) => b.status === k).length }))} />
            <Bars title="Anfragen je Serie" rows={sortDesc(series.map((s) => ({ key: s.code, label: s.name, value: bs.filter((b) => b.series.some((x) => x.seriesId === s.id)).length })).filter((r) => r.value))} />
            <Bars title="Herkunft der Anfragen" rows={sortDesc([...count(bs, (b) => b.source)].map(([k, v]) => ({ key: k, label: k === "BUCHUNG" ? "Buchungstool" : k === "SCHNELL" ? "Schnellanfrage" : "intern erfasst", value: v })))} />
          </div>
        </>
      )}

      {tab === "leistungen" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Bars title="Pakete (Anfragen)" rows={sortDesc([...count(bs, (b) => b.package?.name ?? (b.customOffer ? "Individuelles Angebot" : null))].map(([k, v]) => ({ key: k, label: k, value: v })))} />
          <Bars title="Pakete (beauftragte VA-Tage)" rows={sortDesc([...count(won, (b) => b.package?.name, (b) => b.days.length)].map(([k, v]) => ({ key: k, label: k, value: v, sub: "Tage" })))} />
          <Bars title="Add-ons (gebuchte Tage)" rows={sortDesc([...count(bs.flatMap((b) => b.addons), (a) => a.addon.name, (a) => a.days.length)].map(([k, v]) => ({ key: k, label: k, value: v })))} />
          <Bars title="Add-ons (in wie vielen Anfragen)" rows={sortDesc([...count(bs.flatMap((b) => b.addons), (a) => a.addon.name)].map(([k, v]) => ({ key: k, label: k, value: v })))} />
        </div>
      )}

      {tab === "technik" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Bars title="Anlagen im Einsatz (VA-Tage)" rows={sortDesc([...count(won, (b) => b.package?.rig?.name, (b) => b.days.length)].map(([k, v]) => ({ key: k, label: k, value: v })))} empty="Noch keine beauftragten Jobs mit Anlage" />
          <Bars title="Artikel nach Einsatztagen (Menge × Tage)" rows={sortDesc([...count(bs.flatMap((b) => b.materials.map((m) => ({ m, days: b.days.length }))), (x) => x.m.name, (x) => x.m.quantity * x.days)].map(([k, v]) => ({ key: k, label: k, value: v }))).slice(0, 20)} empty="Noch keine Materiallisten" />
          <Bars title="Artikel: in wie vielen Jobs" rows={sortDesc([...count(bs.flatMap((b) => b.materials), (m) => m.name)].map(([k, v]) => ({ key: k, label: k, value: v }))).slice(0, 20)} empty="Noch keine Materiallisten" />
          <Bars title="Material nach Kategorie (Stück)" rows={sortDesc([...count(bs.flatMap((b) => b.materials), (m) => m.article?.category?.name ?? "frei", (m) => m.quantity)].map(([k, v]) => ({ key: k, label: k, value: v })))} empty="Noch keine Materiallisten" />
        </div>
      )}

      {tab === "projekte" && (
        <div className="overflow-x-auto rounded-xl border border-neutral-800">
          <table className="w-full text-sm">
            <thead className="bg-neutral-900 text-left text-xs text-neutral-400"><tr><th className="p-2">Projekt</th><th className="p-2">Termin</th><th className="p-2">Status</th><th className="p-2 text-right">Tage</th><th className="p-2 text-right">Personal</th><th className="p-2 text-right">Material</th><th className="p-2 text-right">Angebot netto</th></tr></thead>
            <tbody>
              {bs.map((b) => {
                const best = b.offers.find((o) => o.status === "ANGENOMMEN") ?? b.offers[0];
                const first = b.days.map((d) => d.date).sort((x, y) => +x - +y)[0];
                return (
                  <tr key={b.id} className="border-t border-neutral-800">
                    <td className="p-2"><Link href={`/backoffice/anfragen/${b.id}`} className="text-amber-400">#{b.number} {b.eventName}</Link><div className="text-xs text-neutral-500">{b.organizer}</div></td>
                    <td className="p-2">{first ? fmtDay(first) : "–"}</td>
                    <td className="p-2">{STATUS_LABEL[b.status]}</td>
                    <td className="p-2 text-right">{b.days.length}</td>
                    <td className="p-2 text-right">{b.staff.filter((s) => s.status === "ZUGESAGT").length}/{b.staff.length}</td>
                    <td className="p-2 text-right">{b.materials.reduce((n, m) => n + m.quantity, 0)}</td>
                    <td className="p-2 text-right">{best ? eur(offerNet(best)) : "–"}</td>
                  </tr>
                );
              })}
              {bs.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-neutral-500">Keine Projekte im Zeitraum</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === "personal" && (() => {
        const reqs = bs.flatMap((b) => b.staff);
        const people = [...new Set(reqs.map((r) => r.user.name))];
        const rows = people.map((name) => {
          const mine = reqs.filter((r) => r.user.name === name);
          const yes = mine.filter((r) => r.status === "ZUGESAGT");
          const answered = mine.filter((r) => r.status === "ZUGESAGT" || r.status === "ABGESAGT").length;
          return { name, days: yes.reduce((n, r) => n + r.days.length, 0), asked: mine.length, rate: answered ? Math.round((yes.length / answered) * 100) : null };
        });
        return (
          <div className="grid gap-4 lg:grid-cols-2">
            <Bars title="Zugesagte Einsatztage je Person" rows={sortDesc(rows.map((r) => ({ key: r.name, label: r.name, value: r.days, sub: r.rate === null ? undefined : `${r.rate} % Zusagen` })))} empty="Noch keine Personalanfragen" />
            <Bars title="Anfragen je Person" rows={sortDesc(rows.map((r) => ({ key: r.name, label: r.name, value: r.asked })))} empty="Noch keine Personalanfragen" />
            <Bars title="Besetzte Aufgaben" rows={sortDesc([...count(reqs.filter((r) => r.status === "ZUGESAGT"), (r) => r.task, (r) => r.days.length)].map(([k, v]) => ({ key: k, label: k, value: v, sub: "Tage" })))} empty="Noch keine Zusagen" />
          </div>
        );
      })()}

      {tab === "kunden" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Bars title="Veranstalter (Anfragen)" rows={sortDesc([...count(bs, (b) => b.organizerRef?.name ?? b.organizer)].map(([k, v]) => ({ key: k, label: k, value: v }))).slice(0, 20)} />
          <Bars title="Veranstalter (angenommene Angebote, netto)" rows={sortDesc([...count(bs, (b) => b.organizerRef?.name ?? b.organizer, (b) => b.offers.filter((o) => o.status === "ANGENOMMEN").reduce((n, o) => n + offerNet(o), 0))].filter(([, v]) => v > 0).map(([k, v]) => ({ key: k, label: k, value: v, display: eur(v) })))} empty="Noch keine angenommenen Angebote" />
          <Bars title="Locations (VA-Tage)" rows={sortDesc([...count(bs, (b) => b.locationRef?.name ?? b.eventLocation.split(",")[0], (b) => b.days.length)].map(([k, v]) => ({ key: k, label: k, value: v }))).slice(0, 20)} />
        </div>
      )}
    </Page>
  );
}
