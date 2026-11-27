"use client";

import { useRef, useState } from "react";

export type Symbol = { id: string; name: string; icon: string; color: string; kind: string };
type Item = { id: string; symbolId: string; name: string; icon: string; color: string; x: number; y: number; rot: number; label: string };
type Line = { id: string; symbolId: string; name: string; color: string; points: [number, number][]; label: string };
export type PlanData = { bg?: string; items: Item[]; lines: Line[] };

const W = 1000;
const H = 700;
const uid = () => Math.random().toString(36).slice(2, 10);

/** Zeicheneditor für Aufbaupläne: Symbole setzen, Kabelwege als Linien, Hintergrundbild (z. B. Luftbild). */
export default function PlanEditor({ symbols, initial, readOnly, onSave }: { symbols: Symbol[]; initial: PlanData; readOnly?: boolean; onSave?: (d: PlanData) => Promise<void> }) {
  const [data, setData] = useState<PlanData>({ ...initial, items: initial?.items ?? [], lines: initial?.lines ?? [] });
  const [tool, setTool] = useState<string | null>(null); // Symbol-ID oder null = Auswahl
  const [draft, setDraft] = useState<[number, number][]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const svg = useRef<SVGSVGElement>(null);

  const activeSym = symbols.find((s) => s.id === tool);
  const pt = (e: React.PointerEvent | React.MouseEvent): [number, number] => {
    const r = svg.current!.getBoundingClientRect();
    return [Math.round(((e.clientX - r.left) / r.width) * W), Math.round(((e.clientY - r.top) / r.height) * H)];
  };
  const change = (fn: (d: PlanData) => PlanData) => {
    setData(fn);
    setSaving("idle");
  };

  function onCanvasClick(e: React.MouseEvent) {
    if (readOnly || !activeSym) return;
    const [x, y] = pt(e);
    if (activeSym.kind === "LINE") setDraft((d) => [...d, [x, y]]);
    else {
      const it: Item = { id: uid(), symbolId: activeSym.id, name: activeSym.name, icon: activeSym.icon, color: activeSym.color, x, y, rot: 0, label: "" };
      change((d) => ({ ...d, items: [...d.items, it] }));
      setSel(it.id);
    }
  }
  function finishLine() {
    if (activeSym && draft.length >= 2) {
      const ln: Line = { id: uid(), symbolId: activeSym.id, name: activeSym.name, color: activeSym.color, points: draft, label: "" };
      change((d) => ({ ...d, lines: [...d.lines, ln] }));
      setSel(ln.id);
    }
    setDraft([]);
  }
  function onBg(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1600 / img.width);
      const c = document.createElement("canvas");
      c.width = img.width * scale;
      c.height = img.height * scale;
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      change((d) => ({ ...d, bg: c.toDataURL("image/jpeg", 0.7) }));
    };
    img.src = URL.createObjectURL(file);
  }

  const selItem = data.items.find((i) => i.id === sel);
  const selLine = data.lines.find((l) => l.id === sel);
  const used = new Map<string, { name: string; icon?: string; color: string; line: boolean }>();
  data.items.forEach((i) => used.set(i.symbolId, { name: i.name, icon: i.icon, color: i.color, line: false }));
  data.lines.forEach((l) => used.set(l.symbolId, { name: l.name, color: l.color, line: true }));

  return (
    <div className="space-y-3">
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900/60 p-2">
          <button type="button" onClick={() => { setTool(null); setDraft([]); }} className={`rounded-md px-3 py-1.5 text-sm ${tool === null ? "bg-amber-500 text-black" : "bg-neutral-800"}`}>↖ Auswählen</button>
          {symbols.map((s) => (
            <button type="button" key={s.id} title={s.name} onClick={() => { setTool(s.id); setDraft([]); }} className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm ${tool === s.id ? "ring-2 ring-amber-500" : ""} bg-neutral-800`}>
              {s.kind === "LINE" ? <span className="inline-block h-1 w-5 rounded" style={{ background: s.color }} /> : <span>{s.icon}</span>}
              <span className="hidden sm:inline">{s.name}</span>
            </button>
          ))}
          <label className="ml-auto cursor-pointer rounded-md bg-neutral-800 px-3 py-1.5 text-sm">Hintergrundbild<input type="file" accept="image/*" className="hidden" onChange={onBg} /></label>
          {data.bg && <button type="button" onClick={() => change((d) => ({ ...d, bg: undefined }))} className="rounded-md bg-neutral-800 px-3 py-1.5 text-sm">Bild entfernen</button>}
          {onSave && (
            <button type="button" className="btn-primary !py-1.5 text-sm" onClick={async () => { setSaving("saving"); await onSave(data); setSaving("saved"); }}>
              {saving === "saving" ? "Speichert …" : saving === "saved" ? "Gespeichert ✓" : "Speichern"}
            </button>
          )}
        </div>
      )}
      {activeSym?.kind === "LINE" && (
        <p className="text-sm text-amber-300">
          Linie „{activeSym.name}“: Punkte nacheinander anklicken.{" "}
          <button type="button" onClick={finishLine} className="underline">Linie fertig ({draft.length} Punkte)</button>
        </p>
      )}
      {activeSym && activeSym.kind !== "LINE" && <p className="text-sm text-amber-300">Klicke in den Plan, um „{activeSym.name}“ zu setzen.</p>}
      <div className="flex flex-col gap-3 lg:flex-row">
        <svg
          ref={svg}
          viewBox={`0 0 ${W} ${H}`}
          className={`w-full flex-1 touch-none rounded-xl border border-neutral-700 bg-neutral-100 ${activeSym ? "cursor-crosshair" : ""}`}
          onClick={onCanvasClick}
          onDoubleClick={() => activeSym?.kind === "LINE" && finishLine()}
          onPointerMove={(e) => {
            if (!drag.current) return;
            const [x, y] = pt(e);
            const { id, dx, dy } = drag.current;
            change((d) => ({ ...d, items: d.items.map((i) => (i.id === id ? { ...i, x: x - dx, y: y - dy } : i)) }));
          }}
          onPointerUp={() => (drag.current = null)}
          onPointerLeave={() => (drag.current = null)}
        >
          <defs>
            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M 50 0 L 0 0 0 50" fill="none" stroke="#d4d4d4" strokeWidth="1" /></pattern>
          </defs>
          <rect width={W} height={H} fill="url(#grid)" />
          {data.bg && <image href={data.bg} width={W} height={H} preserveAspectRatio="xMidYMid meet" opacity={0.85} />}
          {data.lines.map((l) => (
            <g key={l.id} onClick={(e) => { if (!activeSym) { e.stopPropagation(); setSel(l.id); } }} className={activeSym ? "" : "cursor-pointer"}>
              <polyline points={l.points.map((p) => p.join(",")).join(" ")} fill="none" stroke="transparent" strokeWidth={16} />
              <polyline points={l.points.map((p) => p.join(",")).join(" ")} fill="none" stroke={l.color} strokeWidth={sel === l.id ? 7 : 5} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={sel === l.id ? "12 6" : undefined} />
              {l.label && <text x={l.points[0][0] + 8} y={l.points[0][1] - 8} fontSize={16} fill="#111" stroke="#fff" strokeWidth={4} paintOrder="stroke">{l.label}</text>}
            </g>
          ))}
          {draft.length > 0 && activeSym && <polyline points={draft.map((p) => p.join(",")).join(" ")} fill="none" stroke={activeSym.color} strokeWidth={5} strokeDasharray="8 6" />}
          {data.items.map((i) => (
            <g
              key={i.id}
              transform={`translate(${i.x} ${i.y}) rotate(${i.rot})`}
              className={readOnly || activeSym ? "" : "cursor-move"}
              onPointerDown={(e) => {
                if (readOnly || activeSym) return;
                e.stopPropagation();
                const [x, y] = pt(e);
                drag.current = { id: i.id, dx: x - i.x, dy: y - i.y };
                setSel(i.id);
              }}
              onClick={(e) => !activeSym && e.stopPropagation()}
            >
              <circle r={22} fill="#fff" stroke={i.color} strokeWidth={sel === i.id && !readOnly ? 5 : 3} />
              <text textAnchor="middle" dominantBaseline="central" fontSize={22}>{i.icon}</text>
              {i.label && <text y={38} textAnchor="middle" fontSize={15} fill="#111" stroke="#fff" strokeWidth={4} paintOrder="stroke" transform={`rotate(${-i.rot})`}>{i.label}</text>}
            </g>
          ))}
        </svg>
        <div className="w-full space-y-3 lg:w-64">
          {!readOnly && (selItem || selLine) && (
            <div className="space-y-2 rounded-xl border border-neutral-700 p-3 text-sm">
              <div className="font-semibold">{(selItem ?? selLine)!.name}</div>
              <label className="block"><span className="text-xs text-neutral-400">Beschriftung</span>
                <input className="input" value={(selItem ?? selLine)!.label} onChange={(e) => change((d) => ({ ...d, items: d.items.map((i) => (i.id === sel ? { ...i, label: e.target.value } : i)), lines: d.lines.map((l) => (l.id === sel ? { ...l, label: e.target.value } : l)) }))} />
              </label>
              {selItem && (
                <label className="block"><span className="text-xs text-neutral-400">Drehung ({selItem.rot}°)</span>
                  <input type="range" min={-180} max={180} step={15} value={selItem.rot} className="w-full" onChange={(e) => change((d) => ({ ...d, items: d.items.map((i) => (i.id === sel ? { ...i, rot: Number(e.target.value) } : i)) }))} />
                </label>
              )}
              <button type="button" className="text-red-400" onClick={() => { change((d) => ({ ...d, items: d.items.filter((i) => i.id !== sel), lines: d.lines.filter((l) => l.id !== sel) })); setSel(null); }}>Entfernen</button>
            </div>
          )}
          <div className="rounded-xl border border-neutral-700 p-3 text-sm">
            <div className="mb-2 font-semibold">Legende</div>
            {used.size === 0 && <p className="text-neutral-500">Noch leer.</p>}
            <ul className="space-y-1">
              {[...used].map(([k, u]) => (
                <li key={k} className="flex items-center gap-2">
                  {u.line ? <span className="inline-block h-1 w-5 rounded" style={{ background: u.color }} /> : <span className="flex size-6 items-center justify-center rounded-full border-2 bg-white text-xs" style={{ borderColor: u.color }}>{u.icon}</span>}
                  {u.name}
                  <span className="text-neutral-500">× {u.line ? data.lines.filter((l) => l.symbolId === k).length : data.items.filter((i) => i.symbolId === k).length}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
