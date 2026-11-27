"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AddressInput } from "../inputs";

export default function QuickForm({ series }: { series: { code: string; name: string; color: string }[] }) {
  const router = useRouter();
  const [v, setV] = useState({ organizer: "", contactName: "", contactEmail: "", contactPhone: "", eventName: "", eventLocation: "", dateFrom: "", dateTo: "", notes: "" });
  const [codes, setCodes] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV((p) => ({ ...p, [k]: e.target.value }));
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/schnellanfrage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...v, seriesCodes: codes }) });
    const json = await res.json();
    if (!res.ok) {
      setErr(json.error ?? "Senden fehlgeschlagen");
      setBusy(false);
      return;
    }
    router.push(`/buchen/danke?nr=${json.number}`);
  }
  const F = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <label className="block"><span className="mb-1 block text-sm text-neutral-400">{label}</span>{children}</label>
  );
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {F({ label: "Veranstalter", children: <input className="input" value={v.organizer} onChange={set("organizer")} /> })}
        {F({ label: "Ansprechpartner", children: <input className="input" value={v.contactName} onChange={set("contactName")} /> })}
        {F({ label: "E-Mail", children: <input className="input" type="email" value={v.contactEmail} onChange={set("contactEmail")} /> })}
        {F({ label: "Telefon", children: <input className="input" value={v.contactPhone} onChange={set("contactPhone")} /> })}
        {F({ label: "Name der VA", children: <input className="input" value={v.eventName} onChange={set("eventName")} /> })}
        <div><span className="mb-1 block text-sm text-neutral-400">Ort</span><AddressInput value={v.eventLocation} onChange={(x) => setV((p) => ({ ...p, eventLocation: x }))} /></div>
        {F({ label: "Erster Tag", children: <input className="input" type="date" value={v.dateFrom} onChange={set("dateFrom")} /> })}
        {F({ label: "Letzter Tag (optional)", children: <input className="input" type="date" value={v.dateTo} onChange={set("dateTo")} /> })}
      </div>
      <div>
        <span className="mb-2 block text-sm text-neutral-400">Serien</span>
        <div className="flex flex-wrap gap-2">
          {series.map((s) => {
            const on = codes.includes(s.code);
            return (
              <button type="button" key={s.code} onClick={() => setCodes((p) => (on ? p.filter((c) => c !== s.code) : [...p, s.code]))}
                style={on ? { backgroundColor: s.color, borderColor: s.color, boxShadow: `0 0 18px ${s.color}99` } : undefined}
                className={`rounded-full border px-4 py-2 text-sm ${on ? "font-semibold text-white" : "border-neutral-600 text-neutral-300"}`}>{s.name}</button>
            );
          })}
        </div>
      </div>
      {F({ label: "Was ist geplant? (optional)", children: <textarea className="input" rows={3} value={v.notes} onChange={set("notes")} /> })}
      {err && <p className="text-red-400">{err}</p>}
      <button className="btn-primary" disabled={busy}>{busy ? "Wird gesendet …" : "Schnellanfrage senden"}</button>
    </form>
  );
}
