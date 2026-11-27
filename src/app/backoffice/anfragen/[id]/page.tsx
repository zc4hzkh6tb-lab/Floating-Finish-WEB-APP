import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { LED_PLACEMENTS, ledOnSiteNeeds, type LedPlacement } from "@/lib/booking";
import { OFFER_STATUS, SOURCE_LABEL, STATUS_LABEL, eur, fmtDay } from "@/lib/labels";
import { addChecklist, addMaterial, createOffer, createPlan, deleteChecklist, deleteMaterial, generateMaterial, linkContacts, locationFromBooking, openChat, organizerFromBooking, updateMaterial } from "../../job-actions";
import { StatusBadge } from "../../StatusBadge";
import { createStaffRequests, withdrawStaffRequest, addBookingAddon, addHistoryEntry, removeBookingAddon, saveInternalNotes, setBookingPackage, setBookingStatus } from "../../actions";

export const dynamic = "force-dynamic";

const STAFF_LABEL = { OFFEN: "offen", ZUGESAGT: "zugesagt", ABGESAGT: "abgesagt", ZURUECKGEZOGEN: "zurückgezogen" } as const;
const STAFF_BAR = { OFFEN: "border-l-amber-500", ZUGESAGT: "border-l-emerald-500", ABGESAGT: "border-l-red-500", ZURUECKGEZOGEN: "border-l-neutral-600" } as const;
const STAFF_TEXT = { OFFEN: "text-amber-300", ZUGESAGT: "text-emerald-300", ABGESAGT: "text-red-300", ZURUECKGEZOGEN: "text-neutral-500" } as const;

const fmtTime = (d: Date) => d.toLocaleString("de-DE", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default async function AnfragePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [b, packages, categories, team, organizers, locations, articles, templates, positions, playouts] = await Promise.all([
    prisma.bookingRequest.findUnique({
      where: { id },
      include: {
        days: { orderBy: { date: "asc" } },
        package: { include: { includedAddons: { include: { addon: true } } } },
        series: { include: { series: true } },
        addons: { include: { addon: true, days: { include: { day: true } } }, orderBy: { addon: { sortOrder: "asc" } } },
        ledWall: true,
        events: { orderBy: { createdAt: "desc" } },
        staff: { include: { user: true, days: { include: { day: true } } }, orderBy: { createdAt: "asc" } },
        offers: { include: { items: true }, orderBy: { createdAt: "desc" } },
        materials: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { article: { include: { category: true } } } },
        plans: { orderBy: { updatedAt: "desc" } },
        checklists: { include: { items: true }, orderBy: { createdAt: "asc" } },
        chat: { include: { _count: { select: { messages: true } } } },
      },
    }),
    prisma.package.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.addonCategory.findMany({ orderBy: { sortOrder: "asc" }, include: { addons: { where: { active: true }, orderBy: { sortOrder: "asc" } } } }),
    prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.organizer.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.location.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.article.findMany({ where: { active: true }, orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }], include: { category: true } }),
    prisma.checklistTemplate.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.position.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.ledPlayoutOption.findMany(),
  ]);
  if (!b) notFound();
  const answers = (Array.isArray(b.customAnswers) ? b.customAnswers : []) as { label: string; answer: string }[];
  const DayChecks = ({ selected }: { selected: Set<string> }) => (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {b.days.map((d) => (
        <label key={d.id} className="flex items-center gap-1.5 text-xs">
          <input type="checkbox" name="dayIds" value={d.id} defaultChecked={selected.has(d.id)} className="size-3.5 accent-amber-500" />
          {fmtDay(d.date)}
        </label>
      ))}
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link href="/backoffice" className="text-sm text-neutral-400 hover:text-white">← Alle Anfragen</Link>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex flex-wrap items-center gap-3 text-2xl font-bold">#{b.number} {b.eventName} <StatusBadge status={b.status} /></h1>
          <p className="text-sm text-neutral-400">Eingegangen am {fmtTime(b.createdAt)} · {SOURCE_LABEL[b.source] ?? b.source}</p>
        </div>
        <form action={setBookingStatus} className="flex items-center gap-2">
          <input type="hidden" name="id" value={b.id} />
          <select key={b.status} name="status" defaultValue={b.status} className="input !w-auto">
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button className="btn-ghost">Status setzen</button>
        </form>
      </div>

      {(b.customOffer || b.ruleHints.length > 0) && (
        <div className={`mt-4 rounded-xl border p-3 text-sm ${b.customOffer ? "border-sky-600 bg-sky-950/40" : "border-amber-700 bg-amber-950/30"}`}>
          {b.customOffer && <div className="font-semibold text-sky-300">Laut Regel: eigenes Angebot nötig</div>}
          <ul className="list-disc pl-5">{b.ruleHints.map((h) => <li key={h}>{h}</li>)}</ul>
        </div>
      )}
      {b.source !== "BUCHUNG" && (
        <p className="mt-4 rounded-lg border border-neutral-700 p-3 text-sm text-neutral-300">Schnellanfrage: Setup, Klassen und Add-ons fehlen noch. Ergänze sie hier, sobald sie geklärt sind.</p>
      )}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card title="Veranstalter">
          <R k="Veranstalter" v={b.organizer} />
          <R k="Ansprechpartner" v={b.contactName} />
          <R k="E-Mail" v={<a className="text-amber-400" href={`mailto:${b.contactEmail}`}>{b.contactEmail}</a>} />
          <R k="Telefon" v={b.contactPhone} />
          <form action={linkContacts} className="mt-3 grid gap-2 border-t border-neutral-800 pt-3">
            <input type="hidden" name="id" value={b.id} />
            <select key={`o${b.organizerId}`} name="organizerId" defaultValue={b.organizerId ?? ""} className="input">
              <option value="">Veranstalter aus Stammdaten zuordnen …</option>
              {organizers.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
            <select key={`l${b.locationId}`} name="locationId" defaultValue={b.locationId ?? ""} className="input">
              <option value="">Location aus Stammdaten zuordnen …</option>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}{l.city ? `, ${l.city}` : ""}</option>)}
            </select>
            <button className="btn-ghost">Zuordnung speichern</button>
          </form>
          <div className="mt-2 flex flex-wrap gap-3 text-xs">
            {!b.organizerId && <form action={organizerFromBooking}><input type="hidden" name="id" value={b.id} /><button className="text-amber-400 hover:underline">Veranstalter als neuen Stammdatensatz anlegen</button></form>}
            {!b.locationId && <form action={locationFromBooking}><input type="hidden" name="id" value={b.id} /><button className="text-amber-400 hover:underline">Ort als neue Location anlegen</button></form>}
          </div>
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
          {answers.map((a) => <R key={a.label} k={a.label} v={a.answer} />)}
        </Card>

        <Card title="Grundsetup">
          <R k="Perspektiven" v={b.perspectives} />
          <R k="Sprecher" v={b.speakers} />
          <R k="LED-Bespielung" v={b.ledPlayout ? (playouts.find((o) => o.code === b.ledPlayout)?.name ?? b.ledPlayout) : null} />
          <R k="Im Paket" v={b.package?.includedAddons.map((i) => i.addon.name).join(", ") || "–"} />
          <form action={setBookingPackage} className="mt-3 flex gap-2">
            <input type="hidden" name="id" value={b.id} />
            <select key={b.packageId ?? "none"} name="packageId" defaultValue={b.packageId ?? ""} className="input">
              <option value="">kein Paket</option>
              {packages.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.priceCategory}){p.active ? "" : " – inaktiv"}</option>)}
            </select>
            <button className="btn-ghost whitespace-nowrap">Paket ändern</button>
          </form>
        </Card>

        <Card title="Add-ons">
          {b.addons.length === 0 && <p className="text-neutral-500">Keine</p>}
          <div className="space-y-3">
            {b.addons.map((a) => (
              <div key={a.id} className="rounded-lg border border-neutral-800 p-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium">{a.addon.name}</span>
                  <form action={removeBookingAddon}>
                    <input type="hidden" name="bookingAddonId" value={a.id} />
                    <button className="text-xs text-red-400 hover:underline">entfernen</button>
                  </form>
                </div>
                <form action={addBookingAddon} className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <input type="hidden" name="id" value={b.id} />
                  <input type="hidden" name="addonId" value={a.addonId} />
                  <DayChecks selected={new Set(a.days.map((d) => d.dayId))} />
                  <button className="text-xs text-amber-400 hover:underline">Tage speichern</button>
                </form>
              </div>
            ))}
          </div>
          <form action={addBookingAddon} className="mt-4 space-y-2 border-t border-neutral-800 pt-3">
            <input type="hidden" name="id" value={b.id} />
            <select name="addonId" className="input" defaultValue="">
              <option value="" disabled>Add-on hinzufügen …</option>
              {categories.map((c) => (
                <optgroup key={c.id} label={c.name}>
                  {c.addons.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </optgroup>
              ))}
            </select>
            <DayChecks selected={new Set(b.days.map((d) => d.id))} />
            <button className="btn-ghost">Hinzufügen</button>
          </form>
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

        <Card title="Personal">
          {b.staff.length === 0 && <p className="text-neutral-500">Noch niemand angefragt</p>}
          <div className="space-y-2">
            {b.staff.map((r) => (
              <div key={r.id} className={`rounded-lg border-l-4 bg-neutral-900/50 p-2 ${STAFF_BAR[r.status]}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{r.user.name} <span className="text-neutral-400">· {r.task}</span></div>
                    <div className="text-xs text-neutral-500">{r.days.map((d) => d.day).sort((x, y) => +x.date - +y.date).map((d) => fmtDay(d.date)).join(", ")}</div>
                    {r.responseNote && <div className="mt-1 text-xs text-neutral-300">„{r.responseNote}“</div>}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-xs font-semibold ${STAFF_TEXT[r.status]}`}>{STAFF_LABEL[r.status]}</span>
                    {(r.status === "OFFEN" || r.status === "ZUGESAGT") && (
                      <form action={withdrawStaffRequest}>
                        <input type="hidden" name="staffRequestId" value={r.id} />
                        <button className="text-xs text-red-400 hover:underline">zurückziehen</button>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <form action={createStaffRequests} className="mt-4 space-y-2 border-t border-neutral-800 pt-3">
            <input type="hidden" name="id" value={b.id} />
            <input name="task" list="positions" className="input" placeholder="Aufgabe / Position, z. B. Kamera Erdwall" required />
            <datalist id="positions">{positions.map((p) => <option key={p.id} value={p.name} />)}</datalist>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {team.map((u) => (
                <label key={u.id} className="flex items-center gap-1.5 text-xs">
                  <input type="checkbox" name="userIds" value={u.id} className="size-3.5 accent-amber-500" />
                  {u.name}{u.position ? <span className="text-neutral-500">({u.position})</span> : null}
                </label>
              ))}
              {team.length === 0 && <span className="text-xs text-neutral-500">Noch keine Nutzer angelegt</span>}
            </div>
            <DayChecks selected={new Set(b.days.map((d) => d.id))} />
            <input name="message" className="input" placeholder="Nachricht (optional)" />
            <button className="btn-ghost">Anfrage an Team senden</button>
          </form>
        </Card>

        <Card title="Interne Notizen">
          <form action={saveInternalNotes} className="space-y-2">
            <input type="hidden" name="id" value={b.id} />
            <textarea key={b.internalNotes ?? ""} name="internalNotes" rows={4} defaultValue={b.internalNotes ?? ""} className="input" placeholder="Nur fürs Team sichtbar" />
            <button className="btn-ghost">Notizen speichern</button>
          </form>
        </Card>
      </div>

      <h2 className="mt-8 text-xl font-bold">Job-Planung</h2>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <Card title="Angebote">
          {b.offers.length === 0 && <p className="text-neutral-500">Noch kein Angebot</p>}
          {b.offers.map((o) => {
            const net = o.items.reduce((n, i) => n + i.quantity * i.unitPrice, 0);
            return <R key={o.id} k={`A-${o.number}`} v={<Link href={`/backoffice/angebote/${o.id}`} className="text-amber-400">{eur(net)} netto · {OFFER_STATUS[o.status]}</Link>} />;
          })}
          <form action={createOffer} className="mt-3"><input type="hidden" name="id" value={b.id} /><button className="btn-ghost">Angebot aus Anfrage erstellen</button></form>
        </Card>
        <Card title="Pläne & Team">
          {b.plans.map((p) => <R key={p.id} k="Plan" v={<Link href={`/backoffice/plaene/${p.id}`} className="text-amber-400">{p.name}</Link>} />)}
          <div className="mt-2 flex flex-wrap gap-2">
            <form action={createPlan}><input type="hidden" name="id" value={b.id} /><button className="btn-ghost">Neuer Aufbauplan</button></form>
            <form action={openChat}><input type="hidden" name="id" value={b.id} /><button className="btn-ghost">Team-Chat {b.chat ? `(${b.chat._count.messages})` : "eröffnen"}</button></form>
          </div>
        </Card>
        <Card title="Checklisten">
          {b.checklists.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-2">
              <span>{c.name} <span className="text-neutral-500">{c.items.filter((i) => i.done).length}/{c.items.length} erledigt</span></span>
              <form action={deleteChecklist}><input type="hidden" name="id" value={b.id} /><input type="hidden" name="checklistId" value={c.id} /><button className="text-xs text-red-400">entfernen</button></form>
            </div>
          ))}
          {b.checklists.length === 0 && <p className="text-neutral-500">Noch keine. Das Team hakt sie in der App ab.</p>}
          <form action={addChecklist} className="mt-3 flex gap-2">
            <input type="hidden" name="id" value={b.id} />
            <select name="templateId" className="input">{templates.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.items.length})</option>)}</select>
            <button className="btn-ghost whitespace-nowrap" disabled={!templates.length}>Hinzufügen</button>
          </form>
        </Card>
      </div>

      <section className="mt-4 rounded-xl border border-neutral-800 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Materialliste <span className="text-sm font-normal text-neutral-500">{b.materials.filter((m) => m.packed).length}/{b.materials.length} gepackt</span></h2>
          <div className="flex gap-2">
            <form action={generateMaterial}><input type="hidden" name="id" value={b.id} /><button className="btn-ghost">{b.materials.length ? "Aus Paket & Add-ons neu erzeugen" : "Aus Paket & Add-ons erzeugen"}</button></form>
            {b.materials.length > 0 && <Link href={`/backoffice/anfragen/${b.id}/material`} className="btn-ghost">Drucken</Link>}
          </div>
        </div>
        <p className="mb-3 text-xs text-neutral-500">Neu erzeugen ersetzt nur die automatischen Positionen. Was du von Hand ergänzt, bleibt.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody>
              {b.materials.map((m) => (
                <tr key={m.id} className="border-t border-neutral-900">
                  <td className="py-1.5 pr-2">{m.name}<div className="text-xs text-neutral-500">{m.article?.category?.name ?? "frei"} · {m.source === "PAKET" ? "Paket" : m.source === "ADDON" ? "Add-on" : "manuell"}</div></td>
                  <td className="py-1.5" colSpan={2}>
                    <form action={updateMaterial} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="id" value={b.id} />
                      <input type="hidden" name="itemId" value={m.id} />
                      <input name="quantity" type="number" min={1} defaultValue={m.quantity} className="input !w-20 !py-1" />
                      <input name="note" defaultValue={m.note ?? ""} placeholder="Notiz" className="input !w-40 !py-1" />
                      <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="packed" defaultChecked={m.packed} className="size-4 accent-emerald-500" />gepackt</label>
                      <button className="text-xs text-amber-400">speichern</button>
                    </form>
                  </td>
                  <td className="py-1.5 text-right"><form action={deleteMaterial}><input type="hidden" name="id" value={b.id} /><input type="hidden" name="itemId" value={m.id} /><button className="text-xs text-red-400">×</button></form></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form action={addMaterial} className="mt-3 flex flex-wrap gap-2 border-t border-neutral-800 pt-3">
          <input type="hidden" name="id" value={b.id} />
          <select name="articleId" className="input !w-auto min-w-56 flex-1">
            <option value="">Artikel aus Inventar … (oder Freitext rechts)</option>
            {articles.map((a) => <option key={a.id} value={a.id}>{a.category ? `${a.category.name}: ` : ""}{a.name}</option>)}
          </select>
          <input name="name" placeholder="Freitext, z. B. Pavillon" className="input !w-48" />
          <input name="quantity" type="number" min={1} defaultValue={1} className="input !w-20" />
          <button className="btn-ghost">Hinzufügen</button>
        </form>
      </section>

      <section className="mt-6 rounded-xl border border-neutral-800 p-4">
        <h2 className="mb-3 font-semibold">Historie</h2>
        <form action={addHistoryEntry} className="mb-4 flex gap-2">
          <input type="hidden" name="id" value={b.id} />
          <input key={b.events.length} name="text" className="input" placeholder="Eintrag hinzufügen, z. B. „Telefonat mit Veranstalter: Strom vor Ort geklärt“" />
          <button className="btn-ghost whitespace-nowrap">Eintragen</button>
        </form>
        <ol className="space-y-2 text-sm">
          {b.events.map((e) => (
            <li key={e.id} className="grid grid-cols-[130px_110px_1fr] gap-2 border-t border-neutral-900 pt-2">
              <span className="text-neutral-500">{fmtTime(e.createdAt)}</span>
              <span className="text-neutral-400">{e.actor}</span>
              <span>{e.text}</span>
            </li>
          ))}
          {b.events.length === 0 && <li className="text-neutral-500">Noch keine Einträge</li>}
        </ol>
      </section>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-neutral-800 p-4">
      <h2 className="mb-2 font-semibold">{title}</h2>
      <div className="space-y-1 text-sm">{children}</div>
    </section>
  );
}

function R({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[130px_1fr] gap-2">
      <span className="text-neutral-500">{k}</span>
      <span>{v === null || v === undefined || v === "" ? "–" : v}</span>
    </div>
  );
}
