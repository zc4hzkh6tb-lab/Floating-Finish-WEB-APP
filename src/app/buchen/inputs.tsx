"use client";

import { useEffect, useRef, useState } from "react";

/** Mehrfachauswahl mit Suchvorschlägen, z. B. „3,5“ zeigt alle 3,5-t-Klassen. Freie Eingabe per Enter. */
export function ClassPicker({ options, value, onChange }: { options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "").replace(",", ".");
  const hits = options.filter((o) => !value.includes(o) && (q === "" || norm(o).includes(norm(q)))).slice(0, 12);
  const add = (v: string) => {
    const t = v.trim();
    if (t && !value.includes(t)) onChange([...value, t]);
    setQ("");
  };
  return (
    <div className="relative">
      <div className="input flex min-h-[42px] flex-wrap items-center gap-1.5 !py-1.5">
        {value.map((v) => (
          <span key={v} className="flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-0.5 text-xs font-semibold text-black">
            {v}
            <button type="button" aria-label={`${v} entfernen`} onClick={() => onChange(value.filter((x) => x !== v))} className="ml-0.5 font-bold">×</button>
          </span>
        ))}
        <input
          aria-label="Klasse suchen"
          className="min-w-32 flex-1 bg-transparent outline-none"
          placeholder={value.length ? "" : "z. B. 3,5 eingeben …"}
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); add(hits[0] && q ? hits[0] : q); }
            if (e.key === "Backspace" && !q && value.length) onChange(value.slice(0, -1));
          }}
        />
      </div>
      {open && (hits.length > 0 || q) && (
        <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-neutral-700 bg-neutral-900 py-1 shadow-xl">
          {hits.map((h) => (
            <li key={h}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => add(h)} className="w-full px-3 py-1.5 text-left text-sm hover:bg-neutral-800">{h}</button>
            </li>
          ))}
          {q && !options.some((o) => norm(o) === norm(q)) && (
            <li>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => add(q)} className="w-full px-3 py-1.5 text-left text-sm text-neutral-400 hover:bg-neutral-800">„{q}“ als eigene Klasse hinzufügen</button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

type PhotonFeature = { properties: { name?: string; street?: string; housenumber?: string; postcode?: string; city?: string; country?: string; state?: string } };

const fmtAddress = (p: PhotonFeature["properties"]) => {
  const street = [p.street, p.housenumber].filter(Boolean).join(" ");
  const place = [p.postcode, p.city].filter(Boolean).join(" ");
  const first = p.name && p.name !== p.street ? p.name : "";
  return [first, street, place, p.country].filter(Boolean).join(", ");
};

/** Adressfeld mit Vorschlägen (OpenStreetMap über Photon, ohne API-Schlüssel). */
export function AddressInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [hits, setHits] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const typed = useRef(false);

  useEffect(() => {
    if (!typed.current || value.trim().length < 3) { setHits([]); return; }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(value)}&lang=de&limit=6`, { signal: ctrl.signal });
        const json = (await res.json()) as { features: PhotonFeature[] };
        setHits([...new Set(json.features.map((f) => fmtAddress(f.properties)).filter(Boolean))]);
      } catch {
        /* Vorschläge sind optional */
      }
    }, 300);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [value]);

  return (
    <div className="relative">
      <input
        className="input"
        value={value}
        autoComplete="off"
        onChange={(e) => { typed.current = true; onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && hits.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-neutral-700 bg-neutral-900 py-1 shadow-xl">
          {hits.map((h) => (
            <li key={h}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { typed.current = false; onChange(h); setHits([]); setOpen(false); }} className="w-full px-3 py-1.5 text-left text-sm hover:bg-neutral-800">{h}</button>
            </li>
          ))}
          <li className="px-3 pt-1 text-[10px] text-neutral-600">Vorschläge: © OpenStreetMap</li>
        </ul>
      )}
    </div>
  );
}
