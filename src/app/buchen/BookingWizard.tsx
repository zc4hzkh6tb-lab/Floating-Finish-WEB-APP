"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ZodError } from "zod";
import {
  LED_PLACEMENTS,
  evaluateRules,
  eventSchema,
  ledOnSiteNeeds,
  ledWallSchema,
  recommendPackage,
  setupSchema,
  type LedPlacement,
} from "@/lib/booking";
import type { MasterData } from "@/lib/masterdata";
import { AddressInput, ClassPicker } from "./inputs";

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
    otherSeries: "",
    catering: "",
    accommodation: "",
    internet: "",
    notes: "",
  });
  const [days, setDays] = useState<Day[]>([newDay()]);
  const [seriesCodes, setSeriesCodes] = useState<string[]>([]);
  const [classList, setClassList] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // Schritt 1
  const [perspectives, setPerspectives] = useState("2");
  const [speakers, setSpeakers] = useState("1");
  const [ledPlayout, setLedPlayoutState] = useState<string>(data.ledPlayouts[0]?.code ?? "");
  const [packageCode, setPackageCode] = useState<string | null>(null);

  // Schritt 2: Add-on-Code -> gewählte Tage
  const [addonDays, setAddonDays] = useState<Record<string, string[]>>({});

  // Schritt 3
  const [led, setLed] = useState({ count: "1", size: "", placements: [] as LedPlacement[], hasMount: false, mountInfo: "" });

  const rules = useMemo(() => evaluateRules(data.rules, seriesCodes, data.packages), [data.rules, seriesCodes, data.packages]);
  const allowedPackages = data.packages.filter((p) => p.sortOrder >= rules.minSort);
  const recommended = useMemo(
    () => recommendPackage(allowedPackages, Number(perspectives) || 1, Number(speakers) || 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allowedPackages.map((p) => p.code).join(), perspectives, speakers],
  );
  const chosen = data.packages.find((p) => p.code === packageCode);
  const pkg = chosen && chosen.sortOrder >= rules.minSort ? chosen : rules.customOffer && packageCode === "" ? undefined : recommended;
  const included = new Set(pkg?.includedAddonCodes ?? []);
  const excluded = new Set(pkg?.excludedAddonCodes ?? []);
  const allAddons = data.addonCategories.flatMap((c) => c.addons);
  const selectedAddons = Object.keys(addonDays).filter((c) => !included.has(c) && !excluded.has(c));
  const ledWallBooked = selectedAddons.some((c) => allAddons.find((a) => a.code === c)?.isLedWall);
  const wallAddon = allAddons.find((a) => a.isLedWall);
  const playout = data.ledPlayouts.find((o) => o.code === ledPlayout);
  const playoutAddonCodes = new Set(data.ledPlayouts.map((o) => o.addonCode).filter(Boolean) as string[]);
  const ledExtras = data.addonCategories.filter((c) => c.group === "LED").flatMap((c) => c.addons).filter((a) => !a.isLedWall && !playoutAddonCodes.has(a.code));

  const GROUP_STEPS = [["KAMERA", "Kameras"], ["ADDON", "Add-ons"], ["SONSTIGES", "Sonstiges"]] as const;
  const groupSteps = GROUP_STEPS.filter(([g]) => data.addonCategories.some((c) => c.group === g && c.addons.length));
  const hasLedStep = data.ledPlayouts.length > 0 || !!wallAddon;
  const steps = ["Veranstaltung", "Grundsetup", ...groupSteps.map(([, l]) => l), ...(hasLedStep ? ["LED-Wand"] : []), "Zusammenfassung"];
  const stepName = steps[step];
  const stepGroup = groupSteps.find(([, l]) => l === stepName)?.[0];

  function setLedPlayout(code: string) {
    setLedPlayoutState(code);
    const add = data.ledPlayouts.find((o) => o.code === code)?.addonCode;
    setAddonDays((prev) => {
      const n = { ...prev };
      for (const c of playoutAddonCodes) if (c !== add) delete n[c];
      if (add && !n[add] && !excluded.has(add)) n[add] = days.map((d) => d.key);
      if (!add && wallAddon) delete n[wallAddon.code];
      return n;
    });
  }
  const setRentWall = (yes: boolean) =>
    wallAddon &&
    setAddonDays((prev) => {
      const n = { ...prev };
      if (yes) n[wallAddon.code] = n[wallAddon.code] ?? days.map((d) => d.key);
      else delete n[wallAddon.code];
      return n;
    });

  const eventPayload = () => ({
    ...event,
    expectedVisitors: event.expectedVisitors === "" ? undefined : event.expectedVisitors,
    classes: classList.join(", "),
    days,
    seriesCodes,
  });

  function validate(): boolean {
    let result: Errors = {};
    if (stepName === "Veranstaltung") {
      const r = eventSchema.safeParse(eventPayload());
      if (!r.success) result = toErrors(r.error);
      if (!classList.length) result.classes = "Bitte mindestens eine Klasse wählen";
      for (const q of data.questions) if (q.required && !answers[q.id]?.trim()) result[`q.${q.id}`] = "Bitte beantworten";
    } else if (stepName === "Grundsetup") {
      const r = setupSchema.safeParse({ perspectives, speakers, ledPlayout, packageCode: pkg?.code ?? "" });
      if (!r.success) result = toErrors(r.error);
      if (!pkg && !rules.customOffer) result.packageCode = "Bitte ein Paket wählen";
    } else if (stepGroup) {
      const codes = new Set(data.addonCategories.filter((c) => c.group === stepGroup).flatMap((c) => c.addons.map((a) => a.code)));
      for (const c of selectedAddons) if (codes.has(c) && !addonDays[c]?.length) result[`addon.${c}`] = "Mindestens einen Tag wählen";
    } else if (stepName === "LED-Wand") {
      if (ledWallBooked) {
        const r = ledWallSchema.safeParse(led);
        if (!r.success) result = toErrors(r.error, "led.");
      }
      for (const a of ledExtras) if (selectedAddons.includes(a.code) && !addonDays[a.code]?.length) result[`addon.${a.code}`] = "Mindestens einen Tag wählen";
    }
    setErrors(result);
    return Object.keys(result).length === 0;
  }

  function next() {
    if (!validate()) return;
    if (step === 0 && ledPlayout) setLedPlayout(ledPlayout);
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
      answers,
      setup: { perspectives, speakers, ledPlayout, packageCode: pkg?.code ?? "" },
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

  const renderAddon = (a: (typeof allAddons)[number]) => {
                  const inc = included.has(a.code);
                  const exc = !inc && excluded.has(a.code);
                  const sel = !inc && !exc && !!addonDays[a.code];
                  return (
                    <div key={a.code} className={`rounded-lg border p-3 ${sel ? "border-amber-500 bg-amber-500/5" : "border-neutral-700"} ${inc ? "opacity-70" : ""} ${exc ? "opacity-40" : ""}`}>
                      <label className="flex cursor-pointer items-center gap-3">
                        <input type="checkbox" className="size-4 accent-amber-500" disabled={inc || exc} checked={inc || sel} onChange={() => toggleAddon(a.code)} />
                        <span className="flex-1">{a.name}</span>
                        {inc ? (
                          <span className="rounded bg-emerald-700/40 px-2 py-0.5 text-xs text-emerald-300">im Paket enthalten</span>
                        ) : exc ? (
                          <span className="rounded bg-neutral-800 px-2 py-0.5 text-xs text-neutral-400">nicht mit Paket {pkg?.name}</span>
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
  };

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
            <div><span className="mb-1 block text-sm text-neutral-400">Ort / Adresse</span><AddressInput value={event.eventLocation} onChange={(v) => setEvent((p) => ({ ...p, eventLocation: v }))} />{errors.eventLocation && <p className="mt-1 text-sm text-red-400">{errors.eventLocation}</p>}</div>
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
            <div><span className="mb-1 block text-sm text-neutral-400">Gefahrene Klassen</span><ClassPicker options={data.classes} value={classList} onChange={setClassList} />{errors.classes && <p className="mt-1 text-sm text-red-400">{errors.classes}</p>}</div>
          </Grid>

          <div>
            <h3 className="mb-2 font-semibold">Wettkampfserien</h3>
            <div className="flex flex-wrap gap-2">
              {data.series.map((s) => (
                <Chip key={s.code} color={s.color} active={seriesCodes.includes(s.code)} onClick={() => setSeriesCodes((p) => (p.includes(s.code) ? p.filter((c) => c !== s.code) : [...p, s.code]))}>
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

          {data.questions.length > 0 && (
            <Grid>
              {data.questions.map((q) => {
                const v = answers[q.id] ?? "";
                const set = (val: string) => setAnswers((p) => ({ ...p, [q.id]: val }));
                const label = q.label + (q.required ? "" : " (optional)");
                if (q.type === "YESNO")
                  return (
                    <div key={q.id}>
                      <span className="mb-1 block text-sm text-neutral-400">{label}</span>
                      <div className="flex gap-2">
                        <Chip active={v === "ja"} onClick={() => set("ja")}>Ja</Chip>
                        <Chip active={v === "nein"} onClick={() => set("nein")}>Nein</Chip>
                      </div>
                      {q.help && <p className="mt-1 text-xs text-neutral-500">{q.help}</p>}
                      {errors[`q.${q.id}`] && <p className="mt-1 text-sm text-red-400">{errors[`q.${q.id}`]}</p>}
                    </div>
                  );
                return (
                  <div key={q.id}>
                    <Field label={label} error={errors[`q.${q.id}`]}>
                      {q.type === "SELECT" ? (
                        <select className="input" value={v} onChange={(e) => set(e.target.value)}>
                          <option value="">Bitte wählen</option>
                          {q.options.map((o) => <option key={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input className="input" type={q.type === "NUMBER" ? "number" : "text"} value={v} onChange={(e) => set(e.target.value)} />
                      )}
                    </Field>
                    {q.help && <p className="mt-1 text-xs text-neutral-500">{q.help}</p>}
                  </div>
                );
              })}
            </Grid>
          )}
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
            <div><span className="text-neutral-500">Klassen:</span> {classList.join(", ") || "–"}</div>
            <div><span className="text-neutral-500">Serie:</span> {[...data.series.filter((s) => seriesCodes.includes(s.code)).map((s) => s.name), event.otherSeries].filter(Boolean).join(", ") || "–"}</div>
          </div>
          <RuleBanner rules={rules} note={data.texts.customOfferNote} />
          <div>
            <h3 className="mb-2 font-semibold">Paket{rules.customOffer ? " (zur Orientierung, optional)" : ""}</h3>
            {errors.packageCode && <p className="mb-2 text-sm text-red-400">{errors.packageCode}</p>}
            <div className="grid gap-3 sm:grid-cols-3">
              {data.packages.map((p) => {
                const blocked = p.sortOrder < rules.minSort;
                return (
                <button
                  type="button"
                  key={p.code}
                  disabled={blocked}
                  onClick={() => setPackageCode(rules.customOffer && pkg?.code === p.code ? "" : p.code)}
                  className={`rounded-xl border p-4 text-left transition ${blocked ? "cursor-not-allowed border-neutral-800 opacity-40" : pkg?.code === p.code ? "border-amber-500 bg-amber-500/10" : "border-neutral-700 hover:border-neutral-500"}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{p.name}</span>
                    <span className="text-amber-400">{p.priceCategory}</span>
                  </div>
                  {recommended?.code === p.code && <div className="mt-1 text-xs font-semibold uppercase text-amber-400">Empfohlen</div>}
                  <p className="mt-2 text-sm text-neutral-400">{p.description}</p>
                  {p.rigText && <p className="mt-2 text-sm text-neutral-300">{p.rigText}</p>}
                  {p.customerItems.length > 0 && (
                    <ul className="mt-2 list-disc pl-4 text-xs text-neutral-400">{p.customerItems.map((i) => <li key={i}>{i}</li>)}</ul>
                  )}
                  {blocked && rules.minPackage && <p className="mt-2 text-xs text-red-300">Bei den gewählten Serien mindestens {rules.minPackage.name}</p>}
                </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {stepGroup && (
        <section className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold">{stepGroup === "KAMERA" ? "Zusätzliche Kameraperspektiven" : stepGroup === "ADDON" ? "Add-ons" : "Sonstiges"}</h2>
            <p className="text-neutral-400">Alles ist für einzelne VA-Tage buchbar. Was im Paket enthalten ist, ist markiert. Nichts gefunden? Einfach weiter.</p>
          </div>
          {data.addonCategories.filter((c) => c.group === stepGroup).map((cat) => (
            <div key={cat.code}>
              <h3 className="mb-3 font-semibold">{cat.name}</h3>
              <div className="space-y-2">
                {cat.addons.map((a) => {
                  return renderAddon(a);
                })}
              </div>
            </div>
          ))}
        </section>
      )}

      {stepName === "LED-Wand" && (
        <section className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold">LED-Wand</h2>
            <p className="text-neutral-400">Zwei kurze Fragen: Was soll auf der Wand laufen, und sollen wir die Wand mitbringen?</p>
          </div>
          <div>
            <h3 className="mb-3 text-lg font-semibold">1. Was soll auf der LED-Wand laufen?</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {data.ledPlayouts.map((o) => (
                <button
                  type="button"
                  key={o.code}
                  onClick={() => setLedPlayout(o.code)}
                  className={`rounded-xl border p-4 text-left transition ${ledPlayout === o.code ? "border-amber-500 bg-amber-500/10" : "border-neutral-700 hover:border-neutral-500"}`}
                >
                  <div className="flex items-center gap-2 font-semibold">
                    <span className={`inline-block size-4 rounded-full border-2 ${ledPlayout === o.code ? "border-amber-500 bg-amber-500" : "border-neutral-500"}`} />
                    {o.name}
                  </div>
                  {o.description && <p className="mt-1 pl-6 text-sm text-neutral-400">{o.description}</p>}
                </button>
              ))}
            </div>
          </div>

          {wallAddon && playout?.addonCode && (
            <div>
              <h3 className="mb-3 text-lg font-semibold">2. Sollen wir die LED-Wand mitbringen?</h3>
              <div className="mb-4 flex gap-3 rounded-xl border-2 border-amber-500 bg-amber-500/10 p-4">
                <span className="text-2xl" aria-hidden>🚚</span>
                <p className="text-amber-100"><strong className="block text-amber-300">Die LED-Wand kommt von uns</strong>{data.texts.ledNote}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={() => setRentWall(true)} className={`rounded-xl border p-4 text-left ${ledWallBooked ? "border-amber-500 bg-amber-500/10" : "border-neutral-700 hover:border-neutral-500"}`}>
                  <div className="font-semibold">Ja, bitte LED-Wand mieten</div>
                  <p className="mt-1 text-sm text-neutral-400">{wallAddon.priceHint ?? "Preis je nach Größe"}</p>
                </button>
                <button type="button" onClick={() => setRentWall(false)} className={`rounded-xl border p-4 text-left ${!ledWallBooked ? "border-amber-500 bg-amber-500/10" : "border-neutral-700 hover:border-neutral-500"}`}>
                  <div className="font-semibold">Nein, vor Ort gibt es schon eine Wand</div>
                  <p className="mt-1 text-sm text-neutral-400">Wir bespielen die vorhandene Wand.</p>
                </button>
              </div>
            </div>
          )}

          {ledWallBooked && (
            <div className="space-y-6 rounded-xl border border-neutral-700 p-4">
              <h3 className="text-lg font-semibold">3. Details zur gemieteten Wand</h3>
              <div>
                <span className="mb-1 block text-sm text-neutral-400">An welchen Tagen?</span>
                <div className="flex flex-wrap gap-2">
                  {days.map((d) => (
                    <Chip key={d.key} small active={addonDays[wallAddon!.code]?.includes(d.key)} onClick={() => toggleAddonDay(wallAddon!.code, d.key)}>{fmtDate(d.date)}</Chip>
                  ))}
                </div>
              </div>
          <Grid>
            <Field label="Wie viele Wände?" error={errors["led.count"]}><input className="input" type="number" min={1} value={led.count} onChange={(e) => setLed((p) => ({ ...p, count: e.target.value }))} /></Field>
            <Field label="Größe" error={errors["led.size"]}>
              <select className="input" value={led.size} onChange={(e) => setLed((p) => ({ ...p, size: e.target.value }))}>
                <option value="">Bitte wählen</option>
                {data.ledSizes.map((s) => <option key={s}>{s}</option>)}
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
            </div>
          )}

          {ledExtras.length > 0 && (
            <div>
              <h3 className="mb-3 text-lg font-semibold">Weitere LED-Optionen</h3>
              <div className="space-y-2">{ledExtras.map((a) => renderAddon(a))}</div>
            </div>
          )}
        </section>
      )}

      {stepName === "Zusammenfassung" && (
        <section className="space-y-6">
          <h2 className="text-2xl font-bold">Zusammenfassung</h2>
          <RuleBanner rules={rules} note={data.texts.customOfferNote} />
          <Summary title="Veranstaltung">
            <Row k="VA" v={`${event.eventName}, ${event.eventLocation}`} />
            <Row k="Veranstalter" v={`${event.organizer} (${event.contactName}, ${event.contactEmail})`} />
            <Row k="Tage" v={days.map((d) => `${fmtDate(d.date)} ${d.startTime}–${d.endTime}`).join(" · ")} />
            <Row k="Zuschauer" v={event.expectedVisitors || "–"} />
            <Row k="Klassen" v={classList.join(", ")} />
            <Row k="Serien" v={[...data.series.filter((s) => seriesCodes.includes(s.code)).map((s) => s.name), event.otherSeries].filter(Boolean).join(", ") || "–"} />
            {data.questions.filter((q) => answers[q.id]).map((q) => (
              <Row key={q.id} k={q.label} v={q.type === "YESNO" ? (answers[q.id] === "ja" ? "Ja" : "Nein") : answers[q.id]} />
            ))}
          </Summary>
          <Summary title="Grundsetup">
            <Row k="Paket" v={pkg ? `${pkg.name} (${pkg.priceCategory})` : "Individuelles Angebot"} />
            <Row k="Perspektiven / Sprecher" v={`${perspectives} / ${speakers}`} />
            <Row k="LED-Bespielung" v={playout?.name ?? "–"} />
            <Row k="LED-Wand von uns" v={ledWallBooked ? "Ja, wird geliefert und vermietet" : "Nein"} />
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

function Chip({ active, onClick, children, small, color }: { active?: boolean; onClick: () => void; children: React.ReactNode; small?: boolean; color?: string }) {
  const glow = active && color ? { backgroundColor: color, borderColor: color, color: "#fff", boxShadow: `0 0 18px ${color}99` } : undefined;
  return (
    <button
      type="button"
      onClick={onClick}
      style={glow}
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

function RuleBanner({ rules, note }: { rules: ReturnType<typeof evaluateRules>; note: string }) {
  if (!rules.hits.length) return null;
  return (
    <div className={`rounded-xl border p-4 text-sm ${rules.customOffer ? "border-sky-600 bg-sky-950/40 text-sky-100" : "border-amber-700 bg-amber-950/30 text-amber-100"}`}>
      {rules.customOffer && <p className="mb-1 font-semibold text-sky-300">Individuelles Angebot</p>}
      <ul className="list-disc space-y-1 pl-5">{rules.messages.map((m) => <li key={m}>{m}</li>)}</ul>
      {rules.customOffer && <p className="mt-2 text-sky-200">{note}</p>}
    </div>
  );
}
