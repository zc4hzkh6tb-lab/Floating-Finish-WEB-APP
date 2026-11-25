"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ZodError } from "zod";
import {
  LED_PLACEMENTS,
  LED_PLAYOUT,
  LED_PLAYOUT_ADDON,
  LED_SIZES,
  eventSchema,
  ledOnSiteNeeds,
  ledWallSchema,
  recommendPackage,
  setupSchema,
  type LedPlacement,
  type LedPlayout,
} from "@/lib/booking";
import type { MasterData } from "@/lib/masterdata";

type Day = { key: string; date: string; startTime: string; endTime: string; note: string };

const newDay = (): Day => ({ key: Math.random().toString(36).slice(2, 10), date: "", startTime: "09:00", endTime: "18:00", note: "" });

const fmtDate = (iso: string) => (iso ? new Date(iso + "T00:00:00").toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" }) : "ohne Datum");

type Errors = Record<string, string>;
const toErrors = (e: ZodError, prefix = ""): Errors =>
  Object.fromEntries(e.issues.map((i) => [prefix + i.path.join("."), i.message]));

export default function BookingWizard({ data }: { data: MasterData }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Seite 0
  const [event, setEvent] = useState({
    organizer: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    eventName: "",
    eventLocation: "",
    expectedVisitors: "",
    classes: "",
    otherSeries: "",
    catering: "",
    accommodation: "",
    internet: "",
    notes: "",
  });
  const [days, setDays] = useState<Day[]>([newDay()]);
  const [seriesCodes, setSeriesCodes] = useState<string[]>([]);

  // Schritt 1
  const [perspectives, setPerspectives] = useState("2");
  const [speakers, setSpeakers] = useState("1");
  const [ledPlayout, setLedPlayout] = useState<LedPlayout>("NONE");
  const [packageCode, setPackageCode] = useState<string | null>(null);

  // Schritt 2: Add-on-Code -> gewählte Tage
  const [addonDays, setAddonDays] = useState<Record<string, string[]>>({});

  // Schritt 3
  const [led, setLed] = useState({ count: "1", size: "", placements: [] as LedPlacement[], hasMount: false, mountInfo: "" });

  const recommended = useMemo(
    () => recommendPackage(data.packages, Number(perspectives) || 1, Number(speakers) || 0),
    [data.packages, perspectives, speakers],
  );
  const pkg = data.packages.find((p) => p.code === (packageCode ?? recommended?.code));
  const included = new Set(pkg?.includedAddonCodes ?? []);
  const allAddons = data.addonCategories.flatMap((c) => c.addons);
  const selectedAddons = Object.keys(addonDays).filter((c) => !included.has(c));
  const ledWallBooked = selectedAddons.some((c) => allAddons.find((a) => a.code === c)?.isLedWall);

  const steps = ["Veranstaltung", "Grundsetup", "Add-ons", ...(ledWallBooked ? ["LED-Wand"] : []), "Zusammenfassung"];
  const stepName = steps[step];

  const eventPayload = () => ({
    ...event,
    expectedVisitors: event.expectedVisitors === "" ? undefined : event.expectedVisitors,
    days,
    seriesCodes,
  });

  function validate(): boolean {
    let result: Errors = {};
    if (stepName === "Veranstaltung") {
      const r = eventSchema.safeParse(eventPayload());
      if (!r.success) result = toErrors(r.error);
    } else if (stepName === "Grundsetup") {
      const r = setupSchema.safeParse({ perspectives, speakers, ledPlayout, packageCode: pkg?.code ?? "" });
      if (!r.success) result = toErrors(r.error);
    } else if (stepName === "Add-ons") {
      for (const c of selectedAddons) if (!addonDays[c]?.length) result[`addon.${c}`] = "Mindestens einen Tag wählen";
    } else if (stepName === "LED-Wand") {
      const r = ledWallSchema.safeParse(led);
      if (!r.success) result = toErrors(r.error, "led.");
    }
    setErrors(result);
    return Object.keys(result).length === 0;
  }

  function next() {
    if (!validate()) return;
    if (stepName === "Grundsetup") {
      // Gewählte Bespielung als Add-on vormerken (alle Tage)
      const code = LED_PLAYOUT_ADDON[ledPlayout];
      setAddonDays((prev) => {
        const nextSel = { ...prev };
        for (const c of Object.values(LED_PLAYOUT_ADDON)) if (c && c !== code && nextSel[c]) delete nextSel[c];
        if (code && !nextSel[code]) nextSel[code] = days.map((d) => d.key);
        return nextSel;
      });
    }
    setStep((s) => s + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function back() {
    setErrors({});
    setStep((s) => Math.max(0, s - 1));
  }

  async function submit() {
    setSubmitting(true);
    setSubmitError(null);
    const body = {
      event: eventPayload(),
      setup: { perspectives, speakers, ledPlayout, packageCode: pkg?.code },
      addons: selectedAddons.map((code) => ({ code, dayKeys: addonDays[code] })),
      ledWall: ledWallBooked ? led : null,
    };
    try {
      const res = await fetch("/api/anfragen", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Senden fehlgeschlagen");
      router.push(`/buchen/danke?nr=${json.number}`);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Senden fehlgeschlagen");
      setSubmitting(false);
    }
  }

  const toggleAddon = (code: string) =>
    setAddonDays((prev) => {
      const n = { ...prev };
      if (n[code]) delete n[code];
      else n[code] = days.map((d) => d.key);
      return n;
    });
  const toggleAddonDay = (code: string, key: string) =>
    setAddonDays((prev) => {
      const cur = prev[code] ?? [];
      return { ...prev, [code]: cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key] };
    });

  const setEv = (k: keyof typeof event) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setEvent((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <ol className="mb-8 flex flex-wrap gap-2 text-sm">
        {steps.map((s, i) => (
          <li
            key={s}
            className={`rounded-full px-3 py-1 ${i === step ? "bg-amber-500 font-semibold text-black" : i < step ? "bg-neutral-700 text-neutral-200" : "bg-neutral-800 text-neutral-500"}`}
          >
            {i + 1}. {s}
          </li>
        ))}
      </ol>

      {stepName === "Veranstaltung" && (
        <section className="space-y-6">
          <h2 className="text-2xl font-bold">Infos zur Veranstaltung</h2>
          <Grid>
            <Field label="Veranstalter" error={errors.organizer}><input className="input" value={event.organizer} onChange={setEv("organizer")} /></Field>
            <Field label="Ansprechpartner" error={errors.contactName}><input className="input" value={event.contactName} onChange={setEv("contactName")} /></Field>
            <Field label="E-Mail" error={errors.contactEmail}><input className="input" type="email" value={event.contactEmail} onChange={setEv("contactEmail")} /></Field>
            <Field label="Telefon (optional)"><input className="input" value={event.contactPhone} onChange={setEv("contactPhone")} /></Field>
            <Field label="Name der VA" error={errors.eventName}><input className="input" value={event.eventName} onChange={setEv("eventName")} /></Field>
            <Field label="Ort / Adresse" error={errors.eventLocation}><input className="input" value={event.eventLocation} onChange={setEv("eventLocation")} /></Field>
          </Grid>

          <div>
            <h3 className="mb-2 font-semibold">VA-Tage und Uhrzeiten</h3>
            {errors.days && <p className="mb-2 text-sm text-red-400">{errors.days}</p>}
            <div className="space-y-3">
              {days.map((d, i) => (
                <div key={d.key} className="grid grid-cols-2 gap-2 rounded-lg border border-neutral-700 p-3 sm:grid-cols-[1fr_110px_110px_auto]">
                  <Field label={`Tag ${i + 1}`} error={errors[`days.${i}.date`]}>
                    <input className="input" type="date" value={d.date} onChange={(e) => setDays((p) => p.map((x) => (x.key === d.key ? { ...x, date: e.target.value } : x)))} />
                  </Field>
                  <Field label="Beginn" error={errors[`days.${i}.startTime`]}>
                    <input className="input" type="time" value={d.startTime} onChange={(e) => setDays((p) => p.map((x) => (x.key === d.key ? { ...x, startTime: e.target.value } : x)))} />
                  </Field>
                  <Field label="Ende" error={errors[`days.${i}.endTime`]}>
                    <input className="input" type="time" value={d.endTime} onChange={(e) => setDays((p) => p.map((x) => (x.key === d.key ? { ...x, endTime: e.target.value } : x)))} />
                  </Field>
                  <div className="flex items-end">
                    {days.length > 1 && (
                      <button type="button" className="btn-ghost" onClick={() => setDays((p) => p.filter((x) => x.key !== d.key))}>Entfernen</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button type="button" className="btn-ghost mt-3" onClick={() => setDays((p) => [...p, newDay()])}>+ Tag hinzufügen</button>
          </div>

          <Grid>
            <Field label="Erwartete Zuschauer vor Ort"><input className="input" type="number" min={0} value={event.expectedVisitors} onChange={setEv("expectedVisitors")} /></Field>
            <Field label="Gefahrene Klassen" error={errors.classes}><input className="input" placeholder="z. B. 3,5 t Sport, 4,5 t Standard …" value={event.classes} onChange={setEv("classes")} /></Field>
          </Grid>

          <div>
            <h3 className="mb-2 font-semibold">Wettkampfserien</h3>
            <div className="flex flex-wrap gap-2">
              {data.series.map((s) => (
                <Chip key={s.code} active={seriesCodes.includes(s.code)} onClick={() => setSeriesCodes((p) => (p.includes(s.code) ? p.filter((c) => c !== s.code) : [...p, s.code]))}>
                  {s.name}
                </Chip>
              ))}
            </div>
            <div className="mt-3"><Field label="Freie Klassen / sonstige Serie"><input className="input" value={event.otherSeries} onChange={setEv("otherSeries")} /></Field></div>
          </div>

          <Grid>
            <Field label="Catering fürs Team"><textarea className="input" rows={2} placeholder="Wie ist das Catering geregelt?" value={event.catering} onChange={setEv("catering")} /></Field>
            <Field label="Übernachtung"><textarea className="input" rows={2} placeholder="Wie ist die Übernachtung geregelt?" value={event.accommodation} onChange={setEv("accommodation")} /></Field>
            <Field label="Internet vor Ort"><textarea className="input" rows={2} placeholder="Vorhanden? Art der Verbindung (Glasfaser, LTE/5G, Starlink …)" value={event.internet} onChange={setEv("internet")} /></Field>
            <Field label="Sonstiges"><textarea className="input" rows={2} value={event.notes} onChange={setEv("notes")} /></Field>
          </Grid>
        </section>
      )}

      {stepName === "Grundsetup" && (
        <section className="space-y-6">
          <h2 className="text-2xl font-bold">Grundsetup</h2>
          <p className="text-neutral-400">Aus deinen Angaben empfehlen wir ein Grundpaket. Du kannst auch ein anderes wählen.</p>
          <Grid>
            <Field label="Wie viele Perspektiven?" error={errors.perspectives}><input className="input" type="number" min={1} value={perspectives} onChange={(e) => { setPerspectives(e.target.value); setPackageCode(null); }} /></Field>
            <Field label="Wie viele Sprecher?" error={errors.speakers}><input className="input" type="number" min={0} value={speakers} onChange={(e) => { setSpeakers(e.target.value); setPackageCode(null); }} /></Field>
          </Grid>
          <div className="rounded-lg bg-neutral-900 p-3 text-sm text-neutral-300">
            <div><span className="text-neutral-500">Klassen:</span> {event.classes || "–"}</div>
            <div><span className="text-neutral-500">Serie:</span> {[...data.series.filter((s) => seriesCodes.includes(s.code)).map((s) => s.name), event.otherSeries].filter(Boolean).join(", ") || "–"}</div>
          </div>
          <div>
            <h3 className="mb-2 font-semibold">LED-Wand-Bespielung</h3>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(LED_PLAYOUT) as LedPlayout[]).map((k) => (
                <Chip key={k} active={ledPlayout === k} onClick={() => setLedPlayout(k)}>{LED_PLAYOUT[k]}</Chip>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-2 font-semibold">Paket</h3>
            {errors.packageCode && <p className="mb-2 text-sm text-red-400">{errors.packageCode}</p>}
            <div className="grid gap-3 sm:grid-cols-3">
              {data.packages.map((p) => (
                <button
                  type="button"
                  key={p.code}
                  onClick={() => setPackageCode(p.code)}
                  className={`rounded-xl border p-4 text-left transition ${pkg?.code === p.code ? "border-amber-500 bg-amber-500/10" : "border-neutral-700 hover:border-neutral-500"}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{p.name}</span>
                    <span className="text-amber-400">{p.priceCategory}</span>
                  </div>
                  {recommended?.code === p.code && <div className="mt-1 text-xs font-semibold uppercase text-amber-400">Empfohlen</div>}
                  <p className="mt-2 text-sm text-neutral-400">{p.description}</p>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {stepName === "Add-ons" && (
        <section className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold">Add-ons</h2>
            <p className="text-neutral-400">Jedes Add-on ist für einzelne VA-Tage buchbar.</p>
          </div>
          {data.addonCategories.map((cat) => (
            <div key={cat.code}>
              <h3 className="mb-3 font-semibold">{cat.name}</h3>
              <div className="space-y-2">
                {cat.addons.map((a) => {
                  const inc = included.has(a.code);
                  const sel = !inc && !!addonDays[a.code];
                  return (
                    <div key={a.code} className={`rounded-lg border p-3 ${sel ? "border-amber-500 bg-amber-500/5" : "border-neutral-700"} ${inc ? "opacity-70" : ""}`}>
                      <label className="flex cursor-pointer items-center gap-3">
                        <input type="checkbox" className="size-4 accent-amber-500" disabled={inc} checked={inc || sel} onChange={() => toggleAddon(a.code)} />
                        <span className="flex-1">{a.name}</span>
                        {inc ? (
                          <span className="rounded bg-emerald-700/40 px-2 py-0.5 text-xs text-emerald-300">im Paket enthalten</span>
                        ) : (
                          <span className="text-sm text-neutral-400">{a.priceHint ?? "Preis folgt"}</span>
                        )}
                      </label>
                      {sel && (
                        <div className="mt-3 flex flex-wrap gap-2 pl-7">
                          {days.map((d) => (
                            <Chip key={d.key} small active={addonDays[a.code]?.includes(d.key)} onClick={() => toggleAddonDay(a.code, d.key)}>{fmtDate(d.date)}</Chip>
                          ))}
                          {errors[`addon.${a.code}`] && <p className="w-full text-sm text-red-400">{errors[`addon.${a.code}`]}</p>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      )}

      {stepName === "LED-Wand" && (
        <section className="space-y-6">
          <h2 className="text-2xl font-bold">LED-Wand</h2>
          <Grid>
            <Field label="Wie viele Wände?" error={errors["led.count"]}><input className="input" type="number" min={1} value={led.count} onChange={(e) => setLed((p) => ({ ...p, count: e.target.value }))} /></Field>
            <Field label="Größe" error={errors["led.size"]}>
              <select className="input" value={led.size} onChange={(e) => setLed((p) => ({ ...p, size: e.target.value }))}>
                <option value="">Bitte wählen</option>
                {LED_SIZES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
          </Grid>
          <div>
            <h3 className="mb-2 font-semibold">Wo soll die Wand stehen?</h3>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(LED_PLACEMENTS) as LedPlacement[]).map((k) => (
                <Chip key={k} active={led.placements.includes(k)} onClick={() => setLed((p) => ({ ...p, placements: p.placements.includes(k) ? p.placements.filter((x) => x !== k) : [...p.placements, k] }))}>
                  {LED_PLACEMENTS[k]}
                </Chip>
              ))}
            </div>
            {errors["led.placements"] && <p className="mt-2 text-sm text-red-400">{errors["led.placements"]}</p>}
          </div>
          <div>
            <h3 className="mb-2 font-semibold">Gibt es vor Ort eine Vorrichtung zum Aufständern?</h3>
            <div className="flex gap-2">
              <Chip active={led.hasMount} onClick={() => setLed((p) => ({ ...p, hasMount: true }))}>Ja</Chip>
              <Chip active={!led.hasMount} onClick={() => setLed((p) => ({ ...p, hasMount: false }))}>Nein</Chip>
            </div>
            {led.hasMount && <div className="mt-3"><Field label="Welche Vorrichtung?"><input className="input" value={led.mountInfo} onChange={(e) => setLed((p) => ({ ...p, mountInfo: e.target.value }))} /></Field></div>}
          </div>
          {led.size && led.placements.length > 0 && (
            <div className="rounded-xl border border-sky-700 bg-sky-950/40 p-4">
              <h3 className="mb-2 font-semibold text-sky-300">Das wird vor Ort benötigt</h3>
              <ul className="list-disc space-y-1 pl-5 text-sm text-sky-100">
                {ledOnSiteNeeds({ count: Number(led.count) || 1, size: led.size, placements: led.placements, hasMount: led.hasMount }).map((n) => <li key={n}>{n}</li>)}
              </ul>
            </div>
          )}
        </section>
      )}

      {stepName === "Zusammenfassung" && (
        <section className="space-y-6">
          <h2 className="text-2xl font-bold">Zusammenfassung</h2>
          <Summary title="Veranstaltung">
            <Row k="VA" v={`${event.eventName}, ${event.eventLocation}`} />
            <Row k="Veranstalter" v={`${event.organizer} (${event.contactName}, ${event.contactEmail})`} />
            <Row k="Tage" v={days.map((d) => `${fmtDate(d.date)} ${d.startTime}–${d.endTime}`).join(" · ")} />
            <Row k="Zuschauer" v={event.expectedVisitors || "–"} />
            <Row k="Klassen" v={event.classes} />
            <Row k="Serien" v={[...data.series.filter((s) => seriesCodes.includes(s.code)).map((s) => s.name), event.otherSeries].filter(Boolean).join(", ") || "–"} />
          </Summary>
          <Summary title="Grundsetup">
            <Row k="Paket" v={`${pkg?.name} (${pkg?.priceCategory})`} />
            <Row k="Perspektiven / Sprecher" v={`${perspectives} / ${speakers}`} />
            <Row k="LED-Bespielung" v={LED_PLAYOUT[ledPlayout]} />
          </Summary>
          <Summary title="Add-ons">
            {selectedAddons.length === 0 && <p className="text-neutral-400">Keine</p>}
            {selectedAddons.map((c) => (
              <Row key={c} k={allAddons.find((a) => a.code === c)?.name ?? c} v={days.filter((d) => addonDays[c]?.includes(d.key)).map((d) => fmtDate(d.date)).join(", ")} />
            ))}
          </Summary>
          {ledWallBooked && (
            <Summary title="LED-Wand">
              <Row k="Anzahl / Größe" v={`${led.count} × ${led.size}`} />
              <Row k="Platzierung" v={led.placements.map((p) => LED_PLACEMENTS[p]).join(", ")} />
              <Row k="Vorrichtung" v={led.hasMount ? led.mountInfo || "Ja" : "Nein"} />
            </Summary>
          )}
          {submitError && <p className="text-red-400">{submitError}</p>}
        </section>
      )}

      <div className="mt-10 flex justify-between">
        <button type="button" className="btn-ghost" onClick={back} disabled={step === 0}>Zurück</button>
        {stepName === "Zusammenfassung" ? (
          <button type="button" className="btn-primary" onClick={submit} disabled={submitting}>{submitting ? "Wird gesendet …" : "Anfrage senden"}</button>
        ) : (
          <button type="button" className="btn-primary" onClick={next}>Weiter</button>
        )}
      </div>
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block">
        <span className="mb-1 block text-sm text-neutral-400">{label}</span>
        {children}
      </label>
      {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
    </div>
  );
}

function Chip({ active, onClick, children, small }: { active?: boolean; onClick: () => void; children: React.ReactNode; small?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border ${small ? "px-3 py-1 text-xs" : "px-4 py-2 text-sm"} transition ${active ? "border-amber-500 bg-amber-500 font-semibold text-black" : "border-neutral-600 text-neutral-300 hover:border-neutral-400"}`}
    >
      {children}
    </button>
  );
}

function Summary({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-neutral-700 p-4">
      <h3 className="mb-2 font-semibold">{title}</h3>
      <dl className="space-y-1 text-sm">{children}</dl>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-2">
      <dt className="text-neutral-500">{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
